# SentimentIQ

### AI-powered feedback analytics platform with autonomous agents that take real actions

SentimentIQ turns raw customer feedback into decisions. It ingests feedback data at scale, surfaces satisfaction trends across teams and regions, and deploys three AI agents that go beyond conversation — they create support tickets, raise performance alerts, and generate reports that persist in a live operations dashboard.

Built with React, FastAPI, and LangChain, orchestrating Groq's Llama 3.3 models.

<!-- Add a screenshot here for maximum impact:
     ![SentimentIQ Dashboard](docs/dashboard.png) -->

---

## Highlights

- **Agentic architecture** — three AI agents that perform real, persistent database actions rather than returning text, backed by an operations dashboard that proves every action
- **Scales to 50,000+ rows** — client-side pagination and memoized data pipelines keep the UI responsive on large datasets
- **Deterministic alerting** — threshold detection runs in code, not the LLM, so results are consistent and reliable on every run
- **Production-minded auth** — JWT sessions with expiry and bcrypt-hashed passwords, enforced on every protected route
- **Multi-format ingestion** — CSV, Excel, JSON, and TXT parsed and normalized automatically

---

## The Three Agents

The core of the project. Each agent uses the LLM to reason, then executes a concrete action in the system.

| Agent | Reasons about | Real action taken |
|---|---|---|
| **Smart Ticket Routing** | An IT complaint in plain English | Classifies it, assigns priority (P1–P4), routes to a team, and **creates a ticket** |
| **Sentiment Analysis** | Feedback metrics across teams/regions | Answers with live numbers and **raises alerts** for any entity below target |
| **Research & Reporting** | A reporting request | Writes a full professional report and **saves it** for later retrieval |

The distinction from a chatbot is deliberate: every agent run writes a record to the database that survives restarts. The **Operations** page is the evidence layer — it shows the live tickets, alerts, and reports the agents produced, all resolvable and reviewable.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  React 18 + Vite (Frontend)                 │
│  Charts · Data · Analysis · Agents · Ops    │
└───────────────────┬─────────────────────────┘
                    │  REST / JSON
┌───────────────────▼─────────────────────────┐
│  FastAPI (Backend)                          │
│                                             │
│  Services layer          AI Agents          │
│  ├ auth  (JWT/bcrypt)    ├ ticket_router    │
│  ├ data  (Pandas)        ├ sentiment_analyst│
│  └ db    (SQLite)        └ research_reporter │
│                          via LangChain →    │
│                          Groq / Gemini      │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  SQLite                                     │
│  users · feedback_data ·                    │
│  tickets · alerts · reports                 │
└─────────────────────────────────────────────┘
```

Three-tier separation with a thin routing layer, business logic isolated in services, and all database access funnelled through a single layer — making the stack modular and testable.

---

## Tech Stack

**Frontend** — React 18, Vite, Recharts
**Backend** — FastAPI, Pandas, Uvicorn
**Database** — SQLite
**AI / LLM** — Groq (Llama 3.3), Google Gemini (fallback), orchestrated with LangChain
**Auth** — JWT (python-jose), bcrypt (passlib)

---

## Engineering Details Worth Noting

**Agents that act, not just answer.** Each agent embeds a structured action block in its LLM response; the backend parses it and executes the corresponding database write. This cleanly separates *reasoning* (the model's job) from *execution* (the code's job).

**Reliability over cleverness for alerts.** Rather than letting the LLM decide what to flag — which varies between runs — alert detection is fixed-threshold logic in `alert_engine.py`. The LLM's role is to *explain* the alerts, which is what it's genuinely good at.

**Concurrency handling.** SQLite permits one writer at a time. Agent writes use retry-with-backoff so a write colliding with a large in-progress import succeeds on retry instead of failing.

**Performance at scale.** The data table renders 50k+ rows via a chained `useMemo` pipeline (filter → sort → paginate) so each interaction only recomputes what changed.

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### Setup

```bash
pip install -r requirements.txt
npm install
cp config.example.json config.json
```

Add your Groq key and a JWT secret to `config.json`:

```json
"auth": { "secret_key": "python -c \"import secrets; print(secrets.token_hex(32))\"" },
"ai":   { "groq_api_key": "your_key_here" }
```

### Run

```bash
python backend.py     # Terminal 1 — backend on :8000
npm run dev           # Terminal 2 — frontend on :5173
```

---

## Project Structure

```
├── backend.py              FastAPI app — all API routes
├── services/
│   ├── auth_service.py     JWT tokens + bcrypt hashing
│   ├── db_service.py       SQLite operations
│   ├── data_service.py     File parsing, metrics, analysis
│   ├── agent_service.py    The three AI agents
│   ├── agent_db.py         Ticket / alert / report persistence
│   └── alert_engine.py     Rule-based alert detection
├── knowledge_base/         Reference text injected into agent prompts
└── src/
    ├── pages/              Login · Dashboard · Agents · Operations
    ├── components/         DataTable (search, sort, filter, paginate)
    └── utils/              Multi-format file parsers
```
