# ============================================================
# AI AGENT SERVICE — TRUE AGENTS (not just chatbots!)
#   Ticket Router    -> CREATES tickets in database
#   Sentiment Analyst-> RAISES alerts (rule-based, reliable)
#   Research Reporter-> SAVES reports to database
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


def load_config():
    with open('config.json', 'r') as f:
        return json.load(f)


CONFIG = load_config()
AI_CFG = CONFIG.get('ai', {})

print("[AgentService] Loading AI agents...")


# ── Load knowledge base ───────────────────────────────────
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


# ── Initialize Groq ───────────────────────────────────────
GROQ_AVAILABLE = False
groq_llm       = None
try:
    from langchain_groq import ChatGroq
    groq_key = AI_CFG.get('groq_api_key', '')
    if groq_key and 'PASTE' not in groq_key and groq_key != '':
        groq_llm = ChatGroq(
            api_key     = groq_key,
            model_name  = AI_CFG.get('groq_model', 'openai/gpt-oss-120b'),
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


# ── Helper: extract JSON action block from AI response ────
def extract_action(text: str):
    match = re.search(r'<<<ACTION>>>(.*?)<<<END>>>', text, re.DOTALL)
    if not match:
        return None, text
    raw = match.group(1).strip()
    raw = re.sub(r'^```(json)?', '', raw).strip()
    raw = re.sub(r'```$', '', raw).strip()
    clean_text = re.sub(r'<<<ACTION>>>.*?<<<END>>>', '', text, flags=re.DOTALL).strip()
    try:
        action = json.loads(raw)
        return action, clean_text
    except Exception as e:
        print(f"[AgentService] Action parse failed: {e}")
        return None, clean_text


# ── Helper: remove model "thinking" text ──────────────────
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

NTT TARGET: CSAT 92% | DSAT below 4% | Industry avg 85%
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


# ── Core AI call ──────────────────────────────────────────
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


# ============================================================
# AGENT 1: SMART TICKET ROUTING — creates REAL tickets
# ============================================================
def ticket_router(user_message, chat_history, username="user"):
    llm, name = get_llm()
    if not llm:
        return {"response": "AI not connected! Add API keys to config.json",
                "action_taken": None}

    print(f"[AgentService] Ticket Router -> {name}")
    ticket_num = f"NTT-{datetime.now().strftime('%Y%m%d')}-{abs(hash(user_message)) % 9999:04d}"

    system = f"""You are a Smart IT Ticket Routing Agent for NTT Data SentimentIQ.

KNOWLEDGE BASE:
{KB_TICKET}

YOUR JOB: Analyze the IT complaint, identify category, assign priority,
route to the correct team, and CREATE A TICKET.

You MUST do two things in your response:

PART 1 — Friendly response to the employee in this format:
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

The [team] has been notified and will contact you within [SLA].

PART 2 — At the very END, output this EXACT machine-readable block
(this is how the system creates the real ticket, the user will not see it):
<<<ACTION>>>
{{"ticket_id": "{ticket_num}", "issue": "<short summary of the issue>", "category": "<category>", "priority": "<P1/P2/P3/P4>", "team": "<team name>", "team_email": "<team email>"}}
<<<END>>>

RULES:
- If P1 critical, start with: CRITICAL PRIORITY - ESCALATING NOW!
- Always be professional and empathetic
- Never ask for passwords
- ALWAYS include the ACTION block at the end"""

    try:
        raw = call_ai(llm, system, user_message, chat_history)
        raw = strip_thinking(raw)
        action, clean_text = extract_action(raw)

        action_taken = None
        if action and action.get('ticket_id'):
            try:
                create_ticket(
                    ticket_id  = action.get('ticket_id', ticket_num),
                    issue      = action.get('issue', user_message[:200]),
                    category   = action.get('category', 'General'),
                    priority   = action.get('priority', 'P3'),
                    team       = action.get('team', 'IT Support'),
                    team_email = action.get('team_email', 'itsupport@nttdata.com'),
                    created_by = username,
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
# ============================================================
def sentiment_analyst(user_message, chat_history, username="user"):
    llm, name = get_llm()
    if not llm:
        return {"response": "AI not connected! Add API keys to config.json",
                "action_taken": None}

    print(f"[AgentService] Sentiment Analyst -> {name}")
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

    # Build a note so the AI can explain the real alerts
    if flagged:
        flag_note = "TEAMS/REGIONS BELOW TARGET (alerts raised automatically by the system):\n"
        for f in flagged:
            flag_note += f"  - {f['entity']}: {f['metric']} {f['value']}% (severity {f['severity']})\n"
    else:
        flag_note = "No teams or regions are below the 92% CSAT target. No alerts raised."

    system = f"""You are an Employee Sentiment Analysis Agent for NTT Data SentimentIQ.

{data}

KNOWLEDGE BASE:
{KB_SENTIMENT}

ALERT STATUS (computed by the system, not by you):
{flag_note}

YOUR JOB: Answer the user's question using the data above with specific numbers,
insights, and recommendations. If alerts were raised, EXPLAIN why those teams or
regions are underperforming and what should be done. Do NOT claim to raise alerts
yourself — the system already did that based on fixed rules.

RESPONSE FORMAT:
SENTIMENT ANALYSIS

[Direct answer to the question with exact numbers]

KEY INSIGHTS
[3-4 insights with specific numbers]

RECOMMENDATIONS
[3 specific actionable steps]

RULES:
- Always use exact numbers from the data
- Compare to NTT target 92% CSAT and industry 85%
- Be specific, never generic"""

    try:
        raw = call_ai(llm, system, user_message, chat_history)
        raw = strip_thinking(raw)
        return {"response": raw.strip(), "action_taken": action_taken}
    except Exception as e:
        print(f"[AgentService] Sentiment error: {e}")
        return {"response": f"Sorry, error occurred: {str(e)}", "action_taken": None}


# ============================================================
# AGENT 3: RESEARCH & REPORTING — saves REAL reports
# ============================================================
def research_reporter(user_message, chat_history, username="user"):
    llm, name = get_llm()
    if not llm:
        return {"response": "AI not connected! Add API keys to config.json",
                "action_taken": None}

    print(f"[AgentService] Research Reporter -> {name}")
    data = get_data_context()

    system = f"""You are a Research and Reporting Agent for NTT Data SentimentIQ.

{data}

REPORTING STANDARDS:
{KB_REPORT}

YOUR JOB: Generate the requested professional report using the data above,
then SAVE it so it can be reopened later.

PART 1 — Write the full professional report (executive summary, weekly report,
team report, etc.) with specific numbers, comparisons to NTT targets, and
clear action items. Make it presentation ready.

PART 2 — At the very END, output this EXACT machine-readable block so the
system can save the report (user will not see it):
<<<ACTION>>>
{{"title": "<short report title>", "report_type": "<Executive Summary/Weekly Report/Team Report/Regional Report/Other>"}}
<<<END>>>

RULES:
- Use exact numbers from the data
- Compare to NTT target 92% CSAT and industry 85%
- Always end the report with action items
- ALWAYS include the ACTION block at the end"""

    try:
        raw = call_ai(llm, system, user_message, chat_history)
        raw = strip_thinking(raw)
        action, clean_text = extract_action(raw)

        action_taken = None
        if action and action.get('title'):
            try:
                report_id = save_report(
                    title       = action.get('title', 'Untitled Report'),
                    report_type = action.get('report_type', 'Other'),
                    content     = clean_text,
                    created_by  = username,
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
        "ticket_model"    : active,
        "sentiment_model" : active,
        "reporter_model"  : active,
    }