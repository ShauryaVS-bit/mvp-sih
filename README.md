# OIL SENTINEL — Neuro-Symbolic SIF Risk Engine v2.0

> **"Existing systems record safety events. OIL SENTINEL connects them."**

An AI/NLP process safety decision-support engine designed for oilfield operations. Identifies **Serious Injury & Fatality (SIF) precursors**, unstated physical safety barrier degradations, and escalating precursor patterns in unstructured field safety reports.

---

## 🌟 Key Features

1. **Full SAP EHS Form Support**: Parses complete SAP EHS incident records including Functional Location (`AHWR-50-04 Work Over Rig 50MT`), SAP Short Description Codes (`F`, `G`, `M`, `N`, `P`, `R`, `U`, `V`, `W`), Incident Cause, Root Cause Analysis, Affected Persons Details, Corrective Actions, and Preventive Actions.
2. **Statement-to-Statement & Evidence-to-Evidence Causal Mapping**: Segments field narratives into operational statements ($S_1 \to S_2 \to S_3$) and connects them directly to extracted 5-tuples, missing barrier nodes (❌), risk escalation nodes (🔴), and regulatory grounding proof nodes (📘).
3. **Evidence Discipline**: Every extracted fact carries strict evidence status (`EXPLICIT` vs `INFERRED` vs `UNKNOWN`), preventing hallucinated safety claims.
4. **Dense Vector RAG Retriever**: Local ChromaDB persistent vector database powered by `sentence-transformers/all-MiniLM-L6-v2`. Indexes IOGP Life-Saving Rules (#1–#12), OISD guidelines, and the 2020 Baghjan-5 blowout case study.

---

## 🧠 Multi-Model Architecture & Tech Stack

```
RAW SAP EHS REPORT / FIELD NARRATIVE
                 │
                 ▼
 [Model 1: SetFit / DeBERTa-v3 Multi-Aspect Classifier]
  ├── Activity: Structural Pin Removal [EXPLICIT]
  ├── Equipment: Rig Mast Pin [EXPLICIT]
  ├── Hazard: High-Velocity Ejection [INFERRED]
  ├── Energy Source: Kinetic / Stored Mechanical [EXPLICIT]
  ├── Exposure: Rigman in direct line of fire [EXPLICIT]
  └── Barrier Condition: Line of Fire Offset [ABSENT]
                 │
                 ▼
 [Model 2: NetworkX Heterogeneous Causal DAG Reasoner]
  ├── Sentence S1 ➔ Sentence S2 (Sequence Edge)
  ├── Sentence S2 ➔ Missing Barrier Node (Omission Edge)
  └── Missing Barrier Node ➔ Risk Escalation Node
                 │
                 ▼
 [Model 3: ChromaDB + SentenceTransformers Dense RAG]
  ├── Top-k Vector Embedding Similarity Match
  └── Grounds Risk Node to IOGP Rule #5 & OISD-GDN-205
                 │
                 ▼
 [Model 4: Rolling Window Temporal Velocity Engine]
  └── Tracks 7/14/30-day Asset-Barrier Accumulation
```

---

## 💻 Tech Stack Breakdown

- **Backend**: FastAPI (Python 3.14), Pydantic v2 schemas, Uvicorn server.
- **Graph & Logic Engine**: NetworkX (Causal DAG traversal), Custom Constraint Rule Solver (`rules_graph.json`).
- **Vector RAG Store**: ChromaDB (Local persistent client), `sentence-transformers/all-MiniLM-L6-v2`.
- **Frontend Dashboard**: React 18, Vite 5, Tailwind CSS v4, Lucide Icons.

---

## 🧪 Verification & Automated Tests

Run the backend test suite:
```bash
cd backend
python -m pytest tests/test_pipeline.py -v
```
**Results**: `33 passed in 16.78s` (100% pass rate).

Build the production frontend bundle:
```bash
cd frontend
npm run build
```
**Results**: `✓ built in 1.95s` (0 errors).

---

## 🚀 One-Click Launch

Double-click `start.bat` in the root folder:
```cmd
start.bat
```

- **Interactive Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
