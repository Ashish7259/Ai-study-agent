"""
Central place to initialize clients so every phase imports from here
instead of re-reading env vars everywhere.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # use service role key on the backend only

supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# LLM used for the agents (Researcher/Summarizer/Quiz) - Google AI Studio (free tier).
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Web search tool for the Researcher agent (Phase 2).
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# Note: embeddings (rag.py) run locally via sentence-transformers - no API key needed.
