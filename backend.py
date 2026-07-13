# ============================================================
# SENTIMENTIQ BACKEND — with TRUE AI AGENTS
# Agents create real tickets, alerts and reports
# Protected routes require a valid Bearer token
# ============================================================

import json

with open('config.json', 'r') as f:
    CONFIG = json.load(f)

print("\n" + "="*60)
print(f"   {CONFIG['app']['name']} BACKEND")
print(f"   {CONFIG['app']['company']} - v{CONFIG['app']['version']}")
print("="*60 + "\n")

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from services.db_service import (
    init_database, test_connection,
)
from services.auth_service import (
    authenticate_user, create_token, verify_token, revoke_token,
    get_users_list, register_user,
)
from services.data_service import (
    process_upload, get_metrics, get_data, get_status,
    get_uploads_history, get_effective_data,
    get_repetitive_issues,
)
from services.agent_service import (
    ticket_router, sentiment_analyst,
    research_reporter, check_ai_status,
)
from services.agent_db import (
    init_agent_tables,
    get_tickets, update_ticket_status, get_ticket_stats,
    get_alerts, resolve_alert,
    get_reports, get_report_content, delete_report,
)

app = FastAPI(
    title   = CONFIG['app']['name'],
    version = CONFIG['app']['version'],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = CONFIG['cors']['allow_origins'],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


@app.on_event("startup")
async def startup():
    print("[Backend] Starting up...")
    init_database()
    init_agent_tables()
    test_connection()
    print("[Backend] All systems ready!\n")


# ── Auth guard — used by every protected route ────────────
def require_auth(authorization: str = Header(None)):
    """
    Reads the 'Authorization: Bearer <token>' header,
    verifies it against the server-side token store,
    and returns the user info. Raises 401 if missing,
    malformed, or expired/invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or malformed Authorization header")
    token = authorization.replace("Bearer ", "", 1).strip()
    info = verify_token(token)
    if not info:
        raise HTTPException(401, "Invalid or expired token")
    return info


# ── Models ────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name    : str
    role    : str = 'Viewer'

class AgentRequest(BaseModel):
    message     : str
    chat_history: list = []
    username    : str = "user"

class TicketStatusRequest(BaseModel):
    ticket_id: str
    status   : str


# ── Auth endpoints (public — no token required yet) ───────
@app.post("/auth/login")
def login(req: LoginRequest):
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(401, "Invalid username or password")
    token = create_token(user)
    return {
        "success": True, "token": token,
        "user": {
            "username": user['username'],
            "name"    : user['name'],
            "role"    : user['role'],
        },
        "message": f"Welcome {user['name']}!"
    }

@app.post("/auth/register")
def register(req: RegisterRequest):
    success = register_user(req.username, req.password, req.name, req.role)
    if not success:
        raise HTTPException(400, "User already exists!")
    return {"success": True, "message": f"User {req.username} created!"}

@app.get("/auth/users")
def list_users(auth=Depends(require_auth)):
    return {"users": get_users_list()}

@app.post("/auth/logout")
def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        revoke_token(authorization.replace("Bearer ", "", 1).strip())
    return {"success": True}


# ── Data endpoints (protected) ─────────────────────────────
@app.post("/data/upload")
async def upload(file: UploadFile = File(...), username: str = "unknown",
                  auth=Depends(require_auth)):
    try:
        contents = await file.read()
        return process_upload(contents=contents, filename=file.filename,
                              uploaded_by=username)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        print(f"[Backend] Upload error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(500, str(e))

@app.get("/data/metrics")
def metrics(auth=Depends(require_auth)):
    try:
        return get_metrics()
    except Exception as e:
        print(f"[Backend] Metrics error: {e}")
        return {"total": 0, "csat_pct": 0, "dsat_pct": 0, "neutral_pct": 0}

@app.get("/data/rows")
def rows(limit: int = 5000, upload_id: Optional[str] = None,
         auth=Depends(require_auth)):
    try:
        return get_data(limit, upload_id)
    except Exception:
        return {"rows": [], "total": 0}

@app.get("/data/uploads")
def uploads(auth=Depends(require_auth)):
    try:
        history = get_uploads_history()
        return {"uploads": history, "total": len(history)}
    except Exception:
        return {"uploads": [], "total": 0}

@app.get("/data/status")
def data_status(auth=Depends(require_auth)):
    try:
        return get_status()
    except Exception:
        return {"data_loaded": False, "data_rows": 0}

@app.get("/data/effective")
def effective_data(limit: int = 99999, auth=Depends(require_auth)):
    try:
        return get_effective_data(limit)
    except Exception as e:
        print(f"[Backend] Effective error: {e}")
        return {"rows": [], "total": 0}

@app.get("/data/repetitive")
def repetitive_issues(auth=Depends(require_auth)):
    try:
        return get_repetitive_issues()
    except Exception as e:
        print(f"[Backend] Repetitive error: {e}")
        return {"issues": [], "total": 0}


# ── AI Agent endpoints (protected) ─────────────────────────
@app.get("/agent/status")
def agent_status(auth=Depends(require_auth)):
    return check_ai_status()

@app.post("/agent/ticket")
def ticket_agent(req: AgentRequest, auth=Depends(require_auth)):
    try:
        result = ticket_router(req.message, req.chat_history, req.username)
        return {
            "response"    : result["response"],
            "action_taken": result["action_taken"],
            "agent"       : "Smart Ticket Routing Agent",
        }
    except Exception as e:
        print(f"[Backend] Ticket agent error: {e}")
        raise HTTPException(500, str(e))

@app.post("/agent/sentiment")
def sentiment_agent(req: AgentRequest, auth=Depends(require_auth)):
    try:
        result = sentiment_analyst(req.message, req.chat_history, req.username)
        return {
            "response"    : result["response"],
            "action_taken": result["action_taken"],
            "agent"       : "Employee Sentiment Analysis Agent",
        }
    except Exception as e:
        print(f"[Backend] Sentiment agent error: {e}")
        raise HTTPException(500, str(e))

@app.post("/agent/report")
def report_agent(req: AgentRequest, auth=Depends(require_auth)):
    try:
        result = research_reporter(req.message, req.chat_history, req.username)
        return {
            "response"    : result["response"],
            "action_taken": result["action_taken"],
            "agent"       : "Research and Reporting Agent",
        }
    except Exception as e:
        print(f"[Backend] Report agent error: {e}")
        raise HTTPException(500, str(e))


# ── Operations endpoints (protected) ───────────────────────
@app.get("/tickets")
def tickets_list(auth=Depends(require_auth)):
    return {"tickets": get_tickets(), "stats": get_ticket_stats()}

@app.post("/tickets/status")
def tickets_update(req: TicketStatusRequest, auth=Depends(require_auth)):
    update_ticket_status(req.ticket_id, req.status)
    return {"success": True}

@app.get("/alerts")
def alerts_list(auth=Depends(require_auth)):
    return {"alerts": get_alerts()}

@app.post("/alerts/resolve/{alert_id}")
def alerts_resolve(alert_id: int, auth=Depends(require_auth)):
    resolve_alert(alert_id)
    return {"success": True}

@app.get("/reports")
def reports_list(auth=Depends(require_auth)):
    return {"reports": get_reports()}

@app.get("/reports/{report_id}")
def report_get(report_id: int, auth=Depends(require_auth)):
    r = get_report_content(report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    return r

@app.delete("/reports/{report_id}")
def report_delete(report_id: int, auth=Depends(require_auth)):
    delete_report(report_id)
    return {"success": True}


# ── System (public) ────────────────────────────────────────
@app.get("/health")
def health():
    try:
        ai = check_ai_status()
        data = get_status()
        return {
            "status": "running",
            "app": CONFIG['app']['name'],
            "data_loaded": data['data_loaded'],
            "data_rows": data['data_rows'],
            "groq": ai['groq_available'],
            "gemini": ai['gemini_available'],
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/")
def root():
    return {"message": f"{CONFIG['app']['name']} running!",
            "docs": "http://localhost:8000/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend:app",
        host   = CONFIG['server']['host'],
        port   = CONFIG['server']['port'],
        reload = False,   # Fixed: False prevents the double-startup race
                          # condition that caused "Cannot connect" on first login
    )