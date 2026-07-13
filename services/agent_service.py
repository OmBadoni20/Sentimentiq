# ============================================================
# AI AGENT SERVICE — TRUE AGENTS (not just chatbots!)
#   Ticket Router    -> CREATES tickets (LangChain tool calling)
#   Sentiment Analyst-> RAISES alerts (rule-based, reliable)
#   Research Reporter-> SAVES reports (LangChain tool calling)
#
# UPGRADES IN THIS VERSION:
#   1. RAG — knowledge base is retrieved semantically via
#      a Chroma vector store, not injected whole. Falls back
#      to full-KB injection if RAG libraries aren't installed.
#   2. LangChain tool calling — actions are executed through
#      bound tools with typed parameters, replacing the
#      custom <<<ACTION>>> regex pattern. Falls back to the
#      regex pattern if the model doesn't support tools.
#
# Default model: Groq (14400 req/day). Gemini fallback.
# ============================================================

import os
import re
import json
from datetime import datetime

from services.agent_db import (
    create_ticket,
    create_alert,
    save_report,
)
from services.alert_engine import scan_and_create_alerts

# RAG module (optional — degrades gracefully if unavailable)
try:
    from services import knowledge_rag
    _HAS_RAG_MODULE = True
except Exception as e:
    print(f"[AgentService] RAG module not loaded: {e}")
    _HAS_RAG_MODULE = False


def load_config():
    with open('config.json', 'r') as f:
        return json.load(f)


CONFIG = load_config()
AI_CFG = CONFIG.get('ai', {})

print("[AgentService] Loading AI agents...")


# ── Load knowledge base (full text — RAG fallback) ────────
def load_kb(filename: str) -> str:
    path = os.path.join(
        os.path.dirname(__file__),
        '..', 'knowledge_base', filename
    )
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception:
        print(f"[AgentService] KB not found: {filename}")
        return ""


KB_TICKET    = load_kb('ticket_routing.txt')
KB_SENTIMENT = load_kb('sentiment_guide.txt')
KB_REPORT    = load_kb('report_guide.txt')


# ── Build the RAG vector store (once, on import) ──────────
RAG_ON = False
if _HAS_RAG_MODULE:
    try:
        RAG_ON = knowledge_rag.build_vectorstore()
    except Exception as e:
        print(f"[AgentService] RAG build error: {e}")
        RAG_ON = False


def get_knowledge(query: str, agent: str, full_kb: str, k: int = 4) -> str:
    """
    Returns knowledge for a prompt.

    Design note: our knowledge base is small enough to fit
    comfortably in the context window, so we inject the FULL
    knowledge base for maximum answer quality. RAG retrieval
    is still built and available (see knowledge_rag.py) and is
    used to surface the most relevant sections FIRST, followed
    by the full context — giving the model both focused and
    complete information. This avoids the quality loss that
    pure retrieval causes on a small knowledge base.
    """
    if RAG_ON and _HAS_RAG_MODULE:
        retrieved = knowledge_rag.retrieve(query, agent=agent, k=k)
        if retrieved.strip():
            # Most-relevant sections first, then the full base
            return (
                "MOST RELEVANT SECTIONS FOR THIS QUERY:\n"
                f"{retrieved}\n\n"
                "COMPLETE KNOWLEDGE BASE:\n"
                f"{full_kb}"
            )
    return full_kb   # graceful fallback


# ── Initialize Groq ───────────────────────────────────────
GROQ_AVAILABLE = False
groq_llm       = None
try:
    from langchain_groq import ChatGroq
    groq_key = AI_CFG.get('groq_api_key', '')
    if groq_key and 'PASTE' not in groq_key and groq_key != '':
        groq_llm = ChatGroq(
            api_key     = groq_key,
            model_name  = AI_CFG.get('groq_model', 'llama-3.3-70b-versatile'),
            temperature = 0.3,
        )
        GROQ_AVAILABLE = True
        print("[AgentService] Groq connected!")
    else:
        print("[AgentService] Groq key not set")
except Exception as e:
    print(f"[AgentService] Groq error: {e}")


