# Skill: Test Pipeline Execution & Verification

## Description
Executes the comprehensive Pytest backend suite for the Neuro-Symbolic SIF Risk Engine v2.0 (`backend/tests/test_pipeline.py`).
Verifies fact extraction, NetworkX causal graph reasoning, ChromaDB vector RAG retrieval, FastAPI endpoints, and monthly analytics modules.

## Trigger
Run this skill whenever changes are made to models, schemas, inference rules (`rules_graph.json`), extractors, RAG indexing, or FastAPI controllers.

## Environment & Prerequisites
- Python 3.10+ virtual environment located at `backend/venv`.
- Required packages installed in `backend/venv` (pytest, fastapi, uvicorn, networkx, chromadb, sentence-transformers, pydantic).

## Execution Steps

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Run pytest with verbose logging:
   ```bash
   PYTHONPATH="" ./venv/bin/pytest tests/test_pipeline.py -v
   ```

3. Verification Checklist:
   - [ ] All 33 test cases pass (`33 passed`).
   - [ ] `TestExtractor`: Confirms 5-tuple fact extraction and rule triggering.
   - [ ] `TestInferenceEngine`: Verifies SIF precursor calculation, severity scoring, and causal DAG generation.
   - [ ] `TestRAGRetriever`: Confirms ChromaDB vector queries return relevant IOGP/OISD standards & Baghjan-5 case study.
   - [ ] `TestAPI`: Ensures FastAPI endpoints (`/api/health`, `/api/analyze`, `/api/reports`) return valid HTTP 200 responses.
   - [ ] `TestMonthlyAnalytics`: Validates monthly report generation and top strategic recommendations.
