# AI Study Agent

A multi-agent study assistant: a **Researcher** agent (RAG + web search), a
**Summarizer** agent, and a **Quiz** agent that work together to turn a topic
into study notes and a practice quiz.

> Status: Phase 0 - project scaffold. See roadmap below.

## Architecture (target)

```
Topic --> Researcher Agent --> Summarizer Agent --> Quiz Agent --> Frontend
              |     |                                    |
        RAG (Supabase)   Web Search (Tavily)     Structured JSON output
```

## Setup

### 1. Supabase
1. Create a project at https://supabase.com
2. Go to **SQL Editor** and run `backend/schema.sql`
3. Copy your Project URL and `service_role` key from **Settings -> API**

### 2. Backend (Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # then fill in your keys
python app.py
```
Visit http://localhost:5000/health - you should see a JSON status confirming
which keys are configured.

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```
Visit http://localhost:3000 and click "Check backend health" to confirm the
frontend and backend are connected.

## Roadmap

- [x] Phase 0: Project scaffold (this)
- [ ] Phase 1: RAG foundation - ingest docs, embed, retrieve from Supabase pgvector
- [ ] Phase 2: Researcher agent - RAG + web search tool use
- [ ] Phase 3: Summarizer agent - structured notes, stored as "memory"
- [ ] Phase 4: Quiz agent - structured JSON quiz output, avoids repeat questions
- [ ] Phase 5: Orchestration - single `/study-session` endpoint chaining all agents
- [ ] Phase 6: Frontend - pipeline progress UI + interactive quiz
- [ ] Phase 7: Polish - README diagram, eval script, deployment

## Tech stack

- Backend: Flask, Anthropic/OpenAI SDK, Supabase Python client
- Vector DB: Supabase (pgvector)
- Frontend: Next.js (App Router), React
- Web search: Tavily API
