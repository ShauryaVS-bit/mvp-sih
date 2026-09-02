"""
FastAPI Backend — Neuro-Symbolic SIF Risk Engine
Endpoints:
  POST /api/analyze  — Run 3-step pipeline on raw report text
  GET  /api/reports  — Return sorted triage queue from synthetic dataset
  GET  /api/health   — Health check
"""
from __future__ import annotations

import json
import logging
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is on sys.path when run from any directory
_BACKEND_ROOT = Path(__file__).parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from models.schemas import (
    AnalyzeRequest,
    FullAnalysisResult,
    HealthResponse,
    ReportListItem,
    RiskLevel,
    SyntheticReport,
)
from engine.extractor import extract_facts
from engine.inference import infer_hazards, compute_overall_risk
from engine.rag_retriever import seed_rag, retrieve_evidence_for_hazard, is_seeded

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# App Lifespan — seed RAG on startup
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: seed ChromaDB if not already seeded."""
    logger.info("🚀 SIF Risk Engine starting up...")
    if not is_seeded():
        logger.info("Seeding RAG vector store from reference documents...")
        count = seed_rag()
        logger.info(f"✅ RAG seeded with {count} chunks.")
    else:
        logger.info("✅ RAG already seeded — skipping.")
    yield
    logger.info("🛑 SIF Risk Engine shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Neuro-Symbolic SIF Risk Engine API",
    description="3-step pipeline: Fact Extraction → Constraint Inference → RAG Evidence Matching",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev
        "http://localhost:3000",   # CRA / fallback
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Load synthetic dataset
# ─────────────────────────────────────────────────────────────────────────────

_DATA_PATH = _BACKEND_ROOT / "data" / "synthetic_reports.json"

def _load_synthetic_reports() -> list[SyntheticReport]:
    with open(_DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [SyntheticReport(**r) for r in raw]


# ─────────────────────────────────────────────────────────────────────────────
# Core Pipeline Function
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(text: str, report_id: str | None = None) -> FullAnalysisResult:
    """Execute the full 3-step neuro-symbolic analysis pipeline."""
    t_start = time.perf_counter()

    # Step 1: Fact Extraction
    logger.info("Step 1: Extracting facts...")
    extracted_facts = extract_facts(text)

    # Step 2: Constraint Inference
    logger.info("Step 2: Inferring hazards...")
    inferred_hazards = infer_hazards(text, extracted_facts)

    # Step 3: RAG Evidence Retrieval — fetch for top hazards (max 2)
    logger.info("Step 3: Retrieving RAG evidence...")
    evidence_matches = []
    for hazard in inferred_hazards[:2]:  # Top 2 hazards get evidence
        chunks = retrieve_evidence_for_hazard(
            hazard_description=hazard.hazard_description,
            iogp_rule=hazard.iogp_rule,
            oisd_standard=hazard.oisd_standard,
            historical_precedent=hazard.historical_precedent,
            top_k=2,
        )
        evidence_matches.extend(chunks)

    # If no hazards, still get general evidence for the report
    if not inferred_hazards and text.strip():
        evidence_matches = retrieve_evidence_for_hazard(
            hazard_description=text[:500],
            top_k=2,
        )

    # Deduplicate evidence by chunk_id
    seen_ids: set[str] = set()
    unique_evidence = []
    for chunk in evidence_matches:
        if chunk.chunk_id not in seen_ids:
            seen_ids.add(chunk.chunk_id)
            unique_evidence.append(chunk)

    # Compute overall risk score
    overall_risk = compute_overall_risk(inferred_hazards)
    sif_potential = any(h.sif_potential for h in inferred_hazards)

    # Determine risk level
    if overall_risk >= 0.70:
        risk_level = RiskLevel.HIGH
    elif overall_risk >= 0.40:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.LOW

    t_end = time.perf_counter()
    processing_ms = round((t_end - t_start) * 1000, 2)

    # Step 4: Build NetworkX Causal Graph Map & 5-Tuple Fact Extraction
    from engine.causal_graph import build_causal_graph, extract_fact_tuple
    causal_map = build_causal_graph(
        text=text,
        extracted_facts=extracted_facts,
        inferred_hazards=inferred_hazards,
        evidence_matches=unique_evidence[:4],
    )
    fact_tuple = extract_fact_tuple(
        text=text,
        facts=extracted_facts,
        hazards=inferred_hazards,
    )

    result = FullAnalysisResult(
        raw_text=text,
        fact_tuple=fact_tuple,
        extracted_facts=extracted_facts,
        inferred_hazards=inferred_hazards,
        evidence_matches=unique_evidence[:4],
        causal_graph=causal_map,
        overall_risk_score=overall_risk,
        risk_level=risk_level,
        sif_potential=sif_potential,
        processing_time_ms=processing_ms,
    )

    if report_id:
        result.report_id = report_id
        # Copy SAP EHS metadata if matching synthetic report exists
        reports = _load_synthetic_reports()
        matched = next((r for r in reports if r.report_id == report_id), None)
        if matched:
            result.functional_location = matched.functional_location
            result.ehs_code = matched.ehs_code
            result.ehs_short_desc = matched.ehs_short_desc
            result.incident_cause = matched.incident_cause
            result.root_cause_analysis = matched.root_cause_analysis
            result.potential_consequences = matched.potential_consequences
            result.corrective_action = matched.corrective_action
            result.preventive_action = matched.preventive_action

    logger.info(
        f"Pipeline complete | risk={overall_risk:.3f} ({risk_level}) "
        f"| hazards={len(inferred_hazards)} | evidence={len(unique_evidence)} "
        f"| {processing_ms}ms"
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    from engine.rag_retriever import is_seeded, _get_collection
    from engine.inference import get_rules_count

    try:
        rag_ready = is_seeded()
    except Exception:
        rag_ready = False

    return HealthResponse(
        status="ok",
        version="2.0.0-multi-model-causal-dag",
        rag_indexed=rag_ready,
        rules_loaded=get_rules_count(),
        model_architecture="DeBERTa-v3/SetFit + NetworkX Causal DAG + ChromaDB Dense RAG",
    )


@app.post("/api/analyze", response_model=FullAnalysisResult)
async def analyze_report(request: AnalyzeRequest):
    """
    POST /api/analyze
    Run the multi-model neuro-symbolic pipeline on raw text or full SAP EHS Incident form.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Report text cannot be empty.")

    try:
        result = run_pipeline(text=request.text, report_id=request.report_id)

        # Copy custom form fields if provided in request
        if request.functional_location:
            result.functional_location = request.functional_location
        if request.functional_location_description:
            result.functional_location_description = request.functional_location_description
        if request.item_no:
            result.item_no = request.item_no
        if request.incident_type:
            result.incident_type = request.incident_type
        if request.incident_sub_type:
            result.incident_sub_type = request.incident_sub_type
        if request.incident_cause:
            result.incident_cause = request.incident_cause
        if request.incident_time:
            result.incident_time = request.incident_time
        if request.incident_duration:
            result.incident_duration = request.incident_duration
        if request.financial_implication:
            result.financial_implication = request.financial_implication
        if request.affected_person_type:
            result.affected_person_type = request.affected_person_type
        if request.designation:
            result.designation = request.designation
        if request.ehs_code:
            result.ehs_code = request.ehs_code
            result.ehs_short_desc = f"Category [{request.ehs_code}]"
        if request.root_cause_analysis:
            result.root_cause_analysis = request.root_cause_analysis
        if request.potential_consequences:
            result.potential_consequences = request.potential_consequences
        if request.corrective_action:
            result.corrective_action = request.corrective_action
        if request.preventive_action:
            result.preventive_action = request.preventive_action

        # Auto-save to persistent store
        from engine.monthly_analytics import save_analyzed_report
        save_analyzed_report(result)

        return result
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Monthly Safety Analytics Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/analytics/months")
async def get_analytics_months():
    """GET /api/analytics/months — List distinct YYYY-MM months with report counts."""
    from engine.monthly_analytics import get_available_months
    return get_available_months()


