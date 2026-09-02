"""
NetworkX-backed Causal Dependency Graph Engine.
Constructs a Directed Acyclic Graph (DAG) mapping:
[Sentence Statement S_i] ➔ [Extracted State] ➔ [Missing Barrier Node] ➔ [Hazard Consequence] ➔ [Grounding Proof]
"""
from __future__ import annotations

import re
import logging
import networkx as nx
from typing import Optional

from models.schemas import (
    CausalEdge,
    CausalGraphMap,
    ExtractedFact,
    InferredHazard,
    EvidenceChunk,
    StatementNode,
    SafetyFactTuple,
    EvidenceStatus,
    BarrierCondition,
    EnergySource,
)

logger = logging.getLogger(__name__)


def segment_sentences(text: str) -> list[str]:
    """Split raw narrative into clean sentence statements."""
    raw_chunks = re.split(r"(?<=[.!?])\s+|\n+", text)
    sentences = []
    for chunk in raw_chunks:
        cleaned = chunk.strip()
        if len(cleaned) >= 8:
            sentences.append(cleaned)
    if not sentences and text.strip():
        sentences = [text.strip()]
    return sentences


def extract_fact_tuple(
    text: str,
    facts: list[ExtractedFact],
    hazards: list[InferredHazard],
) -> SafetyFactTuple:
    """
    Extract the 5-Tuple <Activity, Equipment, Hazard, Energy, Exposure> + Barrier State
    with strict Evidence Discipline (EXPLICIT / INFERRED / UNKNOWN).
    """
    txt_lower = text.lower()

    # Activity
    activity = "Routine Operation"
    act_status = EvidenceStatus.INFERRED
    if any(k in txt_lower for k in ["pin", "hammering", "removing pin"]):
        activity = "Structural Pin Removal"
        act_status = EvidenceStatus.EXPLICIT
    elif any(k in txt_lower for k in ["line testing", "tightening joint", "hammer"]):
        activity = "Pressure Line Joint Tightening"
        act_status = EvidenceStatus.EXPLICIT
    elif any(k in txt_lower for k in ["eyewash", "checkup", "derrick floor"]):
        activity = "Emergency Eyewash Inspection"
        act_status = EvidenceStatus.EXPLICIT
    elif any(k in txt_lower for k in ["bleed", "depressur", "valve"]):
        activity = "Pressure Bleed Depressurization"
        act_status = EvidenceStatus.EXPLICIT
    elif any(k in txt_lower for k in ["weld", "grind", "cutting"]):
        activity = "Hotwork Cutting & Grinding"
        act_status = EvidenceStatus.EXPLICIT

    # Equipment
    equipment = "Oilfield Asset Component"
    eq_status = EvidenceStatus.INFERRED
    if "pin" in txt_lower:
        equipment = "Rig Mast Structural Pin"
        eq_status = EvidenceStatus.EXPLICIT
    elif "hammer" in txt_lower or "joint" in txt_lower:
        equipment = "Sledgehammer & Pressure Joint"
        eq_status = EvidenceStatus.EXPLICIT
    elif "eyewash" in txt_lower:
        equipment = "Derrick Floor Eyewash Station"
        eq_status = EvidenceStatus.EXPLICIT
    elif "valve" in txt_lower:
        equipment = "Manifold Bleed Valve"
        eq_status = EvidenceStatus.EXPLICIT

    # Hazard
    hazard_desc = "Uncontrolled Operational Risk"
    haz_status = EvidenceStatus.INFERRED
    if hazards:
        hazard_desc = hazards[0].hazard_description
        haz_status = EvidenceStatus.INFERRED

    # Energy Source
    energy = EnergySource.UNKNOWN
    en_status = EvidenceStatus.UNKNOWN
    if any(k in txt_lower for k in ["pin", "hammer", "speed", "struck"]):
        energy = EnergySource.KINETIC
        en_status = EvidenceStatus.INFERRED
    elif any(k in txt_lower for k in ["bleed", "pressure", "bar", "valve"]):
        energy = EnergySource.PRESSURE
        en_status = EvidenceStatus.EXPLICIT
    elif any(k in txt_lower for k in ["weld", "grind", "torch"]):
        energy = EnergySource.THERMAL
        en_status = EvidenceStatus.EXPLICIT

    # Exposure
    exposure = "No Person Identified"
    exp_status = EvidenceStatus.UNKNOWN
    if any(k in txt_lower for k in ["rigman", "standing opposite", "nearby", "rigger"]):
        exposure = "Worker standing in direct expulsion trajectory / Line of Fire"
        exp_status = EvidenceStatus.EXPLICIT
    elif any(k in txt_lower for k in ["slipped", "fell down", "ground"]):
        exposure = "Personnel working in tool drop impact zone"
        exp_status = EvidenceStatus.INFERRED

    # Barrier Condition
    barrier = "Physical Control Barrier"
    bar_cond = BarrierCondition.UNKNOWN
    bar_status = EvidenceStatus.UNKNOWN
    if hazards:
        barrier = hazards[0].required_condition
        bar_cond = BarrierCondition.ABSENT
        bar_status = EvidenceStatus.INFERRED

    return SafetyFactTuple(
        activity=activity,
        activity_status=act_status,
        equipment=equipment,
        equipment_status=eq_status,
        hazard=hazard_desc,
        hazard_status=haz_status,
        energy_source=energy,
        energy_status=en_status,
        exposure=exposure,
        exposure_status=exp_status,
        barrier=barrier,
        barrier_condition=bar_cond,
        barrier_status=bar_status,
    )



