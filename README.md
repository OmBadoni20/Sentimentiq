# ============================================================
# SENTIMENTIQ BACKEND — SQLite Version
# NTT Data — Complete Backend
# ============================================================

import json
import os
import sqlite3

# ── Load config first ─────────────────────────────────────
with open('config.json', 'r') as f:
    CONFIG = json.load(f)

print("\n" + "="*60)
print(f"   {CONFIG['app']['name']} BACKEND")
print(f"   {CONFIG['app']['company']} "
      f"· v{CONFIG['app']['version']}")
print("="*60 + "\n")

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# ── Import microservices ──────────────────────────────────
from services.db_service import (
    init_database,
    test_connection,
    get_latest_upload_id,
    get_upload_rows,
    get_all_uploads,
)
from services.auth_service import (
    authenticate_user,
    create_token,
    get_users_list,
    register_user,
)
from services.data_service import (
    process_upload,
    get_metrics,
    get_data,
    get_status,
    get_uploads_history,
)

# ── Create FastAPI app ────────────────────────────────────
app = FastAPI(
    title   = CONFIG['app']['name'],
    version = CONFIG['app']['version'],
)

# ── CORS from config ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins = CONFIG['cors']['allow_origins'],
    allow_methods = ["*"],
    allow_headers = ["*"],
)


# ============================================================
# STARTUP
# ============================================================
@app.on_event("startup")
async def startup():
    print("[Backend] Starting up...")
    init_database()
    test_connection()
    print("[Backend] All systems ready!\n")


# ============================================================
# AUTH ENDPOINTS
# ============================================================

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name    : str
    role    : str = 'Viewer'


@app.post("/auth/login")
def login(req: LoginRequest):
    """
    Login with username and password
    Reads from SQLite users table!
    """
    user = authenticate_user(
        req.username,
        req.password
    )

    if not user:
        raise HTTPException(
            status_code = 401,
            detail      = "Invalid username or password"
        )

    token = create_token(user)

    return {
        "success": True,
        "token"  : token,
        "user"   : {
            "username": user['username'],
            "name"    : user['name'],
            "role"    : user['role'],
        },
        "message": f"Welcome {user['name']}!"
    }


@app.post("/auth/register")
def register(req: RegisterRequest):
    """
    Add new user to database
    """
    success = register_user(
        req.username,
        req.password,
        req.name,
        req.role,
    )

    if not success:
        raise HTTPException(
            status_code = 400,
            detail      = "User already exists!"
        )

    return {
        "success": True,
        "message": f"User {req.username} created!"
    }


@app.get("/auth/users")
def list_users():
    """
    Get all users (no passwords)
    """
    return {"users": get_users_list()}


# ============================================================
# DATA ENDPOINTS
# ============================================================

@app.post("/data/upload")
async def upload(
    file    : UploadFile = File(...),
    username: str = "unknown",
):
    """
    Upload CSV/Excel/JSON file
    Saves all rows to SQLite database!
    """
    try:
        contents = await file.read()
        result   = process_upload(
            contents    = contents,
            filename    = file.filename,
            uploaded_by = username,
        )
        return result

    except ValueError as e:
        raise HTTPException(
            status_code = 400,
            detail      = str(e)
        )
    except Exception as e:
        print(f"[Backend] Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code = 500,
            detail      = str(e)
        )


@app.get("/data/metrics")
def metrics():
    """
    Get CSAT%, DSAT%, Neutral%
    Calculated from in-memory DataFrame
    Fast and accurate!
    """
    try:
        return get_metrics()
    except Exception as e:
        print(f"[Backend] Metrics error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "total"      : 0,
            "csat_pct"   : 0,
            "dsat_pct"   : 0,
            "neutral_pct": 0,
            "error"      : str(e),
        }


@app.get("/data/rows")
def rows(
    limit    : int = 5000,
    upload_id: Optional[str] = None,
):
    """
    Get data rows from memory
    Returns all rows (up to limit)
    Fast — reads from in-memory DataFrame!
    """
    try:
        result = get_data(limit, upload_id)
        print(f"[Backend] Returning "
              f"{len(result.get('rows', []))} rows")
        return result

    except Exception as e:
        print(f"[Backend] Rows error: {e}")
        import traceback
        traceback.print_exc()
        return {"rows": [], "total": 0}


@app.get("/data/uploads")
def uploads():
    """
    Get history of all uploaded files
    from SQLite database
    """
    try:
        history = get_uploads_history()
        return {
            "uploads": history,
            "total"  : len(history),
        }
    except Exception as e:
        print(f"[Backend] Uploads error: {e}")
        return {"uploads": [], "total": 0}


@app.get("/data/status")
def data_status():
    """
    Check current data status
    """
    try:
        return get_status()
    except Exception as e:
        return {
            "data_loaded": False,
            "data_rows"  : 0,
            "error"      : str(e),
        }


# ============================================================
# SYSTEM ENDPOINTS
# ============================================================

@app.get("/health")
def health():
    """
    System health check
    """
    try:
        db_ok = test_connection()
        data  = get_status()
        return {
            "status"    : "running",
            "app"       : CONFIG['app']['name'],
            "version"   : CONFIG['app']['version'],
            "company"   : CONFIG['app']['company'],
            "database"  : "SQLite — sentimentiq.db",
            "db_ok"     : db_ok,
            "data_loaded": data['data_loaded'],
            "data_rows" : data['data_rows'],
        }
    except Exception as e:
        return {
            "status": "error",
            "error" : str(e),
        }


@app.get("/")
def root():
    """
    Root endpoint — confirms API is running
    """
    return {
        "message": f"{CONFIG['app']['name']} "
                   f"API is running!",
        "company": CONFIG['app']['company'],
        "version": CONFIG['app']['version'],
        "docs"   : "http://localhost:8000/docs",
    }


# ============================================================
# RUN SERVER
# ============================================================
if __name__ == "__main__":
    import uvicorn

    host   = CONFIG['server']['host']
    port   = CONFIG['server']['port']
    reload = CONFIG['server']['reload']

    print(f"Starting server at "
          f"http://localhost:{port}")
    print(f"API docs at "
          f"http://localhost:{port}/docs\n")

    uvicorn.run(
        "backend:app",
        host   = host,
        port   = port,
        reload = reload,
    )