"""
Step 3: RAG Retriever — ChromaDB + SentenceTransformers
Indexes 3 reference markdown documents and retrieves top-k evidence
chunks for a given InferredHazard summary query.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.utils import embedding_functions

from models.schemas import EvidenceChunk

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

DATA_DIR = Path(__file__).parent.parent / "data"
CHROMA_DIR = Path(__file__).parent.parent / "chroma_db"
COLLECTION_NAME = "sif_reference_docs"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

SOURCE_FILES = {
    "iogp_rules": DATA_DIR / "iogp_rules.md",
    "oisd_guidelines": DATA_DIR / "oisd_guidelines.md",
    "baghjan_investigation": DATA_DIR / "baghjan_investigation.md",
}

SOURCE_LABELS = {
    "iogp_rules": "IOGP Life-Saving Rules",
    "oisd_guidelines": "OISD Process Safety Standards",
    "baghjan_investigation": "Baghjan-5 Blowout Case Study (2020)",
}


# ─────────────────────────────────────────────────────────────────────────────
# ChromaDB Client + Collection
# ─────────────────────────────────────────────────────────────────────────────

_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None
_emb_fn: Optional[embedding_functions.SentenceTransformerEmbeddingFunction] = None


def _get_embedding_function() -> embedding_functions.SentenceTransformerEmbeddingFunction:
    global _emb_fn
    if _emb_fn is None:
        logger.info(f"Loading SentenceTransformer model: {EMBEDDING_MODEL}")
        _emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
    return _emb_fn


def _get_collection() -> chromadb.Collection:
    global _client, _collection
    if _collection is None:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=_get_embedding_function(),
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


# ─────────────────────────────────────────────────────────────────────────────
# Document Chunking
# ─────────────────────────────────────────────────────────────────────────────

def _chunk_markdown(text: str, source: str, min_chars: int = 40) -> list[dict]:
    """
    Split markdown into meaningful chunks for indexing.
    Strategy: split by double newline (paragraph), track section headings,
    and prepend section context to each chunk text.
    """
    chunks: list[dict] = []
    chunk_idx = 0

    # Split by paragraph blocks
    blocks = re.split(r"\n\n+", text)

    current_section = "General"
    for block in blocks:
        block = block.strip()
        if not block:
            continue

        # Track section headings
        heading_match = re.match(r"^#{1,3}\s+(.+)$", block, re.MULTILINE)
        if heading_match:
            current_section = heading_match.group(1).strip()
            # If the block is ONLY a heading, update section and continue
            if len(block.split("\n")) == 1:
                continue

        # Filter very short blocks
        if len(block) < min_chars:
            continue

        # Include section header in chunk text for embedding context
        chunk_text = f"[{current_section}]\n{block}" if not block.startswith(f"[{current_section}]") else block

        chunk_id = f"{source}_chunk_{chunk_idx:04d}"
        chunks.append({
            "id": chunk_id,
            "text": chunk_text,
            "source": source,
            "section": current_section,
        })
        chunk_idx += 1

    return chunks



# ─────────────────────────────────────────────────────────────────────────────
# Seeding (Index all reference documents)
# ─────────────────────────────────────────────────────────────────────────────

def seed_rag() -> int:
    """
    Index all reference markdown documents into ChromaDB.
    Idempotent — uses upsert so re-running is safe.
    Returns total number of chunks indexed.
    """
    collection = _get_collection()
    total_chunks = 0

    for source_key, file_path in SOURCE_FILES.items():
        if not file_path.exists():
            logger.warning(f"Reference file not found: {file_path}")
            continue

        text = file_path.read_text(encoding="utf-8")
        chunks = _chunk_markdown(text, source=source_key)

        if not chunks:
            logger.warning(f"No chunks generated from {file_path.name}")
            continue

        ids = [c["id"] for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "source": c["source"],
                "source_label": SOURCE_LABELS.get(c["source"], c["source"]),
                "section": c["section"],
            }
            for c in chunks
        ]

        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )

        logger.info(f"Indexed {len(chunks)} chunks from {file_path.name}")
        total_chunks += len(chunks)

    logger.info(f"RAG seeding complete. Total chunks indexed: {total_chunks}")
    return total_chunks


def is_seeded() -> bool:
    """Check if the collection has any documents."""
    try:
        collection = _get_collection()
        return collection.count() > 0
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Retrieval
# ─────────────────────────────────────────────────────────────────────────────

def retrieve_evidence(
    query: str,
    top_k: int = 3,
    source_filter: Optional[str] = None,
) -> list[EvidenceChunk]:
    """
    Retrieve top-k most semantically similar reference chunks for a query.

    Args:
        query: The hazard description or summary text to search against
        top_k: Number of results to return
        source_filter: Optional — restrict to a specific source document

    Returns:
        List of EvidenceChunk objects sorted by similarity (highest first)
    """
    collection = _get_collection()

    if collection.count() == 0:
        logger.warning("RAG collection is empty. Run seed_rag() first.")
        return []

    query_params: dict = {
        "query_texts": [query],
        "n_results": min(top_k, collection.count()),
        "include": ["documents", "metadatas", "distances"],
    }

    if source_filter:
        query_params["where"] = {"source": source_filter}

    try:
        results = collection.query(**query_params)
    except Exception as e:
        logger.error(f"ChromaDB query failed: {e}")
        return []

    chunks: list[EvidenceChunk] = []

    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]
    ids = results.get("ids", [[]])[0]

    for doc, meta, dist, chunk_id in zip(docs, metas, dists, ids):
        # ChromaDB cosine distance: 0 = identical, 2 = opposite
        # Convert to similarity score: 1 - (dist / 2)
        similarity = round(max(0.0, 1.0 - (dist / 2.0)), 4)

        chunks.append(EvidenceChunk(
            source=meta.get("source", "unknown"),
            source_label=meta.get("source_label", meta.get("source", "unknown")),
            chunk_id=chunk_id,
            text=doc,
            similarity_score=similarity,
            metadata={
                "section": meta.get("section", ""),
                "source_label": meta.get("source_label", ""),
            },
        ))

    # Sort by similarity descending (highest first)
    chunks.sort(key=lambda c: c.similarity_score, reverse=True)
    return chunks


def retrieve_evidence_for_hazard(
    hazard_description: str,
    iogp_rule: str = "",
    oisd_standard: str = "",
    historical_precedent: str = "",
    top_k: int = 3,
) -> list[EvidenceChunk]:
    """
    Retrieve evidence for an InferredHazard by composing a rich query
    from multiple hazard attributes to improve retrieval relevance.
    """
    # Compose a rich semantic query
    query_parts = [hazard_description]
    if iogp_rule:
        query_parts.append(iogp_rule)
    if oisd_standard:
        query_parts.append(oisd_standard)
    if historical_precedent:
        query_parts.append(historical_precedent)

    query = " | ".join(query_parts)
    return retrieve_evidence(query=query, top_k=top_k)
