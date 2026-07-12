"""
AI Study Agent - Backend
Phase 0: Skeleton with health check + placeholder routes for future phases.
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from rag import retrieve
from researcher import research

load_dotenv()

app = Flask(__name__)
CORS(app)  # allow requests from the Next.js frontend during local dev


@app.route("/health", methods=["GET"])
def health():
    """Simple check to confirm the backend + env vars are wired up."""
    return jsonify({
        "status": "ok",
        "supabase_configured": bool(os.getenv("SUPABASE_URL")),
        "llm_key_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "search_key_configured": bool(os.getenv("TAVILY_API_KEY")),
    })


# Phase 1: RAG foundation
@app.route("/retrieve", methods=["GET"])
def retrieve_route():
    query = request.args.get("q", "")
    topic = request.args.get("topic")
    match_count = int(request.args.get("match_count", 5))

    if not query:
        return jsonify({"error": "missing 'q' query parameter"}), 400

    try:
        results = retrieve(query, match_count=match_count, topic=topic)
        return jsonify({"query": query, "results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Placeholder routes for upcoming phases ----


# Phase 2: Researcher agent
@app.route("/research", methods=["POST"])
def research_route():
    data = request.get_json(force=True)
    topic = data.get("topic", "")

    if not topic:
        return jsonify({"error": "missing 'topic' in request body"}), 400

    try:
        result = research(topic)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Phase 3-4: Agent pipeline
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
