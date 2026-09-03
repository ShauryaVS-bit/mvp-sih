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

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend root is on sys.path when run from any directory
_BACKEND_ROOT = Path(__file__).parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

import os
from dotenv import load_dotenv
load_dotenv(_BACKEND_ROOT / ".env")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

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

# Initialize Graph Agents
try:
    from engine.graph_ingestion_agent import GraphIngestionAgent
    from engine.graph_reasoning_agent import GraphReasoningAgent
    ingestion_agent = GraphIngestionAgent(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    reasoning_agent = GraphReasoningAgent(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    GRAPH_AGENTS_READY = True
except Exception as e:
    logger.error(f"Failed to initialize Graph Agents: {e}")
    GRAPH_AGENTS_READY = False


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

def run_pipeline(text: str, report_id: str | None = None, extracted_facts: list | None = None) -> FullAnalysisResult:
    """Execute the full 3-step neuro-symbolic analysis pipeline."""
    t_start = time.perf_counter()

    # Step 1: Fact Extraction
    if extracted_facts is None:
        logger.info("Step 1: Extracting facts...")
        extracted_facts = extract_facts(text)
    else:
        logger.info("Step 1: Using pre-extracted facts...")

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

    iogp_rules = list(set([h.iogp_rule for h in inferred_hazards if hasattr(h, 'iogp_rule') and h.iogp_rule and h.iogp_rule.strip() and h.iogp_rule.lower() != "n/a"]))
    iogp_rule_str = ", ".join(iogp_rules) if iogp_rules else ""

    result = FullAnalysisResult(
        raw_text=text,
        extracted_facts=extracted_facts,
        inferred_hazards=inferred_hazards,
        evidence_matches=unique_evidence[:4],
        overall_risk_score=overall_risk,
        risk_level=risk_level,
        sif_potential=sif_potential,
        processing_time_ms=processing_ms,
        iogp_rule=iogp_rule_str,
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
        version="2.1.0-graph-rag",
        rag_indexed=rag_ready,
        rules_loaded=get_rules_count(),
        model_architecture="Neo4j Knowledge Graph RAG + LLM Graph Extraction",
    )


@app.post("/api/analyze", response_model=FullAnalysisResult)
async def analyze_report(request: AnalyzeRequest):
    """
    POST /api/analyze
    Run the multi-model neuro-symbolic pipeline on raw text or structured CSV/JSON.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Report text cannot be empty.")

    # ─────────────────────────────────────────────────────────────────────────
    # Smart Pre-Processing (Parse JSON / CSV to bypass LLM extraction needs)
    # ─────────────────────────────────────────────────────────────────────────
    import json, csv, io
    parsed_text = request.text
    metadata = {}

    try:
        # 1. Try strict JSON
        data = json.loads(request.text)
        if isinstance(data, dict):
            parsed_text = data.get("text", data.get("description", request.text))
            metadata = data
    except json.JSONDecodeError:
        try:
            # 2. Try JSON Lines (process first line)
            first_line = request.text.strip().split("\n")[0].strip()
            if first_line.startswith("{") and first_line.endswith("}"):
                data = json.loads(first_line)
                if isinstance(data, dict):
                    parsed_text = data.get("text", data.get("description", request.text))
                    metadata = data
        except Exception:
            try:
                # 3. Try CSV (process first row)
                reader = list(csv.DictReader(io.StringIO(request.text)))
                if reader and "text" in reader[0]:
                    parsed_text = reader[0]["text"]
                    metadata = reader[0]
            except Exception:
                pass
                
    # 4. Ultimate Regex Fallback for malformed JSON/CSV fragments missing braces/headers
    if parsed_text == request.text:
        import re
        text_match = re.search(r'"text"\s*:\s*"((?:\\.|[^"\\])*)"', request.text)
        if text_match:
            parsed_text = text_match.group(1).encode('utf-8').decode('unicode_escape')
            
    if metadata:
        request.report_id = metadata.get("report_id", request.report_id)
        request.functional_location = metadata.get("site_id", metadata.get("asset_id", request.functional_location))
        
        # Handle list/string conversions
        iogp = metadata.get("iogp_rule")
        if isinstance(iogp, list): iogp = ", ".join(iogp)
        request.incident_cause = iogp or request.incident_cause
        
        request.incident_type = metadata.get("activity", request.incident_type)
        request.ehs_code = metadata.get("sif_tier_label", metadata.get("report_type", request.ehs_code))

    try:
        result = run_pipeline(text=parsed_text, report_id=request.report_id)

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

        # ─────────────────────────────────────────────────────────────────────────
        # Agent 2: Explicit Database RAG Scan for SIF Pattern Detection
        # ─────────────────────────────────────────────────────────────────────────
        if GRAPH_AGENTS_READY and result.functional_location and result.functional_location != "Unknown":
            logger.info(f"Executing Agent 2 Full Database Scan for Spatial SIF clustering at {result.functional_location}...")
            try:
                chat_res = reasoning_agent.check_sif_pattern_fast(result.functional_location, result.incident_cause)
                if "SIF_PATTERN_DETECTED" in chat_res.upper():
                    result.sif_potential = True
                    result.risk_level = RiskLevel.HIGH
                    alert_text = chat_res.upper().split("SIF_PATTERN_DETECTED:", 1)[-1].strip()
                    # Prepend alert to the root cause analysis so it renders aggressively on the dashboard
                    existing_rca = result.root_cause_analysis or "No explicit root cause determined."
                    result.root_cause_analysis = f"⚠️ CRITICAL ALERT - RECURRING SIF PATTERN: {alert_text}\n\n[Original Narrative Context]: {existing_rca}"
                    result.overall_risk_score = max(result.overall_risk_score, 0.95)
            except Exception as e:
                logger.error(f"Agent 2 RAG Scan failed: {e}")

        # Auto-save to persistent store
        from engine.monthly_analytics import save_analyzed_report
        save_analyzed_report(result)
        
        # AGENT 1: Graph Ingestion (Fire and Forget or await if async)
        if GRAPH_AGENTS_READY:
            # We pass the extracted form fields as metadata to the graph
            metadata = {
                "functional_location": result.functional_location,
                "ehs_code": result.ehs_code,
                "incident_type": result.incident_type,
                "risk_level": result.risk_level
            }
            # Add to graph
            # Since ingest_report is currently synchronous (or if async we would await it)
            # In our agent it's sync, so we call it directly
            import threading
            threading.Thread(target=ingestion_agent.ingest_report, args=(result.report_id or "new_report", request.text, metadata)).start()

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
    Return only real, analyzed reports from the store.
    """
    items = []
    try:
        from engine.monthly_analytics import load_all_analyzed_reports
        new_data = load_all_analyzed_reports() # automatically excludes deleted items
        for n in new_data:
            # Convert ISO string timezone to ensure it parses perfectly in frontend
            timestamp = n.get("analyzed_at", "Unknown")
            if timestamp.endswith("+00:00"): timestamp = timestamp.replace("+00:00", "Z")
            
            items.append(ReportListItem(
                report_id=n.get("report_id", "Unknown"),
                timestamp=timestamp,
                site=n.get("functional_location", "Unknown"),
                functional_location=n.get("functional_location", "Unknown"),
                ehs_code=n.get("ehs_code", "M"),
                ehs_short_desc=n.get("ehs_short_desc", "Unknown"),
                reported_by="User Upload",
                category=n.get("incident_type", "Unknown"),
                incident_cause=n.get("incident_cause", ""),
                iogp_rule=n.get("iogp_rule", ""),
                preview=n.get("raw_text", "")[:100],
                overall_risk_score=n.get("overall_risk_score", 0.5),
                risk_level=n.get("risk_level", "LOW").upper(),
                sif_potential=n.get("sif_potential", False),
                escalated_pattern=n.get("escalated_pattern", False)
            ))
    except Exception as e:
        logger.error(f"Failed to load reports for dashboard: {e}")

    # Sort everything by risk score descending
    items.sort(key=lambda x: x.overall_risk_score, reverse=True)
    return items

@app.delete("/api/reports/{report_id}")
async def delete_report(report_id: str):
    """Soft delete a report."""
    from engine.monthly_analytics import soft_delete_report
    if soft_delete_report(report_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Report not found")

@app.post("/api/reports/{report_id}/restore")
async def restore_report_api(report_id: str):
    """Restore a soft deleted report."""
    from engine.monthly_analytics import restore_report
    if restore_report(report_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Report not found")

# ─────────────────────────────────────────────────────────────────────────────
# Global State for Bulk Upload Tracking
# ─────────────────────────────────────────────────────────────────────────────
bulk_job_status = {
    "status": "idle", # idle, processing, completed
    "total": 0,
    "processed": 0
}

@app.post("/api/analyze/bulk")
async def analyze_bulk(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    POST /api/analyze/bulk
    Process multiple reports from a JSONL or CSV file in the background.
    """
    global bulk_job_status
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="File cannot be empty.")
        
    reports_to_process = []
    import json, csv, io
    
    # 1. Try JSONL
    lines = [line.strip() for line in request.text.strip().split("\n") if line.strip()]
    is_jsonl = False
    if lines and lines[0].startswith("{") and lines[0].endswith("}"):
        is_jsonl = True
        for line in lines:
            try:
                data = json.loads(line)
                if isinstance(data, dict):
                    reports_to_process.append(data)
            except Exception:
                pass
                
    # 2. Try CSV
    if not is_jsonl and lines:
        try:
            reader = list(csv.DictReader(io.StringIO(request.text)))
            if reader and "text" in reader[0]:
                reports_to_process.extend(reader)
        except Exception:
            pass
            
    if not reports_to_process:
        # 3. If neither worked, fallback to single processing
        reports_to_process.append({"text": request.text})

    def process_all():
        global bulk_job_status
        from engine.monthly_analytics import save_analyzed_report
        from engine.graph_ingestion_agent import GraphIngestionAgent
        import time
        import re
        
        agent1 = GraphIngestionAgent(
            neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
            neo4j_password=os.getenv("NEO4J_PASSWORD", "password")
        )
        
        # We will chunk the reports to batch LLM graph extraction (10 per batch)
        BATCH_SIZE = 10
        from engine.extractor import extract_facts_batch
        
        for chunk_idx in range(0, len(reports_to_process), BATCH_SIZE):
            chunk = reports_to_process[chunk_idx:chunk_idx + BATCH_SIZE]
            
            # Extract facts in batch
            chunk_texts = []
            for metadata in chunk:
                parsed_text = metadata.get("text", metadata.get("description", ""))
                if parsed_text and parsed_text == request.text:
                    text_match = re.search(r'"text"\s*:\s*"((?:\\.|[^"\\])*)"', parsed_text)
                    if text_match:
                        parsed_text = text_match.group(1).encode('utf-8').decode('unicode_escape')
                chunk_texts.append(parsed_text)
                
            batch_facts = extract_facts_batch(chunk_texts)
            
            # Step 1: Prepare the batch payload for Agent 1
            batch_payload = []
            analyzed_results = []
            
            for i, metadata in enumerate(chunk):
                try:
                    parsed_text = chunk_texts[i]

                    if not parsed_text:
                        continue
                    
                    report_id = metadata.get("report_id", None)
                    facts = batch_facts[i] if i < len(batch_facts) else None
                    
                    # Run pipeline WITHOUT Agent 1 Graph Ingestion (Offline Fast Path)
                    result = run_pipeline(text=parsed_text, report_id=report_id, extracted_facts=facts)
                    
                    loc = metadata.get("site_id", metadata.get("asset_id", result.functional_location))
                    if loc: result.functional_location = loc
                    cat = metadata.get("report_type", result.incident_type)
                    if cat: result.incident_type = cat
                    iogp = metadata.get("iogp_rule")
                    if isinstance(iogp, list): iogp = ", ".join(iogp)
                    if iogp: result.iogp_rule = iogp
                    
                    cause = metadata.get("incident_cause")
                    if cause: result.incident_cause = cause
                    
                    # Agent 2 Fast SIF Pattern Detection
                    try:
                        from engine.graph_reasoning_agent import GraphReasoningAgent
                        reasoning_agent = GraphReasoningAgent(
                            neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
                            neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
                            neo4j_password=os.getenv("NEO4J_PASSWORD", "password")
                        )
                        
                        # Check graph for previous incidents
                        chat_res = reasoning_agent.check_sif_pattern_fast(result.functional_location, result.incident_cause)
                        
                        # Cross-fact check: Also look at the current uncommitted batch
                        in_batch_count = sum(
                            1 for prev_res in analyzed_results 
                            if prev_res.functional_location == result.functional_location 
                            and prev_res.incident_cause == result.incident_cause
                        )
                        
                        if "SIF_PATTERN_DETECTED" in chat_res.upper() or in_batch_count >= 2:
                            if not result.sif_potential:
                                result.escalated_pattern = True
                            result.sif_potential = True
                            result.risk_level = RiskLevel.HIGH
                            if in_batch_count >= 2:
                                alert_text = f"{in_batch_count} similar incidents detected in current batch for {result.incident_cause} at {result.functional_location}."
                            else:
                                alert_text = chat_res.upper().split("SIF_PATTERN_DETECTED:", 1)[-1].strip()
                                
                            existing_rca = result.root_cause_analysis or "No explicit root cause determined."
                            result.root_cause_analysis = f"⚠️ CRITICAL ALERT - RECURRING SIF PATTERN: {alert_text}\n\n[Original Narrative Context]: {existing_rca}"
                            result.overall_risk_score = max(result.overall_risk_score, 0.95)
                            
                            # Retroactively flag preceding events in this chain as PRECURSORS
                            if in_batch_count >= 2:
                                for prev_res in analyzed_results:
                                    if prev_res.functional_location == result.functional_location and prev_res.incident_cause == result.incident_cause:
                                        if not prev_res.sif_potential:
                                            prev_res.sif_potential = True
                                            prev_res.escalated_pattern = True
                                            prev_res.risk_level = RiskLevel.HIGH
                                            existing_prev = prev_res.root_cause_analysis or "No explicit root cause determined."
                                            prev_res.root_cause_analysis = f"⚠️ PRECURSOR EVENT TO RECURRING SIF PATTERN.\n\n[Original Narrative Context]: {existing_prev}"
                                            prev_res.overall_risk_score = max(prev_res.overall_risk_score, 0.90)
                                            
                                            # Update the corresponding payload in batch_payload
                                            for bp in batch_payload:
                                                if bp["report_id"] == prev_res.report_id:
                                                    bp["metadata"]["sif_potential"] = True
                                                    bp["metadata"]["escalated_pattern"] = True
                                                    bp["metadata"]["overall_risk_score"] = prev_res.overall_risk_score
                                                    bp["metadata"]["risk_level"] = prev_res.risk_level
                                                    break
                    except Exception as e:
                        logger.error(f"Agent 2 Fast RAG Scan failed in bulk: {e}")
                    
                    analyzed_results.append(result)
                    batch_payload.append({
                        "report_id": result.report_id,
                        "text": parsed_text,
                        "metadata": {
                            "sif_potential": result.sif_potential,
                            "escalated_pattern": result.escalated_pattern,
                            "overall_risk_score": result.overall_risk_score,
                            "risk_level": result.risk_level,
                            "ehs_code": result.ehs_code
                        }
                    })
                except Exception as e:
                    logger.error(f"Bulk offline processing error: {e}")

            # Step 2: Agent 1 bulk extraction (1 LLM call for up to 10 reports)
            if batch_payload:
                if chunk_idx > 0:
                    time.sleep(5)  # Throttle between chunks to protect quota
                agent1.ingest_reports_batch(batch_payload)
            
            # Step 3: Save to store
            for res in analyzed_results:
                save_analyzed_report(res)
                
            bulk_job_status["processed"] += len(analyzed_results)

        bulk_job_status["status"] = "completed"

    bulk_job_status["total"] = len(reports_to_process)
    bulk_job_status["processed"] = 0
    bulk_job_status["status"] = "processing"
    
    background_tasks.add_task(process_all)
    return {"message": f"Successfully queued {len(reports_to_process)} reports for background processing."}

@app.get("/api/analyze/status")
async def get_bulk_status():
    """
    GET /api/analyze/status
    Returns the progress of the active bulk upload job.
    """
    return bulk_job_status


@app.get("/api/reports/{report_id}")
async def get_report_by_id(report_id: str):
    """
    GET /api/reports/{report_id}
    Returns the analyzed report data from the persistent store.
    """
    try:
        import json
        from pathlib import Path
        store_path = Path(__file__).parent / "data" / "analyzed_reports_store.json"
        if store_path.exists():
            data = json.loads(store_path.read_text(encoding="utf-8"))
            for r in data:
                if r.get("report_id") == report_id:
                    return r
    except Exception as e:
        logger.error(f"Error reading store for {report_id}: {e}")
        
    raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

@app.get("/api/insights/global")
async def get_global_insights():
    """
    GET /api/insights/global
    Use Agent 2 to extract global insights from Neo4j.
    """
    if not GRAPH_AGENTS_READY:
        raise HTTPException(status_code=503, detail="Graph Database is not ready.")
    
    try:
        from engine.graph_reasoning_agent import GraphReasoningAgent
        agent2 = GraphReasoningAgent(
            neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
            neo4j_password=os.getenv("NEO4J_PASSWORD", "password")
        )
        return agent2.get_global_insights()
    except Exception as e:
        logger.error(f"Global insights failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ManualAnalysisRequest(BaseModel):
    prompt: str = ""

@app.post("/api/insights/query")
async def run_manual_insights(request: ManualAnalysisRequest):
    """
    POST /api/insights/query
    Use Agent 2 to run a deep manual analysis over the Neo4j graph.
    """
    if not GRAPH_AGENTS_READY:
        raise HTTPException(status_code=503, detail="Graph Database is not ready.")
    
    try:
        from engine.graph_reasoning_agent import GraphReasoningAgent
        agent2 = GraphReasoningAgent(
            neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
            neo4j_password=os.getenv("NEO4J_PASSWORD", "password")
        )
        result = agent2.run_manual_analysis(request.prompt)
        return {"analysis": result}
    except Exception as e:
        logger.error(f"Manual insights failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/{report_id}/linked")
async def get_linked_reports(report_id: str):
    """
    GET /api/reports/{report_id}/linked
    Return a graph of related reports connected by shared attributes.
    POWERED PURELY BY AGENT 2 (Neo4j Graph Cypher Reasoning)
    """
    if GRAPH_AGENTS_READY:
        try:
            logger.info(f"Using Agent 2 to find SIF patterns for {report_id}")
            result = reasoning_agent.find_sif_patterns(report_id)
            if result and result.get("nodes"):
                return result
        except Exception as e:
            logger.error(f"Agent 2 Graph retrieval failed: {e}")

    # No synthetic slop fallback. If the graph fails or is empty, return empty graph structure.
    return {
        "source_id": report_id,
        "nodes": [],
        "edges": [],
        "total_linked": 0,
    }

@app.get("/api/graph/global")
async def get_full_graph_endpoint():
    """
    GET /api/graph/global
    Return the full knowledge graph.
    """
    if GRAPH_AGENTS_READY:
        try:
            logger.info("Using Agent 2 to fetch full knowledge graph")
            result = reasoning_agent.get_full_graph()
            if result and result.get("nodes"):
                return result
        except Exception as e:
            logger.error(f"Agent 2 Graph retrieval failed: {e}")

    return {
        "nodes": [],
        "edges": [],
        "total_linked": 0,
    }

from pydantic import BaseModel
class ChatRequest(BaseModel):
    prompt: str

@app.post("/api/chat")
async def ask_agent2(request: ChatRequest):
    """
    POST /api/chat
    Ask Agent 2 a custom question. Agent 2 uses GraphRAG to synthesize an answer.
    """
    if not GRAPH_AGENTS_READY:
        raise HTTPException(status_code=503, detail="Graph Agents are not available.")
    
    try:
        answer = reasoning_agent.answer_custom_prompt(request.prompt)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Agent 2 chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

