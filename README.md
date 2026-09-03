# OIL SENTINEL — Neuro-Symbolic SIF Risk Engine v2.0

> **"Existing systems record safety events. OIL SENTINEL connects them."**

An AI/NLP process safety decision-support engine designed for oilfield operations. Identifies **Serious Injury & Fatality (SIF) precursors**, unstated physical safety barrier degradations, and escalating precursor patterns in unstructured field safety reports.

---

## 🌟 Key Features

1. **Full SAP EHS Form Support**: Parses unstructured field safety records including root causes, functional locations, and incident narratives.
2. **Enterprise Knowledge Graph**: Translates isolated text reports into a highly connected Neo4j property graph linking Hazards, Equipment, Locations, Energy Sources, and People.
3. **Agentic Reasoning (Agent 1 & 2)**:
   - **Agent 1 (Ingestion)**: Autonomously maps incoming unstructured reports to Neo4j graph nodes and relationships using `gemini-3.5-flash`.
   - **Agent 2 (Insights)**: An autonomous graph-reasoning agent that executes deep cypher queries to uncover hidden escalation chains, hazard correlations, and cross-site precursor patterns.
4. **Dense Vector RAG Retriever**: Local ChromaDB persistent vector database powered by `sentence-transformers/all-MiniLM-L6-v2`. Indexes IOGP Life-Saving Rules and historical blowout case studies.
5. **Cross-Fact Checking**: Retroactively flags precursor events in the ingestion pipeline if a batch contains repeated, escalating hazard patterns.

---

## 🧠 Multi-Agent Architecture & Tech Stack

```
RAW SAP EHS REPORT / FIELD NARRATIVE
                 │
                 ▼
 [Step 1: Fact Extraction via LangChain + Gemini 3.5 Flash]
  ├── Identifies Entities (Equipment, People, Locations)
  └── Identifies Actions and States
                 │
                 ▼
 [Step 2: Constraint Inference Engine]
  ├── Evaluates facts against rules_graph.json
  └── Synthesizes Inferred Hazards (Missing Barriers)
                 │
                 ▼
 [Step 3: Graph Ingestion (Agent 1)]
  ├── Maps inferred hazards & facts into Neo4j
  └── Connects incidents across locations and equipment
                 │
                 ▼
 [Step 4: Global Pattern Reasoning (Agent 2)]
  └── Runs complex cypher queries to expose hidden SIF chains
```

---

## 💻 Tech Stack Breakdown

- **Backend**: FastAPI (Python 3.10+), LangChain, Pydantic v2.
- **Graph Database**: Neo4j (Cypher querying, Property Graph).
- **LLM Engine**: Google Gemini API (`gemini-3.5-flash`).
- **Vector RAG Store**: ChromaDB (Local persistent client), `sentence-transformers`.
- **Frontend Dashboard**: React 18, Vite 5, Tailwind CSS, Lucide Icons.

---

## 🚀 How to Run

### 1. Prerequisites
- Docker (for Neo4j)
- Node.js & npm (for frontend)
- Python 3.10+ (for backend)

### 2. Set Environment Variables
In the `backend` directory, create or edit the `.env` file with your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

### 3. Start the Neo4j Database
From the root directory:
```bash
docker-compose up -d
```

### 4. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 5. Start the Frontend (React/Vite)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

- **Interactive Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