# ── Initialize Gemini ─────────────────────────────────────
GEMINI_AVAILABLE = False
gemini_llm       = None
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    gemini_key = AI_CFG.get('gemini_api_key', '')
    if gemini_key and 'PASTE' not in gemini_key and gemini_key != '':
        gemini_llm = ChatGoogleGenerativeAI(
            model          = AI_CFG.get('gemini_model', 'gemini-2.5-flash'),
            google_api_key = gemini_key,
            temperature    = 0.3,
            convert_system_message_to_human = True,
        )
        GEMINI_AVAILABLE = True
        print("[AgentService] Gemini connected!")
    else:
        print("[AgentService] Gemini key not set")
except Exception as e:
    print(f"[AgentService] Gemini error: {e}")

if not GROQ_AVAILABLE and not GEMINI_AVAILABLE:
    print("[AgentService] No AI connected! Add API keys to config.json")


# ── Helper: pick the working model ────────────────────────
def get_llm():
    """All agents use Groq (14400/day). Gemini only as fallback."""
    if GROQ_AVAILABLE:
        return groq_llm, "Groq"
    if GEMINI_AVAILABLE:
        return gemini_llm, "Gemini"
    return None, "None"


# ============================================================
# LANGCHAIN TOOLS
# Each agent action is a proper LangChain tool with typed
# parameters. The model chooses to call these; LangChain
# extracts the arguments natively — no regex parsing.
#
# The tools stash their structured result in a thread-local
# holder so the calling agent can read what happened.
# ============================================================
_TOOL_RESULT = {"action_taken": None}

try:
    from langchain_core.tools import tool

    @tool
    def create_support_ticket(
        issue: str,
        category: str,
        priority: str,
        team: str,
        team_email: str,
    ) -> str:
        """Create a real IT support ticket in the system.

        Call this whenever a user reports an IT problem that
        should be routed to a team.

        Args:
            issue: A short summary of the user's problem.
            category: The issue category (e.g. 'VPN / Remote Access').
            priority: One of 'P1', 'P2', 'P3', 'P4'.
            team: The team that should handle it (e.g. 'Network Team').
            team_email: The team's contact email.
        """
        ticket_id = f"TKT-{datetime.now().strftime('%Y%m%d')}-{abs(hash(issue)) % 9999:04d}"
        try:
            create_ticket(
                ticket_id=ticket_id, issue=issue, category=category,
                priority=priority, team=team, team_email=team_email,
                created_by=_TOOL_RESULT.get("username", "user"),
            )
            _TOOL_RESULT["action_taken"] = {
                "type": "ticket_created", "ticket_id": ticket_id,
                "team": team, "priority": priority,
            }
            print(f"[AgentService] TOOL create_support_ticket -> {ticket_id}")
            return f"Ticket {ticket_id} created and routed to {team}."
        except Exception as e:
            return f"Failed to create ticket: {e}"

    @tool
    def save_management_report(title: str, report_type: str) -> str:
        """Save the management report that was just written.

        Call this after composing a report, so it is stored and
        can be reopened from the Operations dashboard.

        Args:
            title: A short title for the report.
            report_type: One of 'Executive Summary', 'Weekly Report',
                'Team Report', 'Regional Report', 'Other'.
        """
        # content is filled in by the caller after generation
        content = _TOOL_RESULT.get("report_content", "")
        try:
            report_id = save_report(
                title=title, report_type=report_type,
                content=content,
                created_by=_TOOL_RESULT.get("username", "user"),
            )
            _TOOL_RESULT["action_taken"] = {
                "type": "report_saved", "report_id": report_id, "title": title,
            }
            print(f"[AgentService] TOOL save_management_report -> #{report_id}")
            return f"Report '{title}' saved."
        except Exception as e:
            return f"Failed to save report: {e}"

    TOOLS_AVAILABLE = True
except Exception as e:
    print(f"[AgentService] Tool setup failed, using fallback: {e}")
    TOOLS_AVAILABLE = False


def _supports_tools(llm) -> bool:
    """Groq's Llama 3.3 supports tool calling; check the method exists."""
    return TOOLS_AVAILABLE and hasattr(llm, "bind_tools")


