# SentimentIQ

### AI-powered feedback analytics platform with autonomous agents that take real actions

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-Tool_Calling_+_RAG-1C3C3C?style=flat)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-F55036?style=flat)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat&logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

SentimentIQ turns raw customer feedback into decisions. It ingests feedback data at scale, surfaces satisfaction trends across teams and regions, and deploys three AI agents that go beyond conversation — they create support tickets, raise performance alerts, and generate reports that persist in a live operations dashboard.

Built with React, FastAPI, and LangChain — using native tool calling and a RAG pipeline over the knowledge base.

## Highlights

- **Agentic architecture** — three AI agents using LangChain native tool calling that perform real, persistent database actions rather than returning text, backed by an operations dashboard that proves every action
- **RAG knowledge base** — Chroma vector store with HuggingFace sentence-transformers indexes the knowledge base on startup; each agent retrieves semantically relevant sections per query
- **Scales to 50,000+ rows** — client-side pagination and memoized data pipelines keep the UI responsive on large datasets
- **Deterministic alerting** — threshold detection runs in code, not the LLM, so results are consistent and reliable on every run
- **Production-minded auth** — JWT sessions with expiry and bcrypt-hashed passwords, enforced on every protected route
- **Multi-format ingestion** — CSV, Excel, JSON, and TXT parsed and normalized automatically
- **Groq / Gemini fallback** — provider-agnostic LangChain interface switches to Gemini automatically if Groq is unavailable

---

## The Three Agents

The core of the project. Each agent uses the LLM to reason, then executes a concrete action in the system via LangChain tool calling.

| Agent                    | Reasons about                         | Real action taken                                                                   |
| ------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------- |
| **Smart Ticket Routing** | An IT complaint in plain English      | Classifies it, assigns priority (P1–P4), routes to a team, and **creates a ticket** |
| **Sentiment Analysis**   | Feedback metrics across teams/regions | Answers with live numbers and **raises alerts** for any entity below target         |
| **Research & Reporting** | A reporting request                   | Writes a full professional report and **saves it** for later retrieval              |

The distinction from a chatbot is deliberate: every agent run writes a record to the database that survives restarts. The **Operations** page is the evidence layer — it shows the live tickets, alerts, and reports the agents produced, all resolvable and reviewable.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  React 18 + Vite (Frontend)                 │
│  Charts · Data · Analysis · Agents · Ops    │
└───────────────────┬─────────────────────────┘
                    │  REST / JSON + JWT
┌───────────────────▼─────────────────────────┐
│  FastAPI (Backend)                          │
│                                             │
│  Services layer          AI Agents          │
│  ├ auth  (JWT/bcrypt)    ├ ticket_router    │
│  ├ data  (Pandas)        ├ sentiment_analyst│
│  └ db    (SQLite)        └ research_reporter │
│                                             │
│  LangChain layer                            │
│  ├ Tool calling (@tool + bind_tools)        │
│  ├ RAG (Chroma + HuggingFace embeddings)    │
│  ├ ChatGroq (Llama 3.3 — primary)           │
│  └ ChatGoogleGenerativeAI (Gemini fallback) │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  SQLite                                     │
│  users · feedback_data ·                    │
│  tickets · alerts · reports                 │
└─────────────────────────────────────────────┘
```

Three-tier separation with a thin routing layer, business logic isolated in services, and all database access funnelled through a single layer.

---

## Tech Stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| Frontend     | React 18, Vite, Recharts                                      |
| Backend      | FastAPI, Pandas, Uvicorn                                      |
| Database     | SQLite                                                        |
| AI / LLM     | Groq (Llama 3.3 70B), Google Gemini 2.5 Flash (fallback)      |
| AI Framework | LangChain — tool calling, RAG, provider-agnostic interface    |
| Vector Store | Chroma + HuggingFace sentence-transformers (all-MiniLM-L6-v2) |
| Auth         | JWT (python-jose), bcrypt (passlib)                           |

---

## Architecture Decision Records

**Agents that act, not just answer.**
Each agent uses LangChain's `bind_tools()` with typed `@tool` functions. The model calls the tool with structured parameters; LangChain extracts and executes the action natively — no regex parsing. This cleanly separates _reasoning_ (the model's job) from _execution_ (the code's job).

**RAG for the knowledge base.**
The three knowledge base files are chunked with `RecursiveCharacterTextSplitter`, embedded with HuggingFace sentence-transformers, and stored in a local Chroma vector store on startup. Each agent retrieves the most semantically relevant sections per query, with the full KB as fallback — giving focused context without losing completeness.

**Reliability over cleverness for alerts.**
Rather than letting the LLM decide what to flag — which varies between runs — alert detection is fixed-threshold logic in `alert_engine.py`. The LLM's role is to _explain_ the alerts, which is what it's genuinely good at. Same data always produces same alerts.

**Groq/Gemini fallback via LangChain.**
Both models are wrapped in LangChain's `ChatGroq` and `ChatGoogleGenerativeAI` classes, exposing an identical `.invoke()` interface. Switching providers is one line — `get_llm()` returns whichever is available.

**Concurrency handling.**
SQLite permits one writer at a time. Agent writes use retry-with-backoff so a write colliding with a large in-progress import succeeds on retry instead of failing silently.

**Performance at scale.**
The data table renders 50k+ rows via a chained `useMemo` pipeline (filter → sort → paginate) so each interaction only recomputes what changed.

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)
- Optional: [Gemini API key](https://aistudio.google.com) for fallback

### Setup

```bash
# Clone the repo
git clone https://github.com/OmBadoni20/Sentimentiq.git
cd Sentimentiq/sentiment-analysis

# Backend
pip install -r requirements.txt

# Frontend
npm install

# Config
cp config.example.json config.json
# Add your Groq API key and a JWT secret to config.json
```

### Run

```bash
python backend.py     # Terminal 1 — backend on :8000
npm run dev           # Terminal 2 — frontend on :5173
```

Open `http://localhost:5173` and log in with the default credentials in `config.json`.

> **Note:** The first startup downloads the HuggingFace embedding model (~90MB) to build the RAG vector store. This takes about a minute. Subsequent startups are instant.

---

## Project Structure

```
├── backend.py                  FastAPI app — all API routes
├── config.example.json         Config template (copy to config.json)
├── knowledge_base/             Reference text for agent prompts
│   ├── ticket_routing.txt      IT categories, priorities, teams, SLA
│   ├── sentiment_guide.txt     CSAT thresholds, targets, regions
│   └── report_guide.txt        Report types, formats, writing rules
├── services/
│   ├── auth_service.py         JWT tokens + bcrypt hashing
│   ├── db_service.py           SQLite operations
│   ├── data_service.py         File parsing, metrics, analysis
│   ├── agent_service.py        Three AI agents (RAG + tool calling)
│   ├── knowledge_rag.py        RAG pipeline (Chroma + HuggingFace)
│   ├── agent_db.py             Ticket / alert / report persistence
│   └── alert_engine.py         Rule-based alert detection
└── src/
    ├── pages/                  Login · Dashboard · Agents · Operations
    ├── components/             DataTable (search, sort, filter, paginate)
    └── utils/                  Multi-format file parsers
```

---

## Default Login

```
username: admin.user    password: Admin@2026
username: manager       password: Manager@2026
username: admin         password: Admin@2026
```

---
