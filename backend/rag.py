"""
Phase 1: RAG foundation.

Responsibilities:
  1. chunk_text()      - split raw text into overlapping chunks
  2. embed_text()       - turn a chunk into a vector using a local embedding model
  3. ingest_document()  - chunk + embed + store a document in Supabase
  4. retrieve()         - embed a query and find the closest chunks

Note on embeddings: this uses `sentence-transformers` (all-MiniLM-L6-v2),
which runs entirely on your own machine - no API key, no cost, no internet
call at inference time (only the first run downloads the model, ~80MB).
It produces 384-dimensional vectors, which is why schema.sql defines
`vector(384)` rather than 1536 (that dimension is specific to OpenAI's
embedding models). The LLM used later for the agents (Researcher/
Summarizer/Quiz) is still Claude via the Anthropic API - only embeddings
were swapped to be free.
"""

import re
from sentence_transformers import SentenceTransformer
from config import supabase

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_WORDS = 350         # target chunk size in words (~500 tokens)
CHUNK_OVERLAP_WORDS = 40  # overlap between consecutive chunks so context isn't cut mid-idea

_model = None


def get_model() -> SentenceTransformer:
    """Lazy-load the model once per process (it's ~80MB, downloaded on first use)."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model


def chunk_text(text: str, chunk_words: int = CHUNK_WORDS, overlap: int = CHUNK_OVERLAP_WORDS) -> list[str]:
    """Split text into overlapping chunks measured in words. Word-based
    chunking needs no extra tokenizer dependency and is good enough for
    a small portfolio-scale RAG pipeline."""
    words = re.findall(r"\S+", text)
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_words
        chunks.append(" ".join(words[start:end]))
        start += chunk_words - overlap  # step forward, leaving `overlap` words repeated
    return chunks


def embed_text(text: str) -> list[float]:
    """Get a single embedding vector for a piece of text (runs locally)."""
    model = get_model()
    return model.encode(text, normalize_embeddings=True).tolist()


def ingest_document(text: str, source: str, topic: str | None = None) -> int:
    """Chunk a document, embed each chunk, and insert into Supabase.
    Returns the number of chunks stored."""
    if supabase is None:
        raise RuntimeError("Supabase client not configured - check your .env file")

    chunks = chunk_text(text)
    model = get_model()
    embeddings = model.encode(chunks, normalize_embeddings=True).tolist()

    rows = [
        {"content": chunk, "embedding": embedding, "source": source, "topic": topic}
        for chunk, embedding in zip(chunks, embeddings)
    ]

    # Insert in one batch call rather than one row at a time
    supabase.table("documents").insert(rows).execute()
    return len(rows)


def retrieve(query: str, match_count: int = 5, topic: str | None = None) -> list[dict]:
    """Embed the query and fetch the closest chunks from Supabase via the
    match_documents() SQL function defined in schema.sql."""
    if supabase is None:
        raise RuntimeError("Supabase client not configured - check your .env file")

    query_embedding = embed_text(query)
    response = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_count": match_count,
        "filter_topic": topic,
    }).execute()
    return response.data
