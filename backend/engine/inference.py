"""
Step 2: Constraint Inference Engine
Evaluates extracted facts against physical safety rules from rules_graph.json.
Synthesizes InferredHazard objects for any required conditions omitted from the report.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from models.schemas import ExtractedFact, InferredHazard

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Load rules graph
# ─────────────────────────────────────────────────────────────────────────────

_RULES_PATH = Path(__file__).parent.parent / "config" / "rules_graph.json"

def _load_rules() -> list[dict]:
    with open(_RULES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["rules"]

_RULES: list[dict] = _load_rules()
_RULES_BY_ID: dict[str, dict] = {r["rule_id"]: r for r in _RULES}


def get_rules_count() -> int:
    return len(_RULES)


# ─────────────────────────────────────────────────────────────────────────────
# Condition checking helpers
# ─────────────────────────────────────────────────────────────────────────────

def _condition_present(text_lc: str, condition_keywords: list[str]) -> bool:
    """
    Check if any of the required condition keywords appear in the report text.
    Uses substring matching on lowercased text.
    Returns True if the condition is explicitly mentioned.
    """
    return any(kw.lower() in text_lc for kw in condition_keywords)


def _compute_trigger_confidence(
    text_lc: str,
    entity_keywords: list[str],
    action_keywords: list[str],
) -> float:
    """
    Compute how strongly a rule is triggered by the text.
    Counts the fraction of entity and action keywords present.
    """
    entity_hits = sum(1 for kw in entity_keywords if kw.lower() in text_lc)
    action_hits = sum(1 for kw in action_keywords if kw.lower() in text_lc)

    entity_score = min(entity_hits / max(len(entity_keywords), 1), 1.0)
    action_score = min(action_hits / max(len(action_keywords), 1), 1.0)

    # Both entity AND action must be present for a confident trigger
    # Weight action slightly higher as it's more specific
    return round(entity_score * 0.4 + action_score * 0.6, 3)


def _find_triggered_facts(rule: dict, all_facts: list[ExtractedFact]) -> list[ExtractedFact]:
    """Return all extracted facts that are linked to the given rule ID."""
    return [f for f in all_facts if f.triggered_rule_id == rule["rule_id"]]


# ─────────────────────────────────────────────────────────────────────────────
# Main inference function
# ─────────────────────────────────────────────────────────────────────────────

def infer_hazards(
    text: str,
    extracted_facts: list[ExtractedFact],
    trigger_confidence_threshold: float = 0.15,
) -> list[InferredHazard]:
    """
    Step 2: Constraint Inference Engine.

    For each physical safety rule:
    1. Check if the report text triggers the rule (entity + action keywords present).
    2. If triggered, check if the required condition is mentioned in the report.
    3. If the required condition is ABSENT → synthesize an InferredHazard.

    Args:
        text: Raw report narrative text
        extracted_facts: Output from Step 1 (extractor.py)
        trigger_confidence_threshold: Minimum confidence to count as a rule trigger

    Returns:
        List of InferredHazard objects (may be empty for safe/low-risk reports)
    """
    text_lc = text.lower()
    inferred_hazards: list[InferredHazard] = []
    triggered_rule_ids: set[str] = set()

    # --- Primary method: use facts from Step 1 that have rule associations ---
    for fact in extracted_facts:
        if fact.triggered_rule_id and fact.triggered_rule_id in _RULES_BY_ID:
            triggered_rule_ids.add(fact.triggered_rule_id)

    # --- Secondary method: direct text scan for any rules missed by extractor ---
    for rule in _RULES:
        rule_id = rule["rule_id"]
        if rule_id in triggered_rule_ids:
            continue  # Already handled

        confidence = _compute_trigger_confidence(
            text_lc,
            rule["trigger_entity_keywords"],
            rule["trigger_action_keywords"],
        )

        if confidence >= trigger_confidence_threshold:
            triggered_rule_ids.add(rule_id)
            logger.debug(f"Rule {rule_id} triggered via direct text scan (confidence={confidence})")

    # --- Evaluate required conditions for all triggered rules ---
    for rule_id in triggered_rule_ids:
        rule = _RULES_BY_ID[rule_id]
        required_keywords = rule["required_condition_keywords"]

        # Check if required condition is mentioned
        condition_met = _condition_present(text_lc, required_keywords)

        if condition_met:
            logger.debug(f"Rule {rule_id}: required condition PRESENT — no hazard inferred")
            continue

        # Required condition is ABSENT → infer hazard
        relevant_facts = _find_triggered_facts(rule, extracted_facts)

        # If no facts found from extractor, create a synthetic one from text scan
        if not relevant_facts:
            # Find which entity and action keywords matched
            matched_entities = [kw for kw in rule["trigger_entity_keywords"] if kw.lower() in text_lc]
            matched_actions = [kw for kw in rule["trigger_action_keywords"] if kw.lower() in text_lc]
            if matched_entities and matched_actions:
                synthetic_fact = ExtractedFact(
                    entity=matched_entities[0].title(),
                    action=matched_actions[0],
                    state="active",
                    location=_extract_location_simple(text),
                    confidence=0.60,
                    raw_text_span=_get_first_sentence(text),
                    triggered_rule_id=rule_id,
                )
                relevant_facts = [synthetic_fact]

        hazard = InferredHazard(
            rule_id=rule_id,
            rule_name=rule["name"],
            stated_facts=relevant_facts,
            inferred_gap=_build_gap_description(rule, text),
            hazard_tag=rule["hazard_tag"],
            hazard_description=rule["hazard_if_missing"],
            severity_score=rule["severity_score"],
            sif_potential=rule["sif_potential"],
            iogp_rule=rule["iogp_rule"],
            iogp_clause=rule.get("iogp_clause", ""),
            oisd_standard=rule["oisd_standard"],
            oisd_clause=rule.get("oisd_clause", ""),
            historical_precedent=rule["historical_precedent"],
            mitigation=rule.get("mitigation", ""),
            required_condition=rule["required_condition"],
        )
        inferred_hazards.append(hazard)
        logger.info(f"InferredHazard: {rule_id} | {rule['hazard_tag']} | severity={rule['severity_score']}")

    # Sort by severity descending
    inferred_hazards.sort(key=lambda h: h.severity_score, reverse=True)
    return inferred_hazards


# ─────────────────────────────────────────────────────────────────────────────
# Overall risk score computation
# ─────────────────────────────────────────────────────────────────────────────

def compute_overall_risk(inferred_hazards: list[InferredHazard]) -> float:
    """
    Aggregate severity scores from multiple inferred hazards.
    Uses a "maximum with diminishing returns" formula:
    - Start with max severity
    - Each additional hazard adds a fraction of its severity
    - Capped at 1.0
    """
    if not inferred_hazards:
        return 0.05  # Baseline non-zero score for any report

    scores = sorted([h.severity_score for h in inferred_hazards], reverse=True)
    composite = scores[0]

    for i, score in enumerate(scores[1:], start=1):
        composite += score * (0.5 ** i)  # Diminishing returns

    return round(min(composite, 1.0), 4)


# ─────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────────────────────────────────────

import re as _re

def _build_gap_description(rule: dict, text: str) -> str:
    """Build a human-readable gap description for this hazard."""
    required = rule["required_condition"]
    return (
        f"Report describes {rule['trigger_entity_keywords'][0].title()} "
        f"'{rule['trigger_action_keywords'][0]}' operation but does NOT mention: "
        f"{required}. This is an UNVERIFIED SAFETY STATE."
    )


def _extract_location_simple(text: str) -> str:
    """Simplified location extraction."""
    patterns = [r"rig[-\s]?\d+", r"well[-\s]?\d+", r"pad[-\s]?\w+", r"manifold\s*\w*"]
    for pattern in patterns:
        m = _re.search(pattern, text, _re.IGNORECASE)
        if m:
            return m.group(0).strip().title()
    return "unspecified"


def _get_first_sentence(text: str) -> str:
    """Return the first sentence of the text."""
    match = _re.search(r"[.!?]", text)
    if match:
        return text[:match.start() + 1].strip()
    return text[:150].strip()