@app.get("/api/analytics/monthly_report")
async def get_monthly_report(month: str = "All-Time"):
    """GET /api/analytics/monthly_report — Return Monthly Safety Intelligence Report payload."""
    from engine.monthly_analytics import generate_monthly_report
    return generate_monthly_report(month_filter=month)




@app.get("/api/reports", response_model=list[ReportListItem])
async def get_reports():
    """
    GET /api/reports
    Return all synthetic reports sorted by pre-computed risk score (highest first).
    Used to populate the Triage Queue in the dashboard.
    """
    try:
        reports = _load_synthetic_reports()
    except Exception as e:
        logger.error(f"Failed to load synthetic reports: {e}")
        raise HTTPException(status_code=500, detail="Could not load report dataset.")

    # Sort by pre-computed risk score descending
    reports.sort(key=lambda r: r.pre_risk_score, reverse=True)

    return [
        ReportListItem(
            report_id=r.report_id,
            timestamp=r.timestamp,
            site=r.site,
            reported_by=r.reported_by,
            category=r.category,
            preview=r.raw_text[:120] + ("..." if len(r.raw_text) > 120 else ""),
            overall_risk_score=r.pre_risk_score,
            risk_level=r.pre_risk_level,
            sif_potential=r.pre_sif_potential,
        )
        for r in reports
    ]


@app.get("/api/reports/{report_id}", response_model=FullAnalysisResult)
async def analyze_report_by_id(report_id: str):
    """
    GET /api/reports/{report_id}
    Run the full pipeline on a specific synthetic report by ID.
    """
    reports = _load_synthetic_reports()
    report = next((r for r in reports if r.report_id == report_id), None)

    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    try:
        result = run_pipeline(text=report.raw_text, report_id=report.report_id)
        return result
    except Exception as e:
        logger.error(f"Pipeline error for {report_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
