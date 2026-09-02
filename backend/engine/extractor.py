"""
Step 1: Fact Extractor
Parses explicit physical facts from raw safety report text using keyword/pattern matching.
Optional: upgrades to LLM-backed extraction if OPENAI_API_KEY is set.
"""
from __future__ import annotations

import os
import re
import json
import logging
from pathlib import Path
from typing import Optional

from models.schemas import ExtractedFact

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Load rules graph for entity/action vocabulary
# ─────────────────────────────────────────────────────────────────────────────

_RULES_PATH = Path(__file__).parent.parent / "config" / "rules_graph.json"

def _load_rules() -> list[dict]:
    with open(_RULES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["rules"]

_RULES: list[dict] = _load_rules()


# ─────────────────────────────────────────────────────────────────────────────
# Location patterns (regex)
# ─────────────────────────────────────────────────────────────────────────────

_LOCATION_PATTERNS = [
    r"rig[-\s]?\d+",
    r"well[-\s]?\d+",
    r"well[-\s]?pad[-\s]?\w+",
    r"pad[-\s]?\w+",
    r"platform\s+\w+",
    r"tank\s+farm",
    r"t[-\s]?\d+",          # Tank T-04
    r"mcc\s+room[-\s]?\d*",
    r"compressor\s+\w+",
    r"manifold[-\s]?\w*",
    r"separator\s+\w*",
    r"wellhead\s+\w*",
    r"gas\s+plant[-\s]?\w*",
    r"pump\s+\w+",
    r"pipe\s+rack",
    r"drill\s+floor",
    r"tank\s+farm",
    r"workshop",
    r"warehouse",
    r"control\s+room",
    r"skid\s+\w*",
    r"area\s+\w+",
    r"station\s+\w+",
    r"building\s+\w+",
    r"zone\s+\w+",
]

_LOCATION_RE = re.compile(
    "|".join(_LOCATION_PATTERNS),
    re.IGNORECASE
)


# ─────────────────────────────────────────────────────────────────────────────
# State inference helpers
# ─────────────────────────────────────────────────────────────────────────────

_STATE_MAP: dict[str, list[str]] = {
    "open": ["opened", "open", "opened up", "bleed", "vented", "released"],
    "closed": ["closed", "shut", "isolated", "confirmed closed"],
    "bypassed": ["bypass", "bypassed", "overridden", "disabled", "defeated", "inhibited", "out of service"],
    "active": ["activated", "active", "running", "operating", "commenced", "started", "began"],
    "absent": ["without", "not wearing", "no mention", "omitted", "not confirmed", "missing", "absent"],
    "present": ["wearing", "in place", "available", "confirmed", "verified", "attached"],
    "entered": ["entered", "inside", "went in", "accessed", "descended"],
    "elevated": ["on scaffold", "on platform", "at height", "elevated", "climbing"],
    "transferred": ["transfer", "pumping", "filling", "fueling", "dispensing"],
    "working": ["maintenance", "repair", "working on", "working", "inspection", "testing"],
}

def _infer_state(action_keyword: str) -> str:
    """Map a detected action to a state label."""
    action_lc = action_keyword.lower()
    for state, triggers in _STATE_MAP.items():
        if any(t in action_lc for t in triggers):
            return state
    return "active"


def _extract_location(text: str) -> str:
    """Extract the first location mention from text."""
    match = _LOCATION_RE.search(text)
    if match:
        return match.group(0).strip().title()
    return "unspecified"


# ─────────────────────────────────────────────────────────────────────────────
# Pattern-based fact extraction (primary / offline mode)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_facts_pattern(text: str) -> list[ExtractedFact]:
    """
    Pattern-matching fact extractor.
    Iterates over all rules, checks for entity+action keyword co-occurrence,
    and synthesizes ExtractedFact objects.
    """
    text_lc = text.lower()
    facts: list[ExtractedFact] = []
    seen_rules: set[str] = set()

    for rule in _RULES:
        rule_id = rule["rule_id"]
        entity_keywords = rule["trigger_entity_keywords"]
        action_keywords = rule["trigger_action_keywords"]

        # Find first matching entity keyword
        matched_entity: Optional[str] = None
        entity_span: str = ""
        entity_start = -1

        for kw in entity_keywords:
            idx = text_lc.find(kw.lower())
            if idx != -1:
                matched_entity = kw
                entity_start = idx
                # Extract surrounding context (±30 chars)
                span_start = max(0, idx - 10)
                span_end = min(len(text), idx + len(kw) + 30)
                entity_span = text[span_start:span_end].strip()
                break

        if not matched_entity:
            continue

        # Find first matching action keyword in vicinity (within 300 chars of entity)
        matched_action: Optional[str] = None
        action_span: str = ""

        window_start = max(0, entity_start - 150)
        window_end = min(len(text), entity_start + 300)
        window_text = text_lc[window_start:window_end]
        full_window = text[window_start:window_end]

        for kw in action_keywords:
            if kw.lower() in window_text:
                matched_action = kw
                action_idx = window_text.find(kw.lower())
                action_span = full_window[max(0, action_idx - 5):action_idx + len(kw) + 20].strip()
                break

        if not matched_action:
            continue

        if rule_id in seen_rules:
            continue
        seen_rules.add(rule_id)

        # Build raw text span (the most informative surrounding sentence)
        raw_span = _get_sentence_containing(text, entity_start) or entity_span

        fact = ExtractedFact(
            entity=matched_entity.title(),
            action=matched_action,
            state=_infer_state(matched_action),
            location=_extract_location(text),
            confidence=0.82,
            raw_text_span=raw_span[:200],
            triggered_rule_id=rule_id,
        )
        facts.append(fact)

    # Deduplicate by entity+action
    seen_pairs: set[tuple[str, str]] = set()
    unique_facts: list[ExtractedFact] = []
    for f in facts:
        pair = (f.entity.lower(), f.action.lower())
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            unique_facts.append(f)

    return unique_facts


def _get_sentence_containing(text: str, char_idx: int) -> str:
    """Return the sentence that contains the given character index."""
    # Find sentence boundaries
    sentence_ends = [m.start() for m in re.finditer(r'[.!?]', text)]
    start = 0
    for end in sentence_ends:
        if end >= char_idx:
            return text[start:end + 1].strip()
        start = end + 1
    return text[start:].strip()


# ─────────────────────────────────────────────────────────────────────────────
# LLM-backed extraction (optional, requires OPENAI_API_KEY)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_facts_llm(text: str) -> list[ExtractedFact]:
    """
    LLM-backed fact extraction using LangChain + Gemini.
    Activated when GEMINI_API_KEY is set in environment.
    Falls back to pattern matching if it fails.
    """
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from pydantic import BaseModel

        class LLMFactList(BaseModel):
            facts: list[ExtractedFact]

        llm = ChatGoogleGenerativeAI(
            model="gemini-3.5-flash", 
            temperature=0,
            convert_system_message_to_human=True
        )
        structured_llm = llm.with_structured_output(LLMFactList)

        system_prompt = """You are a process safety expert analyzing industrial incident reports.
Extract all explicit physical facts from the report. Focus on:
- Physical entities (valves, equipment, people, chemicals)
- Actions performed (opened, welded, entered, transferred)
- Resulting states (open, closed, bypassed, absent)
- Locations (rig names, equipment IDs, area names)

Return only facts that are EXPLICITLY STATED in the text. Do not infer or guess."""

        prompt = f"{system_prompt}\n\nExtract physical facts from this safety report:\n\n{text}"
        result = structured_llm.invoke(prompt)

        # Enhance each LLM fact with rule matching for downstream inference
        llm_facts = result.facts
        text_lc = text.lower()
        for fact in llm_facts:
            for rule in _RULES:
                entity_match = any(kw.lower() in fact.entity.lower() for kw in rule["trigger_entity_keywords"])
                action_match = any(kw.lower() in fact.action.lower() for kw in rule["trigger_action_keywords"])
                if entity_match and action_match:
                    fact.triggered_rule_id = rule["rule_id"]
                    break

        return llm_facts

    except Exception as e:
        logger.warning(f"LLM extraction failed ({e}), falling back to pattern matching.")
        return _extract_facts_pattern(text)


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def extract_facts(text: str) -> list[ExtractedFact]:
    """
    Main entry point for Step 1: Fact Extraction.

    Uses LLM mode if GEMINI_API_KEY is set in the environment 
    (and USE_MOCK != 'true'). Otherwise, pattern matching.
    """
    use_llm = (
        os.getenv("GEMINI_API_KEY") is not None
        and os.getenv("USE_MOCK", "false").lower() != "true"
    )

    if use_llm:
        logger.info("Using LLM-backed fact extraction (LangChain + Gemini)")
        facts = _extract_facts_llm(text)
    else:
        logger.info("Using pattern-based fact extraction (offline mode)")
        facts = _extract_facts_pattern(text)

    logger.info(f"Extracted {len(facts)} facts from report")
    return facts
