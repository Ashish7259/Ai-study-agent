"""
AI Study Agent - Backend
Phase 6: production-ready CORS (restricted to a configured frontend origin).
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from rag import retrieve, ingest_document
from researcher import research
from summarizer import summarize
from quiz import generate_quiz
from config import supabase
from pypdf import PdfReader

load_dotenv()

app = Flask(__name__)

# In local dev, defaults to allowing localhost:3000. In production, set
# FRONTEND_URL to your deployed frontend's URL (e.g. https://your-app.vercel.app)
# so only that origin can call this API.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS(app, origins=[FRONTEND_URL])


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


# Phase 9: Upload your own notes from the frontend (same chunk/embed/store
# pipeline as ingest.py, just triggered via HTTP instead of the CLI).
ALLOWED_EXTENSIONS = {"txt", "pdf"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB - generous for a small portfolio project


@app.route("/upload", methods=["POST"])
def upload_route():
    if "file" not in request.files:
        return jsonify({"error": "no file provided"}), 400

    file = request.files["file"]
    topic = request.form.get("topic") or None

    if not file.filename:
        return jsonify({"error": "no file selected"}), 400

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"unsupported file type '.{ext}' - only .txt and .pdf are supported"}), 400

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > MAX_UPLOAD_BYTES:
        return jsonify({"error": "file too large - 10MB max"}), 400

    try:
        if ext == "txt":
            text = file.stream.read().decode("utf-8", errors="ignore")
        else:  # pdf
            reader = PdfReader(file.stream)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)

        if not text.strip():
            return jsonify({"error": "could not extract any text from this file"}), 400

        count = ingest_document(text, source=file.filename, topic=topic)
        return jsonify({"filename": file.filename, "chunks_stored": count, "topic": topic})
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


# Phase 7: Study history dashboard
@app.route("/complete-session", methods=["POST"])
def complete_session_route():
    """Called by the frontend once a user finishes a quiz - records the
    score so it shows up in the history dashboard."""
    data = request.get_json(force=True)
    topic = data.get("topic", "")
    score = data.get("score")
    total_questions = data.get("total_questions")

    if not topic or score is None or total_questions is None:
        return jsonify({"error": "missing 'topic', 'score', or 'total_questions'"}), 400

    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        supabase.table("study_sessions").insert({
            "topic": topic,
            "score": score,
            "total_questions": total_questions,
        }).execute()
        return jsonify({"saved": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/history", methods=["GET"])
def history_route():
    """Returns every completed study session, most recent first, plus the
    latest saved summary for each topic - powers the history dashboard."""
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        sessions_res = (
            supabase.table("study_sessions")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        summaries_res = (
            supabase.table("summaries")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        # Keep only the most recent summary per topic
        latest_summary_by_topic = {}
        for row in summaries_res.data:
            if row["topic"] not in latest_summary_by_topic:
                latest_summary_by_topic[row["topic"]] = row["summary"]

        sessions = [
            {
                "topic": s["topic"],
                "score": s["score"],
                "total_questions": s["total_questions"],
                "created_at": s["created_at"],
                "summary": latest_summary_by_topic.get(s["topic"]),
            }
            for s in sessions_res.data
        ]
        return jsonify({"sessions": sessions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Flashcards feature: reuses quiz_history (question -> correct_answer +
# explanation) as flashcard front/back - no new AI generation needed.
@app.route("/flashcards/topics", methods=["GET"])
def flashcard_topics_route():
    """Returns each topic that has quiz questions, with a card count -
    used to populate the topic picker before showing flashcards."""
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        response = supabase.table("quiz_history").select("topic").execute()
        counts = {}
        for row in response.data:
            counts[row["topic"]] = counts.get(row["topic"], 0) + 1
        topics = [{"topic": t, "count": c} for t, c in counts.items()]
        topics.sort(key=lambda t: t["topic"])
        return jsonify({"topics": topics})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/flashcards", methods=["GET"])
def flashcards_route():
    """Returns every quiz question for a topic reshaped as flashcards:
    front = question, back = correct answer + explanation."""
    topic = request.args.get("topic", "")
    if not topic:
        return jsonify({"error": "missing 'topic' query parameter"}), 400
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        response = (
            supabase.table("quiz_history")
            .select("*")
            .eq("topic", topic)
            .order("created_at")
            .execute()
        )
        cards = [
            {
                "front": row["question"],
                "back": row["correct_answer"],
                "explanation": row.get("explanation"),
            }
            for row in response.data
        ]
        return jsonify({"topic": topic, "cards": cards})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(debug=debug, port=port, host="0.0.0.0")