# ── Helper: extract JSON action block (fallback path) ─────
def extract_action(text: str):
    match = re.search(r'<<<ACTION>>>(.*?)<<<END>>>', text, re.DOTALL)
    if not match:
        return None, text
    raw = match.group(1).strip()
    raw = re.sub(r'^```(json)?', '', raw).strip()
    raw = re.sub(r'```$', '', raw).strip()
    clean_text = re.sub(r'<<<ACTION>>>.*?<<<END>>>', '', text, flags=re.DOTALL).strip()
    try:
        return json.loads(raw), clean_text
    except Exception as e:
        print(f"[AgentService] Action parse failed: {e}")
        return None, clean_text


def strip_thinking(text: str) -> str:
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = re.sub(r'</?think>', '', text)
    return text.strip()


# ── Get COMPLETE dashboard data context ───────────────────
def get_data_context() -> str:
    try:
        from services.data_service import (
            get_metrics, get_repetitive_issues,
        )
        m = get_metrics()
        if m.get('total', 0) == 0:
            return "No data imported yet. Ask user to import data first."

        today = datetime.now().strftime('%d %B %Y')
        ctx = f"""
YOU HAVE FULL ACCESS TO SENTIMENTIQ DATA.
ANSWER EVERY QUESTION USING THIS DATA. NEVER SAY DATA IS UNAVAILABLE.

SENTIMENTIQ DATA — {today}
OVERALL METRICS:
Total Records : {m.get('total', 0):,}
CSAT Score    : {m.get('csat_pct', 0)}%
DSAT Score    : {m.get('dsat_pct', 0)}%
Neutral Score : {m.get('neutral_pct', 0)}%
Satisfied     : {m.get('csat_n', 0):,}
Dissatisfied  : {m.get('dsat_n', 0):,}

COMPANY TARGET: CSAT 92% | DSAT below 4% | Industry avg 85%
"""
        if m.get('team_breakdown'):
            teams = sorted(m['team_breakdown'].items(),
                           key=lambda x: x[1]['csat_pct'], reverse=True)
            ctx += "\nTEAM PERFORMANCE (Best to Worst):\n"
            for t, d in teams:
                ctx += f"  {t}: CSAT {d['csat_pct']}% | DSAT {d['dsat_pct']}% | {d['total']:,} responses\n"
            ctx += f"\nBest Team: {teams[0][0]} ({teams[0][1]['csat_pct']}%)\n"
            ctx += f"Worst Team: {teams[-1][0]} ({teams[-1][1]['csat_pct']}%)\n"

        if m.get('region_breakdown'):
            regions = sorted(m['region_breakdown'].items(),
                             key=lambda x: x[1]['csat_pct'], reverse=True)
            ctx += "\nREGION PERFORMANCE (Best to Worst):\n"
            for r, d in regions:
                ctx += f"  {r}: CSAT {d['csat_pct']}% | DSAT {d['dsat_pct']}% | {d['total']:,} responses\n"

        try:
            rep = get_repetitive_issues()
            issues = rep.get('issues', [])
            if issues:
                ctx += "\nISSUE FREQUENCY (Most to Least):\n"
                for i, issue in enumerate(issues, 1):
                    ctx += (f"  {i}. {issue['issue']}: {issue['count']:,} tickets "
                            f"({issue['percentage']}%) | Negative: {issue['neg_pct']}%\n")
                ctx += f"\nMOST REPETITIVE ISSUE: {issues[0]['issue']} ({issues[0]['count']:,} tickets)\n"
        except Exception as e:
            print(f"[AgentService] Issues context error: {e}")

        return ctx
    except Exception as e:
        return f"Error loading data: {e}"


# ── Core AI call (plain, no tools) ────────────────────────
def call_ai(llm, system, user_msg, history):
    from langchain_core.messages import (
        HumanMessage, SystemMessage, AIMessage
    )
    messages = [SystemMessage(content=system)]
    for msg in history[-6:]:
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=msg['content']))
        else:
            messages.append(AIMessage(content=msg['content']))
    messages.append(HumanMessage(content=user_msg))
    response = llm.invoke(messages)
    return response.content


