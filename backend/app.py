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
from summarizer import summarize
from quiz import generate_quiz

load_dotenv()

app = Flask(__name__)
CORS(app)  # allow requests from the Next.js frontend during local dev


@app.route("/health", methods=["GET"])
def health():
    """Simple check to confirm the backend + env vars are wired up."""
    return jsonify({
        "status": "ok",
        "supabase_configured": bool(os.getenv("SUPABASE_URL")),
        "llm_key_configured": bool(os.getenv("GEMINI_API_KEY")),
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


# Phase 3: Summarizer agent
@app.route("/summarize", methods=["POST"])
def summarize_route():
    data = request.get_json(force=True)
    topic = data.get("topic", "")
    research_notes = data.get("research_notes", "")

    if not topic or not research_notes:
        return jsonify({"error": "missing 'topic' or 'research_notes' in request body"}), 400

    try:
        result = summarize(topic, research_notes)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Phase 4: Quiz agent
@app.route("/quiz", methods=["POST"])
def quiz_route():
    data = request.get_json(force=True)
    topic = data.get("topic", "")
    summary = data.get("summary", "")
    num_questions = int(data.get("num_questions", 5))

    if not topic or not summary:
        return jsonify({"error": "missing 'topic' or 'summary' in request body"}), 400

    try:
        result = generate_quiz(topic, summary, num_questions=num_questions)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Full pipeline: Researcher -> Summarizer -> Quiz
@app.route("/study-session", methods=["POST"])
def study_session():
    data = request.get_json(force=True)
    topic = data.get("topic", "")

    if not topic:
        return jsonify({"error": "missing 'topic' in request body"}), 400

    try:
        research_result = research(topic)
        summary_result = summarize(topic, research_result["research_notes"])
        quiz_result = generate_quiz(topic, summary_result["summary"])
        return jsonify({
            "topic": topic,
            "research_notes": research_result["research_notes"],
            "tool_calls": research_result["tool_calls"],
            "summary": summary_result["summary"],
            "quiz": quiz_result["quiz"],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
