"""
Phase 4: Quiz Agent.

Takes a summarized topic and generates multiple-choice questions - using
structured output (a forced JSON schema) rather than hoping the model
formats things correctly. Checks `quiz_history` in Supabase first so it
avoids repeating questions already asked on the same topic (this is the
Quiz agent's use of the system's "memory").
"""

import json
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, supabase

MODEL = "gemini-3.1-flash-lite"

genai_client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = (
    "You are a Quiz agent for a study assistant. Given study notes and a list "
    "of questions already asked on this topic, generate NEW multiple-choice "
    "questions that test understanding of the material. Do not repeat or "
    "closely rephrase any already-asked question. Each question must have "
    "exactly 4 options with exactly one correct answer, plus a short "
    "explanation of why the answer is correct."
)

# Forces Gemini to return valid JSON matching this exact structure,
# instead of parsing free-form text and hoping for the best.
QUIZ_SCHEMA = types.Schema(
    type="ARRAY",
    items=types.Schema(
        type="OBJECT",
        properties={
            "question": types.Schema(type="STRING"),
            "options": types.Schema(type="ARRAY", items=types.Schema(type="STRING")),
            "correct_answer": types.Schema(type="STRING"),
            "explanation": types.Schema(type="STRING"),
        },
        required=["question", "options", "correct_answer", "explanation"],
    ),
)


def get_previous_questions(topic: str) -> list[str]:
    """Read quiz_history for this topic - this is the 'memory' that stops
    the agent from generating the same questions every time."""
    if supabase is None:
        return []
    response = supabase.table("quiz_history").select("question").eq("topic", topic).execute()
    return [row["question"] for row in response.data]


def generate_quiz(topic: str, summary: str, num_questions: int = 5) -> dict:
    """Generate a quiz from a topic's summary, avoiding repeat questions,
    and save the new questions to Supabase for next time."""
    previous_questions = get_previous_questions(topic)
    previous_block = (
        "\n".join(f"- {q}" for q in previous_questions)
        if previous_questions else "(none yet)"
    )

    prompt = (
        f"Topic: {topic}\n\n"
        f"Study notes:\n{summary}\n\n"
        f"Already-asked questions on this topic (do not repeat):\n{previous_block}\n\n"
        f"Generate {num_questions} new multiple-choice questions."
    )

    response = genai_client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=QUIZ_SCHEMA,
        ),
    )

    quiz = json.loads(response.text)

    saved = False
    if supabase is not None and quiz:
        rows = [
            {
                "topic": topic,
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
            }
            for q in quiz
        ]
        supabase.table("quiz_history").insert(rows).execute()
        saved = True

    return {"topic": topic, "quiz": quiz, "saved_to_memory": saved}


if __name__ == "__main__":
    import sys
    from researcher import research
    from summarizer import summarize

    topic = " ".join(sys.argv[1:]) or "Round Robin CPU scheduling"
    research_result = research(topic)
    summary_result = summarize(topic, research_result["research_notes"])
    quiz_result = generate_quiz(topic, summary_result["summary"])
    print(json.dumps(quiz_result, indent=2))
