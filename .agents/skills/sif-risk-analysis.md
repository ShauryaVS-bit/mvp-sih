# Skill: SIF Risk Precursor Analysis & Causal Reasoning

## Description
Analyzes SAP EHS field safety narratives to identify Serious Injury & Fatality (SIF) precursors, unstated barrier degradations, and line-of-fire hazards using the 4-model neuro-symbolic engine.

## Trigger
Use this skill when processing incident reports, evaluating field narratives for SIF potential, testing custom SAP EHS logs, or debugging extraction & inference accuracy.

## Multi-Model Pipeline Workflow

1. **Model 1: Multi-Aspect Fact Extractor (`engine/extractor.py`)**
   - Parses unstructured field text into 5-tuples: `(Entity, Action, State, Confidence, TriggeredRule)`.
   - Distinguishes strict evidence types (`EXPLICIT`, `INFERRED`, `UNKNOWN`).

2. **Model 2: Heterogeneous Causal DAG Reasoner (`engine/causal_graph.py` & `engine/inference.py`)**
   - Constructs sequence edges ($S_1 \to S_2 \to S_3$).
   - Identifies missing safety barrier nodes (❌) and risk escalation nodes (🔴).
   - Computes weighted overall risk score based on triggered constraint rules in `rules_graph.json`.

3. **Model 3: ChromaDB Vector RAG Retriever (`engine/rag_retriever.py`)**
   - Embeds risk nodes using `sentence-transformers/all-MiniLM-L6-v2`.
   - Retrieves regulatory proof nodes grounded in IOGP Life-Saving Rules (#1-#12), OISD guidelines, and blowout case studies.

4. **Model 4: Rolling Window Temporal Velocity Engine (`engine/monthly_analytics.py`)**
   - Aggregates multi-month asset safety trends and barrier accumulation metrics.

## Quick CLI Verification Example
Run a single-report analysis test in Python:
```python
import sys
from pathlib import Path
sys.path.insert(0, "backend")

from engine.extractor import extract_facts
from engine.inference import infer_hazards, compute_overall_risk

report = "DURING REMOVING PIN FROM A STRUCTURE, ONE RIGMAN HAMMERED THE PIN TO REMOVE IT AND IT CAME OUT AT SPEED PASSING NEARBY TO THE RIGMAN HOLDING THE PIN STANDING OPPOSITE TO IT."

facts = extract_facts(report)
hazards = infer_hazards(report, facts)
score = compute_overall_risk(hazards)

print(f"Extracted Facts: {len(facts)}")
print(f"Inferred Hazards: {len(hazards)}")
print(f"Overall SIF Risk Score: {score:.2f}")
```
