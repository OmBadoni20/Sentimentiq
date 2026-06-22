# ============================================================
# SENTIMENTIQ BACKEND — SQLite Version
# ============================================================

import json
import os
import sqlite3

with open('config.json', 'r') as f:
    CONFIG = json.load(f)

print("\n" + "="*60)
print(f"   {CONFIG['app']['name']} BACKEND")
print(f"   {CONFIG['app']['company']} "
      f"· v{CONFIG['app']['version']}")
print("="*60 + "\n")

from fastapi import (
    FastAPI, UploadFile,
    File, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

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
    get_status,
    get_uploads_history,
)

app = FastAPI(
    title   = CONFIG['app']['name'],
    version = CONFIG['app']['version'],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = CONFIG['cors']['allow_origins'],
    allow_methods = ["*"],
    allow_headers = ["*"],
)


@app.on_event("startup")
async def startup():
    print("[Backend] Starting up...")
    init_database()
    test_connection()
    print("[Backend] Ready!\n")


# ── Auth ──────────────────────────────────────────────────
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
    user = authenticate_user(
        req.username, req.password)

    if not user:
        raise HTTPException(
            status_code = 401,
            detail = "Invalid username or password"
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
    success = register_user(
        req.username, req.password,
        req.name, req.role
    )
    if not success:
        raise HTTPException(
            400, "User already exists!")
    return {
        "success": True,
        "message": f"User {req.username} created!"
    }


@app.get("/auth/users")
def list_users():
    return {"users": get_users_list()}


# ── Data ──────────────────────────────────────────────────
@app.post("/data/upload")
async def upload(
    file    : UploadFile = File(...),
    username: str = "unknown"
):
    try:
        contents = await file.read()
        result   = process_upload(
            contents    = contents,
            filename    = file.filename,
            uploaded_by = username,
        )
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/data/metrics")
def metrics():
    try:
        return get_metrics()
    except Exception as e:
        print(f"[Backend] metrics error: {e}")
        return {"total": 0, "error": str(e)}


@app.get("/data/rows")
def rows(limit: int = 200,
         upload_id: str = None):
    """
    Reads rows directly from SQLite database
    Much more reliable!
    """
    try:
        # Get upload_id to use
        target_id = upload_id or \
                    get_latest_upload_id()

        if not target_id:
            return {"rows": [], "total": 0}

        # Read directly from SQLite file
        db_path = os.path.join(
            os.path.dirname(__file__),
            CONFIG['database']['path']
        )
        conn   = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get rows
        cursor.execute("""
            SELECT row_data
            FROM   feedback_data
            WHERE  upload_id = ?
            LIMIT  ?
        """, (target_id, limit))
        results = cursor.fetchall()

        # Get total count
        cursor.execute("""
            SELECT COUNT(*)
            FROM   feedback_data
            WHERE  upload_id = ?
        """, (target_id,))
        total = cursor.fetchone()[0]

        conn.close()

        # Parse JSON rows safely
        parsed = []
        for r in results:
            try:
                parsed.append(
                    json.loads(r['row_data'])
                )
            except Exception as e:
                print(f"Row parse error: {e}")
                continue

        print(f"[Backend] Returning "
              f"{len(parsed)} rows from DB")

        return {
            "rows"     : parsed,
            "total"    : total,
            "upload_id": target_id,
        }

    except Exception as e:
        print(f"[Backend] rows error: {e}")
        import traceback
        traceback.print_exc()
        return {"rows": [], "total": 0}


@app.get("/data/uploads")
def uploads():
    history = get_uploads_history()
    return {
        "uploads": history,
        "total"  : len(history),
    }


@app.get("/data/status")
def data_status():
    return get_status()


# ── System ────────────────────────────────────────────────
@app.get("/health")
def health():
    db_ok = test_connection()
    data  = get_status()
    return {
        "status"    : "running",
        "app"       : CONFIG['app']['name'],
        "version"   : CONFIG['app']['version'],
        "database"  : "SQLite sentimentiq.db",
        "db_ok"     : db_ok,
        "data_rows" : data['data_rows'],
    }


@app.get("/")
def root():
    return {
        "message": f"{CONFIG['app']['name']} "
                   f"API running!",
        "docs"   : "http://localhost:8000/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend:app",
        host   = CONFIG['server']['host'],
        port   = CONFIG['server']['port'],
        reload = CONFIG['server']['reload'],
    )