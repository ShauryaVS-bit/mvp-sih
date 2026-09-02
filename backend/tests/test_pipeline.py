"""
Unit tests for the SIF Risk Engine pipeline.
Tests: extractor, inference engine, RAG retriever, and API endpoint.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient

from engine.extractor import extract_facts
from engine.inference import infer_hazards, compute_overall_risk
from models.schemas import ExtractedFact, InferredHazard


# ─────────────────────────────────────────────────────────────────────────────
# Test Data
# ─────────────────────────────────────────────────────────────────────────────

VALVE_A_REPORT = (
    "During morning shift, Valve A on the Rig-04 manifold was opened to bleed "
    "surface pressure as per workover schedule. Pressure gauge dropped from 210 bar "
    "to near-zero over approximately 15 minutes. Operation was completed without incident. "
    "Crew proceeded to change the manifold spool piece following the bleed-down."
)

WELDING_REPORT = (
    "Welding crew commenced cutting operations on the old gas injection flowline near the "
    "production manifold on Well-Pad B. Work started at approximately 10:00 hrs. "
    "Grinder was used to prepare flanges for welding. The weather was dry."
)

LOW_RISK_REPORT = (
    "Worker observed not wearing a hard hat while walking through the PPE-mandatory zone "
    "near the site office compound. Worker was reminded of PPE requirements and immediately "
    "replaced their hard hat."
)

H2S_REPORT = (
    "Two technicians entered the sour gas production area at Rig-07 to investigate a reported "
    "high-pressure reading on the wellhead pressure transmitter. The area is designated H2S Zone 2. "
    "Technicians were wearing standard coveralls and hard hats. Investigation took 20 minutes."
)

SAFE_VALVE_REPORT = (
    "Valve A was opened to bleed surface pressure on Rig-04 manifold. Secondary isolation "
    "valve (Valve B) was confirmed closed and verified by the supervisor. Double block and bleed "
    "configuration confirmed. Pressure gauge read zero before work commenced. LOTO applied."
)

ESD_BYPASS_REPORT = (
    "Night shift operators bypassed the high-pressure ESD on Compressor Unit-3 to allow "
    "maintenance work on the recycle valve actuator. ESD was taken out of service at 02:15 hrs."
)


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Extractor Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestExtractor:

    def test_valve_a_report_extracts_fact(self):
        """Extractor must identify valve/bleed entity+action from the Valve A report."""
        facts = extract_facts(VALVE_A_REPORT)
        assert len(facts) >= 1, "Should extract at least one fact"

        # Check that at least one fact has valve-related entity
        entities_lower = [f.entity.lower() for f in facts]
        valve_found = any(
            "valve" in e or "v-101" in e or "bleed" in e
            for e in entities_lower
        )
        assert valve_found, f"No valve entity found. Got: {entities_lower}"

    def test_valve_a_report_triggers_rule_001(self):
        """Extractor should associate Valve A fact with RULE_001."""
        facts = extract_facts(VALVE_A_REPORT)
        triggered_rules = [f.triggered_rule_id for f in facts if f.triggered_rule_id]
        assert "RULE_001" in triggered_rules, (
            f"RULE_001 not triggered. Triggered rules: {triggered_rules}"
        )

    def test_welding_report_extracts_hotwork_fact(self):
        """Extractor must identify welding/grinding entity from hotwork report."""
        facts = extract_facts(WELDING_REPORT)
        actions_lower = [f.action.lower() for f in facts]
        hotwork_found = any(
            "weld" in a or "grind" in a or "cutting" in a
            for a in actions_lower
        )
        assert hotwork_found, f"No hotwork action found. Got: {actions_lower}"

    def test_low_risk_report_no_critical_facts(self):
        """Low-risk PPE report should not trigger any SIF-level rules."""
        facts = extract_facts(LOW_RISK_REPORT)
        # No facts should be associated with HIGH severity rules
        high_sif_rules = {"RULE_001", "RULE_002", "RULE_003", "RULE_004", "RULE_005"}
        triggered = {f.triggered_rule_id for f in facts if f.triggered_rule_id}
        overlap = triggered & high_sif_rules
        assert not overlap, f"Low-risk report triggered HIGH SIF rules: {overlap}"

    def test_extractor_returns_list_of_extracted_facts(self):
        """Return type must be list[ExtractedFact]."""
        facts = extract_facts(VALVE_A_REPORT)
        assert isinstance(facts, list)
        for f in facts:
            assert isinstance(f, ExtractedFact)

    def test_extracted_fact_fields_populated(self):
        """ExtractedFact objects must have entity, action, state fields set."""
        facts = extract_facts(VALVE_A_REPORT)
        assert len(facts) > 0
        for f in facts:
            assert f.entity, "entity must not be empty"
            assert f.action, "action must not be empty"
            assert f.state, "state must not be empty"
            assert 0.0 <= f.confidence <= 1.0


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Inference Engine Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestInferenceEngine:

    def test_valve_a_infers_barrier_hazard(self):
        """Valve A report must produce RULE_001 InferredHazard (secondary isolation missing)."""
        facts = extract_facts(VALVE_A_REPORT)
        hazards = infer_hazards(VALVE_A_REPORT, facts)

        assert len(hazards) >= 1, "At least one hazard must be inferred"
        rule_ids = [h.rule_id for h in hazards]
        assert "RULE_001" in rule_ids, (
            f"RULE_001 not in inferred hazards. Got: {rule_ids}"
        )

    def test_valve_a_hazard_is_high_severity(self):
        """RULE_001 hazard severity must be >= 0.9."""
        facts = extract_facts(VALVE_A_REPORT)
        hazards = infer_hazards(VALVE_A_REPORT, facts)
        rule_001 = next((h for h in hazards if h.rule_id == "RULE_001"), None)

        assert rule_001 is not None, "RULE_001 hazard not found"
        assert rule_001.severity_score >= 0.9, (
            f"Expected severity >= 0.9, got {rule_001.severity_score}"
        )

    def test_valve_a_hazard_has_sif_potential(self):
        """RULE_001 must be flagged as SIF potential."""
        facts = extract_facts(VALVE_A_REPORT)
        hazards = infer_hazards(VALVE_A_REPORT, facts)
        rule_001 = next((h for h in hazards if h.rule_id == "RULE_001"), None)
        assert rule_001 is not None
        assert rule_001.sif_potential is True

    def test_safe_valve_report_no_hazard(self):
        """When secondary isolation IS mentioned, RULE_001 should NOT be inferred."""
        facts = extract_facts(SAFE_VALVE_REPORT)
        hazards = infer_hazards(SAFE_VALVE_REPORT, facts)
        rule_ids = [h.rule_id for h in hazards]
        assert "RULE_001" not in rule_ids, (
            "RULE_001 should not fire when secondary isolation is confirmed"
        )

    def test_welding_infers_hotwork_hazard(self):
        """Welding report without gas cert should infer RULE_002."""
        facts = extract_facts(WELDING_REPORT)
        hazards = infer_hazards(WELDING_REPORT, facts)
        rule_ids = [h.rule_id for h in hazards]
        assert "RULE_002" in rule_ids, f"RULE_002 not inferred. Got: {rule_ids}"

    def test_h2s_report_infers_toxic_hazard(self):
        """H2S zone entry without SCBA should infer RULE_004."""
        facts = extract_facts(H2S_REPORT)
        hazards = infer_hazards(H2S_REPORT, facts)
        rule_ids = [h.rule_id for h in hazards]
        assert "RULE_004" in rule_ids, f"RULE_004 not inferred. Got: {rule_ids}"

    def test_esd_bypass_infers_barrier_degradation(self):
        """ESD bypass report should infer RULE_012."""
        facts = extract_facts(ESD_BYPASS_REPORT)
        hazards = infer_hazards(ESD_BYPASS_REPORT, facts)
        rule_ids = [h.rule_id for h in hazards]
        assert "RULE_012" in rule_ids, f"RULE_012 not inferred. Got: {rule_ids}"

    def test_low_risk_report_zero_or_low_score(self):
        """Low-risk PPE report should have very low overall risk score."""
        facts = extract_facts(LOW_RISK_REPORT)
        hazards = infer_hazards(LOW_RISK_REPORT, facts)
        score = compute_overall_risk(hazards)
        assert score < 0.40, f"Expected low risk score, got {score}"

    def test_valve_a_overall_risk_is_high(self):
        """Valve A report must produce overall_risk >= 0.7."""
        facts = extract_facts(VALVE_A_REPORT)
        hazards = infer_hazards(VALVE_A_REPORT, facts)
        score = compute_overall_risk(hazards)
        assert score >= 0.70, f"Expected high risk, got {score}"

    def test_inferred_hazard_has_required_fields(self):
        """InferredHazard must have all required schema fields populated."""
        facts = extract_facts(VALVE_A_REPORT)
        hazards = infer_hazards(VALVE_A_REPORT, facts)
        assert hazards
        h = hazards[0]
        assert h.rule_id
        assert h.hazard_tag
        assert h.iogp_rule
        assert h.oisd_standard
        assert h.historical_precedent
        assert h.severity_score >= 0.0

    def test_hazards_sorted_by_severity(self):
        """Multiple hazards must be sorted by severity descending."""
        multi_report = VALVE_A_REPORT + " " + WELDING_REPORT
        facts = extract_facts(multi_report)
        hazards = infer_hazards(multi_report, facts)
        if len(hazards) > 1:
            for i in range(len(hazards) - 1):
                assert hazards[i].severity_score >= hazards[i + 1].severity_score

    def test_real_sap_pin_removal_report_infers_trajectory_hazard(self):
        """Real SAP EHS report #1 (pin removal) must infer RULE_013 (Line of Fire Trajectory)."""
        pin_report = "DURING REMOVING PIN FROM A STRUCTURE, ONE RIGMAN HAMMERED THE PIN TO REMOVE IT AND IT CAME OUT AT SPEED PASSING NEARBY TO THE RIGMAN HOLDING THE PIN STANDING OPPOSITE TO IT."
        facts = extract_facts(pin_report)
        hazards = infer_hazards(pin_report, facts)
        rule_ids = [h.rule_id for h in hazards]
        assert "RULE_013" in rule_ids, f"RULE_013 not inferred for pin removal. Got: {rule_ids}"

    def test_real_sap_hammer_slip_report_infers_tool_drop_hazard(self):
        """Real SAP EHS report #2 (hammer slip) must infer RULE_014 (Hammer Drop Risk)."""
        hammer_report = "DURING LINE TESTING, ONE PERSON WAS TIGHTENING THE JOINT WITH HAMMER. SUDDENLY THE HAMMER GOT SLIPPED FROM HIS HAND AND FELL DOWN ON THE GROUND."
        facts = extract_facts(hammer_report)
        hazards = infer_hazards(hammer_report, facts)
        rule_ids = [h.rule_id for h in hazards]
        assert "RULE_014" in rule_ids, f"RULE_014 not inferred for hammer slip. Got: {rule_ids}"

    def test_causal_graph_map_generation(self):
        """build_causal_graph must construct statement nodes and missing barrier edges."""
        from engine.causal_graph import build_causal_graph
        pin_report = "DURING REMOVING PIN FROM A STRUCTURE, ONE RIGMAN HAMMERED THE PIN TO REMOVE IT AND IT CAME OUT AT SPEED PASSING NEARBY TO THE RIGMAN HOLDING THE PIN STANDING OPPOSITE TO IT."
        facts = extract_facts(pin_report)
        hazards = infer_hazards(pin_report, facts)
        cmap = build_causal_graph(pin_report, facts, hazards, [])
        assert len(cmap.nodes) >= 2, "Causal graph must contain at least 2 nodes"
        assert len(cmap.edges) >= 1, "Causal graph must contain at least 1 edge"



