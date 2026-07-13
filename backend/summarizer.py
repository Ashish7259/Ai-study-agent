"""
Phase 3: Summarizer Agent.

Takes the Researcher agent's raw notes and produces a clean, structured
summary (headings + bullet points) - ready to display as study notes or
feed into the Quiz agent.

Unlike the Researcher, this agent needs no tools - it's a single prompt
that reshapes text. It also writes the summary to Supabase's `summaries`
table, which acts as the system's long-term "memory" of what topics have
already been covered (used later by the Quiz agent to avoid repeating
questions on the same material).
"""

import json
from google import genai
from config import GEMINI_API_KEY, supabase

MODEL = "gemini-3.1-flash-lite"

genai_client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = (
    "You are a Summarizer agent for a study assistant. You will be given raw "
    "research notes on a topic. Rewrite them as clean, structured study notes:\n"
    "- Use clear headings (##) for major subtopics\n"
    "- Use bullet points for facts, lists, and comparisons\n"
    "- Bold key terms the student should remember\n"
    "- Keep it concise - this is a study aid, not an essay\n"
    "- Do not add information that wasn't in the research notes"
)


def summarize(topic: str, research_notes: str) -> dict:
    """Turn raw research notes into a structured summary, and save it to
    Supabase so it becomes part of the system's memory of covered topics."""
    response = genai_client.models.generate_content(
        model=MODEL,
        contents=f"Topic: {topic}\n\nResearch notes:\n{research_notes}",
        config={"system_instruction": SYSTEM_PROMPT},
    )
    summary_text = response.text

    saved = False
    if supabase is not None:
        supabase.table("summaries").insert({
            "topic": topic,
            "summary": summary_text,
        }).execute()
        saved = True

    return {"topic": topic, "summary": summary_text, "saved_to_memory": saved}


def get_covered_topics() -> list[str]:
    """Return every topic previously summarized - this is how later phases
    (like the Quiz agent) 'remember' what's already been studied."""
    if supabase is None:
        return []
    response = supabase.table("summaries").select("topic").execute()
    return list({row["topic"] for row in response.data})


if __name__ == "__main__":
    import sys
    from researcher import research

    topic = " ".join(sys.argv[1:]) or "Round Robin CPU scheduling"
    research_result = research(topic)
    summary_result = summarize(topic, research_result["research_notes"])
    print(json.dumps(summary_result, indent=2))
