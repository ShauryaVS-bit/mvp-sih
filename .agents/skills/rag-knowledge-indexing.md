# Skill: RAG Vector Store Indexing & Regulatory Grounding

## Description
Manages and queries the persistent local ChromaDB vector database used by OIL SENTINEL to ground SIF risk predictions in regulatory frameworks (IOGP Life-Saving Rules, OISD standards, and blowout case studies).

## Trigger
Use this skill when adding new safety guidelines, re-indexing ChromaDB embeddings, updating case study knowledge bases, or debugging evidence retrieval similarity scores.

## Vector DB Location & Schema
- **Database Directory**: `backend/chroma_db`
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Collection Name**: `oil_sentinel_evidence`

## Indexed Evidence Corpus
1. **IOGP Life-Saving Rules**: Rules #1 through #12 (Bypass Safety Controls, Energy Isolation, Hot Work, Line of Fire, Confined Space, etc.).
2. **OISD Standards**: OISD-GDN-205, OISD-STD-105, OISD-STD-117 (Offshore/Onshore Drilling & Workover Safety Protocols).
3. **Historical Precedents**: 2020 Baghjan-5 Blowout Investigation Report, Macondo Deepwater Horizon barrier failure retrospectives.

## Command Line Sync & Query Steps

1. **Verify or Seed ChromaDB Index**:
   ```python
   from engine.rag_retriever import seed_rag, is_seeded
   if not is_seeded():
       seed_rag()
       print("RAG database seeded successfully.")
   ```

2. **Query Evidence for Specific Hazard**:
   ```python
   from engine.rag_retriever import retrieve_evidence
   results = retrieve_evidence("secondary isolation double block and bleed valve", top_k=3)
   for res in results:
       print(f"[{res.source}] Score: {res.similarity_score:.4f} -> {res.text[:100]}...")
   ```
