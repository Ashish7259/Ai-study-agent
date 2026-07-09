"""
AI Study Agent - Backend
Phase 0: Skeleton with health check + placeholder routes for future phases.
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # allow requests from the Next.js frontend during local dev


@app.route("/health", methods=["GET"])
def health():
    """Simple check to confirm the backend + env vars are wired up."""
    return jsonify({
        "status": "ok",
        "supabase_configured": bool(os.getenv("SUPABASE_URL")),
        "llm_key_configured": bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")),
        "search_key_configured": bool(os.getenv("TAVILY_API_KEY") or os.getenv("SERPER_API_KEY")),
    })


# ---- Placeholder routes for upcoming phases ----
# Phase 1: RAG foundation
@app.route("/retrieve", methods=["GET"])
def retrieve():
    query = request.args.get("q", "")
    return jsonify({"query": query, "results": [], "note": "Phase 1 not implemented yet"})


# Phase 2-4: Agent pipeline
@app.route("/study-session", methods=["POST"])
def study_session():
    data = request.get_json(force=True)
    topic = data.get("topic", "")
    return jsonify({
        "topic": topic,
        "research_notes": None,
        "summary": None,
        "quiz": None,
        "note": "Pipeline not implemented yet (Phases 2-5)"
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