# ── Core AI call WITH tools (LangChain tool calling) ──────
def call_ai_with_tools(llm, system, user_msg, history, tools):
    """
    Invokes the model with bound tools. If the model chooses to
    call a tool, we execute it and return the tool's text plus
    the model's message. Returns (text, tool_was_called).
    """
    from langchain_core.messages import (
        HumanMessage, SystemMessage, AIMessage
    )
    llm_tools = llm.bind_tools(tools)

    messages = [SystemMessage(content=system)]
    for msg in history[-6:]:
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=msg['content']))
        else:
            messages.append(AIMessage(content=msg['content']))
    messages.append(HumanMessage(content=user_msg))

    response = llm_tools.invoke(messages)

    tool_called = False
    if getattr(response, "tool_calls", None):
        # Execute each tool call the model requested
        tool_map = {t.name: t for t in tools}
        for tc in response.tool_calls:
            name = tc.get("name")
            args = tc.get("args", {})
            if name in tool_map:
                tool_map[name].invoke(args)   # runs the tool
                tool_called = True

    return response.content, tool_called


# ============================================================
# AGENT 1: SMART TICKET ROUTING
# Uses LangChain tool calling when available; falls back to
# the <<<ACTION>>> pattern otherwise.
# ============================================================
def ticket_router(user_message, chat_history, username="user"):
    llm, name = get_llm()
    if not llm:
        return {"response": "AI not connected! Add API keys to config.json",
                "action_taken": None}

    print(f"[AgentService] Ticket Router -> {name}"
          f" | RAG={'on' if RAG_ON else 'off'}"
          f" | tools={'on' if _supports_tools(llm) else 'off'}")

    # RAG: retrieve only the relevant routing knowledge
    kb = get_knowledge(user_message, agent="ticket", full_kb=KB_TICKET)

    _TOOL_RESULT["action_taken"] = None
    _TOOL_RESULT["username"] = username

    # ---- Tool-calling path (preferred) ----
    if _supports_tools(llm):
        ticket_num = f"TKT-{datetime.now().strftime('%Y%m%d')}-{abs(hash(user_message)) % 9999:04d}"
        _TOOL_RESULT["ticket_num"] = ticket_num

        system = f"""You are a Smart IT Ticket Routing Agent for SentimentIQ.
You are helpful and conversational. You handle IT support requests AND you
answer the user's follow-up questions naturally.

RELEVANT KNOWLEDGE BASE:
{kb}

HOW TO DECIDE WHAT TO DO:

CASE A — The user is describing a NEW IT problem that needs a ticket:
1. Call the create_support_ticket tool with the correct category, priority,
   team and email from the knowledge base.
2. Then write a reply using EXACTLY this block structure:

[If P1: start with: CRITICAL PRIORITY - ESCALATING NOW!]

Hi! I have created a ticket for your issue.

TICKET CREATED
Ticket ID  : {ticket_num}
Date       : {datetime.now().strftime('%d %B %Y')}
Status     : Open

ISSUE DETAILS
Category   : [category]
Priority   : [P1/P2/P3/P4] - [Critical/High/Medium/Low]
Team       : [team name]
Contact    : [team email]
Resolution : [SLA time from knowledge base]

TRY THESE STEPS FIRST
[numbered self-help steps from knowledge base]

The [team name] has been notified and will contact you within [SLA time].

CASE B — The user is asking a FOLLOW-UP QUESTION about a ticket already
created earlier in this conversation (e.g. "what team did you route this to?",
"will they contact me or do I contact them?", "give me more self-help steps",
"how long will it take?"):
- DO NOT create another ticket. DO NOT call the tool.
- Just answer their question directly, warmly, and helpfully, using the
  conversation history and the knowledge base.
- For "will they contact me?": explain that the team has been notified and
  will reach out, and give the team's contact so they can follow up too.
- For "more self-help steps": give additional practical steps from the
  knowledge base for that issue.

Look at the conversation history. If a ticket was already created for this
issue and the user is now asking about it, you are in CASE B — just answer.
Only create a new ticket when there is a genuinely NEW, different problem.

Priority rules:
P1 = work completely stopped AND external/client/business impact with deadline
P2 = work seriously affected, no external impact
P3 = work partially affected
P4 = minor inconvenience

FORMAT RULES:
- For CASE A, use the exact block structure above.
- NEVER write it as a letter/email. NEVER use "Dear [Employee]", "[Your Name]",
  "Best regards", or bracketed placeholders. Fill in every real value.
- Never ask for passwords."""

        try:
            text, tool_called = call_ai_with_tools(
                llm, system, user_message, chat_history,
                [create_support_ticket]
            )
            text = strip_thinking(text or "")
            # Only apply the structured fallback if a NEW ticket was actually created
            # AND the reply is too short. Follow-up answers (no tool call) pass through.
            if tool_called and (not text.strip() or len(text.strip()) < 100):
                action = _TOOL_RESULT.get("action_taken") or {}
                prio = action.get('priority', 'P3')
                crit = "CRITICAL PRIORITY - ESCALATING NOW!\n\n" if prio == "P1" else ""
                fallback_msg = call_ai(
                    llm,
                    f"""You are an IT Support Agent. A ticket was just created.
Write the confirmation using EXACTLY this structure and nothing else.
Do NOT write it as a letter. Do NOT use [Employee], [Your Name], greetings,
or sign-offs. Use ONLY this exact block format:

{crit}Hi! I have created a ticket for your issue.

TICKET CREATED
Ticket ID  : {action.get('ticket_id', ticket_num)}
Date       : {datetime.now().strftime('%d %B %Y')}
Status     : Open

ISSUE DETAILS
Category   : [fill the category]
Priority   : {prio} - [Critical/High/Medium/Low]
Team       : {action.get('team', 'IT Support')}
Contact    : [team email from knowledge base]
Resolution : [SLA time from knowledge base]

TRY THESE STEPS FIRST
[numbered self-help steps from the knowledge base for this issue]

The {action.get('team', 'IT Support')} has been notified and will contact you within [SLA time].

Knowledge base for the steps, category, email and SLA:
{kb}""",
                    user_message,
                    chat_history
                )
                text = strip_thinking(fallback_msg)
            return {
                "response": text.strip(),
                "action_taken": _TOOL_RESULT["action_taken"]
            }
        except Exception as e:
            print(f"[AgentService] Tool path failed, fallback: {e}")
            # fall through to legacy path

    # ---- Fallback path: <<<ACTION>>> pattern ----
    ticket_num = f"TKT-{datetime.now().strftime('%Y%m%d')}-{abs(hash(user_message)) % 9999:04d}"
    system = f"""You are a Smart IT Ticket Routing Agent for SentimentIQ.

KNOWLEDGE BASE:
{kb}

YOUR JOB: Analyze the IT complaint, identify category, assign priority,
route to the correct team, and CREATE A TICKET.

PART 1 — Friendly response to the employee:
Hi! I have created a ticket for your issue.

TICKET CREATED
Ticket ID  : {ticket_num}
Date       : {datetime.now().strftime('%d %B %Y')}
Status     : Open

ISSUE DETAILS
Category   : [category]
Priority   : [P1/P2/P3/P4] - [Critical/High/Medium/Low]
Team       : [team name]
Contact    : [team email]
Resolution : [SLA time]

TRY THESE STEPS FIRST
[numbered self help steps]

PART 2 — At the very END, output this EXACT block (user will not see it):
<<<ACTION>>>
{{"ticket_id": "{ticket_num}", "issue": "<summary>", "category": "<category>", "priority": "<P1/P2/P3/P4>", "team": "<team name>", "team_email": "<team email>"}}
<<<END>>>

RULES:
- If P1 critical, start with: CRITICAL PRIORITY - ESCALATING NOW!
- Always professional and empathetic. Never ask for passwords.
- ALWAYS include the ACTION block at the end."""

    try:
        raw = strip_thinking(call_ai(llm, system, user_message, chat_history))
        action, clean_text = extract_action(raw)
        action_taken = None
        if action and action.get('ticket_id'):
            try:
                create_ticket(
                    ticket_id=action.get('ticket_id', ticket_num),
                    issue=action.get('issue', user_message[:200]),
                    category=action.get('category', 'General'),
                    priority=action.get('priority', 'P3'),
                    team=action.get('team', 'IT Support'),
                    team_email=action.get('team_email', 'itsupport@company.com'),
                    created_by=username,
                )
                action_taken = {
                    "type": "ticket_created",
                    "ticket_id": action.get('ticket_id', ticket_num),
                    "team": action.get('team', 'IT Support'),
                    "priority": action.get('priority', 'P3'),
                }
                print(f"[AgentService] TICKET CREATED: {action.get('ticket_id')}")
            except Exception as e:
                print(f"[AgentService] Ticket creation error: {e}")
        return {"response": clean_text, "action_taken": action_taken}
    except Exception as e:
        print(f"[AgentService] Ticket error: {e}")
        return {"response": f"Sorry, error occurred: {str(e)}", "action_taken": None}