def build_causal_graph(
    text: str,
    extracted_facts: list[ExtractedFact],
    inferred_hazards: list[InferredHazard],
    evidence_matches: list[EvidenceChunk],
) -> CausalGraphMap:
    """
    Build a NetworkX Directed Acyclic Graph (DAG) connecting:
    Statement Nodes -> Missing Barrier Nodes -> Hazard Consequence Nodes -> Evidence Proof Nodes.

    Returns a serialized CausalGraphMap object for frontend rendering.
    """
    G = nx.DiGraph()
    sentences = segment_sentences(text)

    nodes: list[StatementNode] = []
    edges: list[CausalEdge] = []

    prev_statement_id: Optional[str] = None

    # Step 1: Create Statement Nodes for each sentence in the narrative
    for idx, stmt in enumerate(sentences, start=1):
        node_id = f"STMT_{idx}"

        # Find any extracted facts associated with this sentence
        matching_fact = next(
            (f for f in extracted_facts if f.raw_text_span and f.raw_text_span.lower() in stmt.lower()),
            None
        )
        if not matching_fact and extracted_facts:
            # Fallback: check entity match
            matching_fact = next(
                (f for f in extracted_facts if f.entity.lower() in stmt.lower()),
                None
            )

        entity = matching_fact.entity if matching_fact else "Operation"
        action = matching_fact.action if matching_fact else "proceeded"
        state = matching_fact.state if matching_fact else "active"

        stmt_node = StatementNode(
            node_id=node_id,
            statement_index=idx,
            raw_statement=stmt,
            extracted_entity=entity,
            extracted_action=action,
            extracted_state=state,
            node_type="STATEMENT",
        )

        G.add_node(node_id, data=stmt_node)
        nodes.append(stmt_node)

        # Connect consecutive sentence statements (Sequence Flow Edge)
        if prev_statement_id:
            edge_label = "then"
            G.add_edge(prev_statement_id, node_id, label=edge_label)
            edges.append(CausalEdge(source_id=prev_statement_id, target_id=node_id, label=edge_label))

        prev_statement_id = node_id

    # Step 2: Attach Inferred Hazard Nodes & Missing Barrier Nodes
    for idx, hazard in enumerate(inferred_hazards, start=1):
        # Find which statement node triggered this hazard
        trigger_stmt_id = "STMT_1"
        for stmt_node in nodes:
            if any(f.entity.lower() in stmt_node.raw_statement.lower() for f in hazard.stated_facts):
                trigger_stmt_id = stmt_node.node_id
                break

        # A) Missing Barrier Node
        barrier_node_id = f"BARRIER_GAP_{idx}"
        barrier_node = StatementNode(
            node_id=barrier_node_id,
            statement_index=990 + idx,
            raw_statement=hazard.required_condition,
            extracted_entity=hazard.rule_name,
            extracted_action="UNVERIFIED / OMITTED",
            extracted_state="MISSING_BARRIER",
            has_missing_barrier=True,
            missing_barrier_description=hazard.inferred_gap,
            node_type="MISSING_BARRIER",
        )
        G.add_node(barrier_node_id, data=barrier_node)
        nodes.append(barrier_node)

        G.add_edge(trigger_stmt_id, barrier_node_id, label="omits required barrier")
        edges.append(CausalEdge(
            source_id=trigger_stmt_id,
            target_id=barrier_node_id,
            label="omits required barrier"
        ))

        # B) Hazard Consequence Node
        hazard_node_id = f"HAZARD_{idx}"
        hazard_node = StatementNode(
            node_id=hazard_node_id,
            statement_index=995 + idx,
            raw_statement=hazard.hazard_description,
            extracted_entity=hazard.hazard_tag,
            extracted_action="RISK ESCALATION",
            extracted_state=f"SEVERITY {int(hazard.severity_score * 100)}%",
            hazard_consequence=hazard.hazard_description,
            node_type="HAZARD_CONSEQUENCE",
        )
        G.add_node(hazard_node_id, data=hazard_node)
        nodes.append(hazard_node)

        G.add_edge(barrier_node_id, hazard_node_id, label="escalates to hazard")
        edges.append(CausalEdge(
            source_id=barrier_node_id,
            target_id=hazard_node_id,
            label="escalates to hazard"
        ))

        # C) Grounding Proof Node
        proof_node_id = f"PROOF_{idx}"
        matched_chunk = evidence_matches[idx - 1] if idx - 1 < len(evidence_matches) else None
        snippet = matched_chunk.text[:140] + "..." if matched_chunk else hazard.iogp_rule

        proof_node = StatementNode(
            node_id=proof_node_id,
            statement_index=998 + idx,
            raw_statement=f"{hazard.iogp_rule} | {hazard.oisd_standard}",
            extracted_entity=hazard.oisd_standard,
            extracted_action="GROUNDING PROOF",
            extracted_state="REGULATORY STANDARD",
            matched_evidence_source=hazard.historical_precedent,
            matched_evidence_snippet=snippet,
            node_type="GROUNDING_PROOF",
        )
        G.add_node(proof_node_id, data=proof_node)
        nodes.append(proof_node)

        G.add_edge(hazard_node_id, proof_node_id, label="grounded by standard")
        edges.append(CausalEdge(
            source_id=hazard_node_id,
            target_id=proof_node_id,
            label="grounded by standard"
        ))

    # Construct causal path summary
    path_summary = f"Parsed {len(sentences)} operational statements into DAG graph ({len(nodes)} nodes, {len(edges)} edges)."

    return CausalGraphMap(
        nodes=nodes,
        edges=edges,
        summary_path=path_summary,
    )