# ─────────────────────────────────────────────────────────────────────────────
# Step 3: RAG Retriever Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestRAGRetriever:

    def test_rag_returns_results_for_hazard_query(self):
        """RAG must return at least 1 result for a hazard description query."""
        from engine.rag_retriever import retrieve_evidence, is_seeded, seed_rag
        if not is_seeded():
            seed_rag()

        results = retrieve_evidence(
            query="secondary isolation valve not confirmed during pressure bleed operation",
            top_k=2,
        )
        assert len(results) >= 1, "RAG must return at least 1 result"

    def test_rag_evidence_has_required_fields(self):
        """EvidenceChunk must have source, text, and similarity_score."""
        from engine.rag_retriever import retrieve_evidence, is_seeded, seed_rag
        if not is_seeded():
            seed_rag()

        results = retrieve_evidence(
            query="IOGP energy isolation double block and bleed",
            top_k=2,
        )
        assert results
        for chunk in results:
            assert chunk.source, "source must not be empty"
            assert chunk.text, "text must not be empty"
            assert 0.0 <= chunk.similarity_score <= 1.0

    def test_baghjan_query_retrieves_case_study(self):
        """Query mentioning Baghjan should retrieve content from baghjan_investigation source."""
        from engine.rag_retriever import retrieve_evidence, is_seeded, seed_rag
        if not is_seeded():
            seed_rag()

        results = retrieve_evidence(
            query="Baghjan-5 blowout secondary barrier valve bleed 2020 Assam",
            top_k=3,
        )
        sources = [r.source for r in results]
        assert "baghjan_investigation" in sources, (
            f"Baghjan source not retrieved. Got sources: {sources}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# API Integration Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestAPI:

    @pytest.fixture(scope="class")
    def client(self):
        from main import app
        return TestClient(app)

    def test_health_endpoint(self, client):
        """GET /api/health must return 200 with status='ok'."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["rules_loaded"] >= 12

    def test_analyze_valve_a_report(self, client):
        """POST /api/analyze on Valve A report must return SIF potential=True."""
        response = client.post(
            "/api/analyze",
            json={"text": VALVE_A_REPORT}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["sif_potential"] is True
        assert data["overall_risk_score"] >= 0.70
        assert len(data["inferred_hazards"]) >= 1
        assert data["risk_level"] == "HIGH"

    def test_analyze_low_risk_report(self, client):
        """POST /api/analyze on low-risk report must return risk_level=LOW."""
        response = client.post(
            "/api/analyze",
            json={"text": LOW_RISK_REPORT}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["overall_risk_score"] < 0.50
        assert data["sif_potential"] is False

    def test_analyze_returns_evidence(self, client):
        """POST /api/analyze on high-risk report must return evidence_matches."""
        response = client.post(
            "/api/analyze",
            json={"text": VALVE_A_REPORT}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["evidence_matches"]) >= 1

    def test_analyze_returns_extracted_facts(self, client):
        """POST /api/analyze must return at least one extracted_fact."""
        response = client.post(
            "/api/analyze",
            json={"text": VALVE_A_REPORT}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["extracted_facts"]) >= 1

    def test_get_reports_returns_sorted_list(self, client):
        """GET /api/reports must return reports sorted by risk score descending."""
        response = client.get("/api/reports")
        assert response.status_code == 200
        reports = response.json()
        assert len(reports) >= 50


        # Verify sorted
        scores = [r["overall_risk_score"] for r in reports]
        assert scores == sorted(scores, reverse=True), "Reports not sorted by risk score"

    def test_get_reports_high_risk_at_top(self, client):
        """Top 12 reports must all be HIGH risk level."""
        response = client.get("/api/reports")
        assert response.status_code == 200
        reports = response.json()
        top_12 = reports[:12]
        for r in top_12:
            assert r["risk_level"] == "HIGH", (
                f"Report {r['report_id']} should be HIGH risk, got {r['risk_level']}"
            )

    def test_get_report_by_id(self, client):
        """GET /api/reports/RPT-001 must run pipeline and return FullAnalysisResult."""
        response = client.get("/api/reports/RPT-001")
        assert response.status_code == 200
        data = response.json()
        assert data["report_id"] == "RPT-001"
        assert "inferred_hazards" in data

    def test_analyze_empty_text_returns_400(self, client):
        """POST /api/analyze with empty text must return 400 or 422 validation error."""
        response = client.post("/api/analyze", json={"text": "   "})
        assert response.status_code in (400, 422)


    def test_analyze_response_structure(self, client):
        """Full analysis result must have all required top-level fields."""
        response = client.post(
            "/api/analyze",
            json={"text": VALVE_A_REPORT}
        )
        assert response.status_code == 200
        data = response.json()
        required_fields = [
            "report_id", "raw_text", "extracted_facts", "inferred_hazards",
            "evidence_matches", "overall_risk_score", "risk_level",
            "sif_potential", "processing_time_ms"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"


# ─────────────────────────────────────────────────────────────────────────────
# Monthly Analytics Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestMonthlyAnalytics:

    def test_get_available_months(self):
        """get_available_months must return list of available month filters."""
        from engine.monthly_analytics import get_available_months
        res = get_available_months()
        assert len(res.months) >= 1
        assert any(m["month"] == "All-Time" for m in res.months)

    def test_generate_monthly_report(self):
        """generate_monthly_report must return Top 3 strategic improvements and causal links."""
        from engine.monthly_analytics import generate_monthly_report
        rep = generate_monthly_report("All-Time")
        assert rep.total_analyzed_reports >= 1
        assert len(rep.top_3_improvements) == 3
        assert len(rep.causal_pattern_links) >= 1
        assert rep.top_3_improvements[0].priority_rank == 1