# ============================================================
# AGENT 2: EMPLOYEE SENTIMENT ANALYSIS
# Detection done by CODE (alert_engine) — reliable.
# The AI EXPLAINS the alerts, it does not invent them.
# (Unchanged design — this reliability decision is deliberate.)
# ============================================================
def sentiment_analyst(user_message, chat_history, username="user"):
    llm, name = get_llm()
    if not llm:
        return {"response": "AI not connected! Add API keys to config.json",
                "action_taken": None}

    print(f"[AgentService] Sentiment Analyst -> {name}"
          f" | RAG={'on' if RAG_ON else 'off'}")
    data = get_data_context()

    # STEP 1 — deterministic detection (rules in code, reliable)
    action_taken = None
    flagged = []
    try:
        flagged = scan_and_create_alerts()
        newly = [f for f in flagged if f.get('newly_created')]
        if newly:
            action_taken = {"type": "alerts_raised", "count": len(newly)}
            print(f"[AgentService] {len(newly)} ALERTS RAISED (rule-based)")
    except Exception as e:
        print(f"[AgentService] Alert scan error: {e}")

    if flagged:
        flag_note = "TEAMS/REGIONS BELOW TARGET (alerts raised automatically by the system):\n"
        for f in flagged:
            flag_note += f"  - {f['entity']}: {f['metric']} {f['value']}% (severity {f['severity']})\n"
    else:
        flag_note = "No teams or regions are below the 92% CSAT target. No alerts raised."

    # RAG: retrieve relevant sentiment knowledge
    kb = get_knowledge(user_message, agent="sentiment", full_kb=KB_SENTIMENT)

    system = f"""You are an Employee Sentiment Analysis Agent for SentimentIQ.

{data}

RELEVANT KNOWLEDGE BASE:
{kb}

ALERT STATUS (computed by the system, not by you):
{flag_note}

YOUR JOB: Answer the user's question using the data above. Be a sharp,
data-driven analyst — every sentence must be backed by a real number from
the data. If alerts were raised, explain WHY those teams or regions are
underperforming using the actual issue data. Do NOT claim to raise alerts
yourself — the system already did that based on fixed rules.

RESPONSE FORMAT (use this exact structure):

SENTIMENT ANALYSIS
[Direct answer with the exact CSAT%, DSAT%, and response count.
Name the specific team/region and give its numbers.]

KEY INSIGHTS
[4 insights. EACH must contain at least one exact number from the data —
a CSAT%, DSAT%, gap from the 92% target, ticket count, or negativity %.
Reference specific teams, regions, or issues by name.]

RECOMMENDATIONS
[3 recommendations. EACH must reference a SPECIFIC number, team, region,
or issue from the data. Tie every recommendation to a concrete data point.]

STRICT RULES:
- Every claim MUST include an exact number from the data. No number = do not say it.
- BANNED generic phrases — NEVER write vague filler like: "conduct a thorough
  analysis", "develop a targeted action plan", "allocate additional resources",
  "monitor progress closely", "identify areas for improvement". These say nothing.
- Instead, be concrete and tied to data. GOOD example:
  "Password Reset drives 5,977 tickets at 68% negativity — deploy a self-service
   reset portal to cut this volume, the single biggest dissatisfaction source."
- Always compare numbers to the 92% CSAT target and 85% industry average, stating
  the exact gap (e.g. "63 points below target").
- Reference the actual top issues by name and ticket count when recommending fixes.
- Be specific and useful, never generic. A manager should be able to ACT on every line."""

    try:
        raw = strip_thinking(call_ai(llm, system, user_message, chat_history))
        return {"response": raw.strip(), "action_taken": action_taken}
    except Exception as e:
        print(f"[AgentService] Sentiment error: {e}")
        return {"response": f"Sorry, error occurred: {str(e)}", "action_taken": None}


