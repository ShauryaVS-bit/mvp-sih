"""
Pydantic v2 schemas for the OIL SENTINEL — Neuro-Symbolic SIF Risk Engine v2.0.
Supports Full SAP EHS Incident Record Forms, Multi-Model Extraction,
Statement-to-Statement Causal DAG Maps, and Dense Vector RAG Evidence Retrieval.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, ConfigDict


# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ReportCategory(str, Enum):
    UNSAFE_ACT = "Unsafe Act"
    UNSAFE_CONDITION = "Unsafe Condition"
    NEAR_MISS = "Near-Miss"
    OBSERVATION = "Observation"


class SAPEHSCategory(str, Enum):
    F = "F — Fire without loss of property"
    G = "G — Gas Release"
    M = "M — Near Miss"
    N = "N — Nil Report"
    P = "P — 2 Phase Release"
    R = "R — Near Miss - High Potential (HIPO)"
    U = "U — Unsafe Act"
    V = "V — Unsafe Condition"
    W = "W — Fire with loss of property"


class EvidenceStatus(str, Enum):
    EXPLICIT = "EXPLICIT"
    INFERRED = "INFERRED"
    UNKNOWN = "UNKNOWN"


class BarrierCondition(str, Enum):
    INTACT = "INTACT"
    DEGRADED = "DEGRADED"
    FAILED = "FAILED"
    ABSENT = "ABSENT"
    UNKNOWN = "UNKNOWN"


class EnergySource(str, Enum):
    MECHANICAL = "MECHANICAL"
    KINETIC = "KINETIC"
    GRAVITATIONAL = "GRAVITATIONAL"
    PRESSURE = "PRESSURE"
    ELECTRICAL = "ELECTRICAL"
    THERMAL = "THERMAL"
    CHEMICAL = "CHEMICAL"
    HYDROCARBON = "HYDROCARBON"
    STORED_ENERGY = "STORED_ENERGY"
    VEHICLE_MOTION = "VEHICLE_MOTION"
    UNKNOWN = "UNKNOWN"





class ExtractedFact(BaseModel):
    """Explicit physical fact parsed from narrative."""
    model_config = ConfigDict(populate_by_name=True)

    entity: str = Field(..., description="Physical entity involved")
    action: str = Field(..., description="Action performed")
    state: str = Field(..., description="Resulting state")
    location: str = Field(default="unspecified")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    raw_text_span: str = Field(default="")
    triggered_rule_id: Optional[str] = Field(default=None)


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Constraint Inference Engine Output
# ─────────────────────────────────────────────────────────────────────────────

class InferredHazard(BaseModel):
    """Synthesized hazard inferred by constraint engine."""
    model_config = ConfigDict(populate_by_name=True)

    rule_id: str
    rule_name: str
    stated_facts: list[ExtractedFact] = Field(default_factory=list)
    inferred_gap: str
    hazard_tag: str
    hazard_description: str
    severity_score: float = Field(..., ge=0.0, le=1.0)
    sif_potential: bool
    iogp_rule: str
    iogp_clause: str = Field(default="")
    oisd_standard: str
    oisd_clause: str = Field(default="")
    historical_precedent: str
    mitigation: str = Field(default="")
    required_condition: str = Field(default="")


# ─────────────────────────────────────────────────────────────────────────────
# Step 3: RAG Evidence Matcher Output
# ─────────────────────────────────────────────────────────────────────────────

class EvidenceChunk(BaseModel):
    """Retrieved evidence chunk from ChromaDB vector store."""
    model_config = ConfigDict(populate_by_name=True)

    source: str
    source_label: str = Field(default="")
    chunk_id: str
    text: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    metadata: dict = Field(default_factory=dict)





# ─────────────────────────────────────────────────────────────────────────────
# Full Pipeline Result & Full SAP EHS Incident Record
# ─────────────────────────────────────────────────────────────────────────────

class FullAnalysisResult(BaseModel):
    """Complete result from multi-model pipeline."""
    model_config = ConfigDict(populate_by_name=True)

    report_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    raw_text: str

    # Full SAP EHS Record Fields
    functional_location: str = Field(default="AHWR-50-04 Work Over Rig (50MT)")
    functional_location_description: str = Field(default="Work Over Rig (50MT)")
    item_no: str = Field(default="00001")
    incident_type: str = Field(default="Near Miss")
    incident_sub_type: str = Field(default="Near Miss – High Potential")
    incident_cause: str = Field(default="IMPROPER MATERIAL HANDLING")
    incident_time: str = Field(default="16:29:49")
    incident_duration: str = Field(default="00:10:00")
    man_hours_lost: str = Field(default="00:00")
    operational_time_lost: str = Field(default="00:00")
    financial_implication: str = Field(default="0.00")
    currency: str = Field(default="INR")
    affected_person_type: str = Field(default="Contractor Worker")
    designation: str = Field(default="Rigman / Rigger")

    ehs_code: str = Field(default="R")
    ehs_short_desc: str = Field(default="Near Miss – High Potential")
    root_cause_analysis: str = Field(default="")
    potential_consequences: str = Field(default="")
    corrective_action: str = Field(default="")
    preventive_action: str = Field(default="")
    iogp_rule: str = Field(default="")

    # Multi-Model Pipeline Outputs
    extracted_facts: list[ExtractedFact] = Field(default_factory=list)
    inferred_hazards: list[InferredHazard] = Field(default_factory=list)
    evidence_matches: list[EvidenceChunk] = Field(default_factory=list)

    overall_risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    risk_level: RiskLevel = Field(default=RiskLevel.LOW)
    sif_potential: bool = Field(default=False)
    escalated_pattern: bool = Field(default=False)
    processing_time_ms: float = Field(default=0.0)
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pipeline_mode: str = Field(default="multi_model_causal_dag", description="Active model architecture")


# ─────────────────────────────────────────────────────────────────────────────
# API Request/Response Models
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """POST /api/analyze request body supporting full SAP EHS Incident Record."""
    text: str = Field(..., min_length=10, description="Raw safety narrative or full incident summary")
    report_id: Optional[str] = Field(default=None)
    functional_location: Optional[str] = Field(default=None)
    functional_location_description: Optional[str] = Field(default=None)
    item_no: Optional[str] = Field(default=None)
    incident_type: Optional[str] = Field(default=None)
    incident_sub_type: Optional[str] = Field(default=None)
    incident_cause: Optional[str] = Field(default=None)
    incident_time: Optional[str] = Field(default=None)
    incident_duration: Optional[str] = Field(default=None)
    financial_implication: Optional[str] = Field(default=None)
    affected_person_type: Optional[str] = Field(default=None)
    designation: Optional[str] = Field(default=None)
    ehs_code: Optional[str] = Field(default=None)
    root_cause_analysis: Optional[str] = Field(default=None)
    potential_consequences: Optional[str] = Field(default=None)
    corrective_action: Optional[str] = Field(default=None)
    preventive_action: Optional[str] = Field(default=None)
    iogp_rule: Optional[str] = Field(default=None)


class SyntheticReport(BaseModel):
    """Pre-loaded synthetic report item."""
    model_config = ConfigDict(populate_by_name=True)

    report_id: str
    timestamp: str
    site: str
    functional_location: str = "AHWR-50-04 Work Over Rig (50MT)"
    functional_location_description: str = "Work Over Rig (50MT)"
    item_no: str = "00001"
    ehs_code: str = "M"
    ehs_short_desc: str = "Near Miss"
    reported_by: str
    category: str
    raw_text: str
    incident_cause: str = "UNSPECIFIED"
    root_cause_analysis: str = ""
    potential_consequences: str = ""
    corrective_action: str = ""
    preventive_action: str = ""
    iogp_rule: str = ""
    pre_risk_score: float = Field(default=0.0)
    pre_sif_potential: bool = Field(default=False)
    pre_risk_level: str = Field(default="LOW")


class ReportListItem(BaseModel):
    """Report triage queue item."""
    model_config = ConfigDict(populate_by_name=True)

    report_id: str
    timestamp: str
    site: str
    functional_location: str = "AHWR-50-04 Work Over Rig (50MT)"
    ehs_code: str = "M"
    ehs_short_desc: str = "Near Miss"
    reported_by: str
    category: str
    incident_cause: str = ""
    iogp_rule: str = ""
    preview: str
    overall_risk_score: float
    risk_level: str
    sif_potential: bool
    escalated_pattern: bool = False


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "2.1.0-graph-rag"
    rag_indexed: bool = False
    rules_loaded: int = 0
    model_architecture: str = "Neo4j Knowledge Graph RAG + LLM Graph Extraction"


# ─────────────────────────────────────────────────────────────────────────────
# Monthly Analytics & Strategic Safety Improvements Schemas
# ─────────────────────────────────────────────────────────────────────────────

class StrategicImprovement(BaseModel):
    """Top strategic safety improvement recommendation."""
    priority_rank: int
    title: str
    target_area: str
    recurrence_count: int
    primary_root_cause: str
    causal_historical_link: str
    actionable_preventive_control: str
    relevant_standard: str
    impact_score: float


class CausalPatternLink(BaseModel):
    """Historical incident connection showing recurring failure modes."""
    link_id: str
    current_report_id: str
    historical_report_id: str
    shared_cause: str
    shared_location: str
    mechanism_summary: str
    similarity_score: float


class MonthlyReportPayload(BaseModel):
    """Aggregated Monthly Safety Intelligence Report payload."""
    month: str  # e.g., "2025-10" or "All-Time"
    total_analyzed_reports: int
    sif_precursor_count: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    top_recurring_cause: str
    top_3_improvements: list[StrategicImprovement] = Field(default_factory=list)
    causal_pattern_links: list[CausalPatternLink] = Field(default_factory=list)
    barrier_failure_distribution: dict[str, int] = Field(default_factory=dict)
    location_risk_distribution: dict[str, int] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MonthsListResponse(BaseModel):
    months: list[dict[str, str | int]] = Field(default_factory=list)

