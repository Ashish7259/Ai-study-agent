"""
Phase 2: Researcher Agent (Google Gemini version - free tier).

Given a topic, this agent decides - on its own, via tool use / function
calling - whether to:
  1. Pull from your ingested documents (RAG, via rag.retrieve())
  2. Search the web (via Tavily)
  3. Use both, if the topic needs it

This is what makes it an "agent" rather than a plain RAG pipeline: Gemini
inspects the topic, chooses which tool(s) to call, we execute them, and
feed the results back so it can decide if it needs another tool call or
is ready to produce final research notes.

Uses Google AI Studio's Gemini API (genuine free tier - no trial credit
countdown) instead of Anthropic, so the whole project runs at $0 cost.
"""

import json
from google import genai
from google.genai import types
from tavily import TavilyClient
from rag import retrieve as rag_retrieve
from config import GEMINI_API_KEY, TAVILY_API_KEY

MODEL = "gemini-3.1-flash-lite"  # Gemini 2.5 gen - avoids Gemini 3's strict thought-signature requirement
MAX_AGENT_STEPS = 4  # safety cap so the loop can't run forever

genai_client = genai.Client(api_key=GEMINI_API_KEY)
tavily_client = TavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY else None


# ---- Tool definitions (schemas Gemini sees) ----
SEARCH_DOCUMENTS_DECLARATION = {
    "name": "search_documents",
    "description": (
        "Search the user's own ingested study documents/notes for relevant "
        "passages. Use this first for any topic that might be covered in the "
        "user's course material."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "query": {"type": "STRING", "description": "What to search for"},
        },
        "required": ["query"],
    },
}

SEARCH_WEB_DECLARATION = {
    "name": "search_web",
    "description": (
        "Search the live web for information. Use this when the user's own "
        "documents don't cover the topic, or when up-to-date/external info is needed."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "query": {"type": "STRING", "description": "What to search for"},
        },
        "required": ["query"],
    },
}

TOOLS = [types.Tool(function_declarations=[SEARCH_DOCUMENTS_DECLARATION, SEARCH_WEB_DECLARATION])]


# ---- Tool execution (the actual Python functions behind each tool) ----
def execute_tool(name: str, tool_input: dict) -> str:
    if name == "search_documents":
        results = rag_retrieve(tool_input["query"], match_count=4)
        if not results:
            return "No relevant passages found in the user's documents."
        return "\n\n".join(f"[source: {r['source']}] {r['content']}" for r in results)

    if name == "search_web":
        if tavily_client is None:
            return "Web search is not configured (missing TAVILY_API_KEY)."
        response = tavily_client.search(query=tool_input["query"], max_results=4)
        snippets = [f"[{r['title']}] {r['content']}" for r in response.get("results", [])]
        return "\n\n".join(snippets) if snippets else "No web results found."

    return f"Unknown tool: {name}"


# ---- The agent loop ----
SYSTEM_PROMPT = (
    "You are a Researcher agent for a study assistant. Given a topic, gather "
    "relevant information using the tools available. Prefer the user's own "
    "documents first, and use web search to fill gaps or get current info. "
    "Once you have enough information, respond with plain text research notes "
    "(no tool call) - factual, organized, and ready to be summarized by another agent. "
    "Do not call more tools than necessary."
)


def research(topic: str) -> dict:
    """Run the agentic research loop for a topic. Returns the final research
    notes plus a log of which tools were called, for transparency in the UI."""
    contents = [types.Content(role="user", parts=[types.Part(text=f"Research this topic: {topic}")])]
    tool_call_log = []

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=TOOLS,
        # We handle function calls manually (not automatically) so we can log them.
        automatic_function_calling=types.AutomaticFunctionCallingConfig(
            disable=True, maximum_remote_calls=None
        ),
    )

    for _ in range(MAX_AGENT_STEPS):
        response = genai_client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=config,
        )

        candidate_parts = response.candidates[0].content.parts
        function_calls = [p.function_call for p in candidate_parts if p.function_call]

        if not function_calls:
            # Gemini decided it has enough info - extract final text and stop.
            final_text = "".join(p.text for p in candidate_parts if p.text)
            return {"topic": topic, "research_notes": final_text, "tool_calls": tool_call_log}

        # Gemini wants to call one or more tools - execute each and reply.
        # Safety patch: Gemini 3-family models require a "thought_signature" on
        # function-call parts for multi-turn tool use. If a model ever returns
        # one without it, inject Google's documented dummy value rather than
        # crash - this keeps the loop robust regardless of which model ends up
        # behind an alias in the future.
        for part in response.candidates[0].content.parts:
            if part.function_call and not getattr(part, "thought_signature", None):
                part.thought_signature = b"skip_thought_signature_validator"

        contents.append(response.candidates[0].content)
        function_response_parts = []
        for fc in function_calls:
            tool_input = dict(fc.args) if fc.args else {}
            result_text = execute_tool(fc.name, tool_input)
            tool_call_log.append({"tool": fc.name, "input": tool_input})
            function_response_parts.append(
                types.Part.from_function_response(name=fc.name, response={"result": result_text})
            )
        contents.append(types.Content(role="user", parts=function_response_parts))

    return {
        "topic": topic,
        "research_notes": "Reached max research steps without a final answer.",
        "tool_calls": tool_call_log,
    }


if __name__ == "__main__":
    import sys
    topic = " ".join(sys.argv[1:]) or "Round Robin CPU scheduling"
    result = research(topic)
    print(json.dumps(result, indent=2))