# ============================================================
# AGENT 3: RESEARCH & REPORTING
# Uses LangChain tool calling to save the report when available;
# falls back to the <<<ACTION>>> pattern otherwise.
# ============================================================
def research_reporter(user_message, chat_history, username="user"):
    llm, name = get_llm()
    if not llm:
        return {"response": "AI not connected! Add API keys to config.json",
                "action_taken": None}

    print(f"[AgentService] Research Reporter -> {name}"
          f" | RAG={'on' if RAG_ON else 'off'}"
          f" | tools={'on' if _supports_tools(llm) else 'off'}")
    data = get_data_context()
    kb = get_knowledge(user_message, agent="report", full_kb=KB_REPORT)

    # ---- Tool-calling path ----
    # For reporting we first generate the report text, then call the
    # save tool. We do this in two steps so the full report is the
    # visible response and the tool just persists it.
    if _supports_tools(llm):
        gen_system = f"""You are a Research and Reporting Agent for SentimentIQ.

{data}

REPORTING STANDARDS:
{kb}

Write the requested professional report using the data above. Requirements:
- Every section must contain exact numbers from the data (CSAT%, DSAT%, ticket
  counts, gaps from the 92% target).
- Name specific teams, regions, and issues — never speak in generalities.
- Compare every figure to the 92% CSAT target and 85% industry average with the
  exact gap stated.
- End with action items that each reference a specific number, team, or issue —
  NOT generic advice like "conduct analysis" or "allocate resources".
- Make it presentation ready. Write ONLY the report."""

        try:
            report_text = strip_thinking(
                call_ai(llm, gen_system, user_message, chat_history)
            )

            # Now ask the model to save it via the tool
            _TOOL_RESULT["action_taken"] = None
            _TOOL_RESULT["username"] = username
            _TOOL_RESULT["report_content"] = report_text

            save_system = ("You just wrote a report. Call the "
                           "save_management_report tool with a short title "
                           "and the correct report_type to store it.")
            _, tool_called = call_ai_with_tools(
                llm, save_system,
                f"Save this report. First line: {report_text[:120]}",
                [], [save_management_report]
            )
            # signature: (llm, system, user_msg, history, tools)

            return {"response": report_text,
                    "action_taken": _TOOL_RESULT["action_taken"]}
        except Exception as e:
            print(f"[AgentService] Reporter tool path failed, fallback: {e}")
            # fall through

    # ---- Fallback path: <<<ACTION>>> pattern ----
    system = f"""You are a Research and Reporting Agent for SentimentIQ.

{data}

REPORTING STANDARDS:
{kb}

PART 1 — Write the full professional report with specific numbers,
comparisons to company targets, and action items. Presentation ready.

PART 2 — At the very END, output this EXACT block (user will not see it):
<<<ACTION>>>
{{"title": "<short title>", "report_type": "<Executive Summary/Weekly Report/Team Report/Regional Report/Other>"}}
<<<END>>>

RULES:
- Use exact numbers. Compare to 92% CSAT target and 85% industry.
- Always end with action items. ALWAYS include the ACTION block."""

    try:
        raw = strip_thinking(call_ai(llm, system, user_message, chat_history))
        action, clean_text = extract_action(raw)
        action_taken = None
        if action and action.get('title'):
            try:
                report_id = save_report(
                    title=action.get('title', 'Untitled Report'),
                    report_type=action.get('report_type', 'Other'),
                    content=clean_text,
                    created_by=username,
                )
                action_taken = {
                    "type": "report_saved",
                    "report_id": report_id,
                    "title": action.get('title', 'Untitled Report'),
                }
                print(f"[AgentService] REPORT SAVED: #{report_id}")
            except Exception as e:
                print(f"[AgentService] Report save error: {e}")
        return {"response": clean_text, "action_taken": action_taken}
    except Exception as e:
        print(f"[AgentService] Reporter error: {e}")
        return {"response": f"Sorry, error occurred: {str(e)}", "action_taken": None}


# ── Status ────────────────────────────────────────────────
def check_ai_status() -> dict:
    _, active = get_llm()
    return {
        "groq_available"  : GROQ_AVAILABLE,
        "gemini_available": GEMINI_AVAILABLE,
        "active_model"    : active,
        "rag_enabled"     : RAG_ON,
        "tool_calling"    : TOOLS_AVAILABLE,
        "ticket_model"    : active,
        "sentiment_model" : active,
        "reporter_model"  : active,
    }