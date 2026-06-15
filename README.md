{
  "app": {
    "name": "SentimentIQ",
    "version": "1.0.0",
    "company": "NTT Data"
  },

  "server": {
    "host": "0.0.0.0",
    "port": 8000,
    "reload": true
  },

  "cors": {
    "allow_origins": [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000"
    ]
  },

  "auth": {
    "secret_key": "sentimentiq_ntt_secret_2026",
    "token_expire_minutes": 480
  },

  "users": [
    {
      "username": "om.badoni",
      "password": "NTT@2026",
      "role": "Developer",
      "name": "Om Badoni"
    },
    {
      "username": "manager",
      "password": "Manager@2026",
      "role": "Manager",
      "name": "NTT Manager"
    },
    {
      "username": "admin",
      "password": "Admin@2026",
      "role": "Admin",
      "name": "Admin User"
    }
  ]
}






# ============================================================
# AUTH MICROSERVICE
# Handles login, token creation, user verification
# Reads credentials from config.json
# ============================================================

import json
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional

# ── Load config ───────────────────────────────────────────
def load_config() -> dict:
    config_path = os.path.join(
        os.path.dirname(__file__), '..', 'config.json'
    )
    with open(config_path, 'r') as f:
        return json.load(f)

CONFIG = load_config()
USERS  = CONFIG['users']
AUTH   = CONFIG['auth']

print(f"[AuthService] Loaded {len(USERS)} users from config.json")


# ── Find user from config ─────────────────────────────────
def get_user(username: str) -> Optional[dict]:
    """
    Fetches user from config.json by username
    Returns user dict or None if not found
    """
    for user in USERS:
        if user['username'].lower() == username.lower():
            return user
    return None


# ── Verify password ───────────────────────────────────────
def verify_password(plain_password: str,
                    stored_password: str) -> bool:
    """
    Compares entered password with stored password
    Currently plain text — can upgrade to hashing later
    """
    return plain_password == stored_password


# ── Authenticate user ─────────────────────────────────────
def authenticate_user(username: str,
                      password: str) -> Optional[dict]:
    """
    Main authentication function:
    1. Fetch user from config
    2. Verify password
    3. Return user if valid, None if invalid
    """
    print(f"[AuthService] Login attempt: {username}")

    user = get_user(username)
    if not user:
        print(f"[AuthService] User not found: {username}")
        return None

    if not verify_password(password, user['password']):
        print(f"[AuthService] Wrong password: {username}")
        return None

    print(f"[AuthService] Login success: {username} ({user['role']})")
    return user


# ── Create simple token ───────────────────────────────────
def create_token(user: dict) -> str:
    """
    Creates a simple session token
    Contains: username + role + timestamp
    """
    data = f"{user['username']}:{user['role']}:{datetime.now()}"
    token = hashlib.sha256(data.encode()).hexdigest()
    return token


# ── Get all users (for admin) ─────────────────────────────
def get_all_users() -> list:
    """
    Returns all users without passwords
    """
    return [
        {
            "username": u['username'],
            "name"    : u['name'],
            "role"    : u['role'],
        }
        for u in USERS
    ]






    # ============================================================
# DATA MICROSERVICE
# Handles file upload, metrics calculation, data retrieval
# ============================================================

import io
import pandas as pd
from typing import Optional

print("[DataService] Data microservice loaded")

# ── Global data store ─────────────────────────────────────
current_df = pd.DataFrame()


# ── Helper — is true ──────────────────────────────────────
def is_true(val) -> bool:
    """Check if a value means YES/TRUE/1"""
    if pd.isna(val):
        return False
    return val == 1 or val == True or \
        str(val).strip().lower() in ['1', 'true', 'yes']


# ── Helper — find column ──────────────────────────────────
def find_col(df: pd.DataFrame, *names) -> Optional[str]:
    """
    Find column by name ignoring case and spaces
    Tries multiple name variations
    """
    cols = [c.strip().lower().replace(' ', '')
            for c in df.columns]
    for n in names:
        n_clean = n.lower().replace(' ', '')
        for i, c in enumerate(cols):
            if c == n_clean:
                return df.columns[i]
    return None


# ── Upload file ───────────────────────────────────────────
def process_upload(contents: bytes, filename: str) -> dict:
    """
    Reads uploaded file into DataFrame
    Supports CSV, Excel, JSON
    """
    global current_df
    name = filename.lower()

    if name.endswith('.csv'):
        current_df = pd.read_csv(io.BytesIO(contents))
    elif name.endswith(('.xlsx', '.xls')):
        current_df = pd.read_excel(io.BytesIO(contents))
    elif name.endswith('.json'):
        current_df = pd.read_json(io.BytesIO(contents))
    else:
        raise ValueError(
            f"Unsupported file type: {filename}. "
            "Use CSV, Excel or JSON."
        )

    current_df = current_df.fillna('')

    print(f"[DataService] Loaded {len(current_df)} rows "
          f"from {filename}")

    return {
        "message" : f"Uploaded {len(current_df)} rows",
        "rows"    : len(current_df),
        "columns" : list(current_df.columns),
        "filename": filename,
    }


# ── Calculate metrics ─────────────────────────────────────
def get_metrics() -> dict:
    """
    Calculates CSAT%, DSAT%, Neutral%
    + team and region breakdown
    """
    global current_df

    if current_df.empty:
        return {"message": "No data uploaded yet.", "total": 0}

    df    = current_df
    total = len(df)

    # Find relevant columns
    csat_col   = find_col(df, 'ISHAPPY', 'CSAT')
    dsat_col   = find_col(df, 'ISSAD',   'DSAT')
    pass_col   = find_col(df, 'ISPASSIVE')
    sent_col   = find_col(df, 'Predicted_Sentiment', 'Sentiment')
    team_col   = find_col(df, 'TEAM',   'Department')
    region_col = find_col(df, 'REGION', 'Industry')

    # Count
    csat_n = sum(1 for v in df[csat_col] if is_true(v)) \
             if csat_col else 0
    dsat_n = sum(1 for v in df[dsat_col] if is_true(v)) \
             if dsat_col else 0
    neu_n  = sum(1 for v in df[pass_col] if is_true(v)) \
             if pass_col else 0

    if sent_col:
        pos_n = sum(1 for v in df[sent_col]
                    if str(v).strip().lower() == 'positive')
        neg_n = sum(1 for v in df[sent_col]
                    if str(v).strip().lower() == 'negative')
        neu_n = sum(1 for v in df[sent_col]
                    if str(v).strip().lower() == 'neutral')
    else:
        pos_n, neg_n = csat_n, dsat_n

    pct = lambda n: round(n / total * 100, 1) if total else 0

    result = {
        "total"      : total,
        "csat_pct"   : pct(csat_n),
        "dsat_pct"   : pct(dsat_n),
        "neutral_pct": pct(neu_n),
        "csat_n"     : csat_n,
        "dsat_n"     : dsat_n,
        "neutral_n"  : neu_n,
        "pos_n"      : pos_n,
        "neg_n"      : neg_n,
    }

    # Team breakdown
    if team_col and csat_col:
        stats = {}
        for _, row in df.iterrows():
            k = str(row[team_col]).strip()
            if not k or k == 'nan':
                continue
            if k not in stats:
                stats[k] = {'csat':0, 'dsat':0, 'total':0}
            stats[k]['total'] += 1
            if is_true(row[csat_col]):
                stats[k]['csat'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[k]['dsat'] += 1

        result['team_breakdown'] = {
            t: {
                'csat_pct': round(
                    v['csat']/v['total']*100, 1
                ) if v['total'] else 0,
                'dsat_pct': round(
                    v['dsat']/v['total']*100, 1
                ) if v['total'] else 0,
                'total': v['total'],
            }
            for t, v in stats.items()
        }

    # Region breakdown
    if region_col and csat_col:
        stats = {}
        for _, row in df.iterrows():
            k = str(row[region_col]).strip()
            if not k or k == 'nan':
                continue
            if k not in stats:
                stats[k] = {'csat':0, 'dsat':0, 'total':0}
            stats[k]['total'] += 1
            if is_true(row[csat_col]):
                stats[k]['csat'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[k]['dsat'] += 1

        result['region_breakdown'] = {
            r: {
                'csat_pct': round(
                    v['csat']/v['total']*100, 1
                ) if v['total'] else 0,
                'dsat_pct': round(
                    v['dsat']/v['total']*100, 1
                ) if v['total'] else 0,
                'total': v['total'],
            }
            for r, v in stats.items()
        }

    return result


# ── Get data rows ─────────────────────────────────────────
def get_data(limit: int = 200) -> dict:
    """Returns rows from uploaded data"""
    global current_df

    if current_df.empty:
        return {"rows": [], "total": 0}

    return {
        "rows"   : current_df.head(limit).to_dict(
            orient='records'
        ),
        "total"  : len(current_df),
        "columns": list(current_df.columns),
    }


# ── Get status ────────────────────────────────────────────
def get_status() -> dict:
    return {
        "data_loaded": not current_df.empty,
        "data_rows"  : len(current_df),
        "columns"    : list(current_df.columns)
                       if not current_df.empty else [],
    }









    
  # ============================================================
# SENTIMENTIQ — Main Backend
# Connects all microservices
# Config driven — reads from config.json
# ============================================================

import json
import os

# ── Load config first ─────────────────────────────────────
with open('config.json', 'r') as f:
    CONFIG = json.load(f)

print("\n" + "="*60)
print(f"   {CONFIG['app']['name']} BACKEND")
print(f"   {CONFIG['app']['company']} · v{CONFIG['app']['version']}")
print("="*60 + "\n")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Import microservices ──────────────────────────────────
from services.auth_service import (
    authenticate_user,
    create_token,
    get_all_users,
)
from services.data_service import (
    process_upload,
    get_metrics,
    get_data,
    get_status,
)

# ── Create FastAPI app ────────────────────────────────────
app = FastAPI(
    title=CONFIG['app']['name'],
    version=CONFIG['app']['version'],
)

# ── CORS from config ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CONFIG['cors']['allow_origins'],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTH ROUTES — /auth/...
# ============================================================

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/login")
def login(req: LoginRequest):
    """
    Login endpoint
    1. Takes username + password from frontend
    2. Calls auth_service.authenticate_user()
    3. auth_service reads credentials from config.json
    4. Returns user info + token if valid
    5. Returns 401 error if invalid
    """
    user = authenticate_user(req.username, req.password)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_token(user)

    return {
        "success" : True,
        "token"   : token,
        "user"    : {
            "username": user['username'],
            "name"    : user['name'],
            "role"    : user['role'],
        },
        "message" : f"Welcome {user['name']}!"
    }


@app.get("/auth/users")
def list_users():
    """
    Returns all users (without passwords)
    Admin only — for demo purposes
    """
    return {"users": get_all_users()}


# ============================================================
# DATA ROUTES — /data/...
# ============================================================

@app.post("/data/upload")
async def upload(file: UploadFile = File(...)):
    """
    Upload CSV/Excel/JSON file
    Calls data_service.process_upload()
    """
    try:
        contents = await file.read()
        result   = process_upload(contents, file.filename)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/data/metrics")
def metrics():
    """
    Get CSAT%, DSAT%, Neutral%
    Calls data_service.get_metrics()
    """
    return get_metrics()


@app.get("/data/rows")
def rows(limit: int = 200):
    """
    Get data rows
    Calls data_service.get_data()
    """
    return get_data(limit)


@app.get("/data/status")
def data_status():
    """
    Check if data is loaded
    """
    return get_status()


# ============================================================
# HEALTH — /health
# ============================================================

@app.get("/health")
def health():
    """Overall system health"""
    data_st = get_status()
    return {
        "status"     : "running",
        "app"        : CONFIG['app']['name'],
        "version"    : CONFIG['app']['version'],
        "data_loaded": data_st['data_loaded'],
        "data_rows"  : data_st['data_rows'],
    }


@app.get("/")
def root():
    return {
        "message": f"{CONFIG['app']['name']} API is running!",
        "version": CONFIG['app']['version'],
        "docs"   : "http://localhost:8000/docs",
    }


# ============================================================
# RUN SERVER — from config
# ============================================================
if __name__ == "__main__":
    import uvicorn

    host   = CONFIG['server']['host']
    port   = CONFIG['server']['port']
    reload = CONFIG['server']['reload']

    print(f"Starting server at http://localhost:{port}")
    print(f"API docs at http://localhost:{port}/docs\n")

    uvicorn.run(
        "backend:app",
        host=host,
        port=port,
        reload=reload,
    )








    import { useState } from 'react'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', red:'#f85149', violet:'#bc8cff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

const API = 'http://localhost:8000'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!username.trim()) {
      setError('Please enter your username')
      return
    }
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setLoading(true)

    try {
      // ── Call backend /auth/login API ─────────────────
      const response = await fetch(`${API}/auth/login`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Backend returned 401 — wrong credentials
        setError(data.detail || 'Invalid username or password')
        setLoading(false)
        return
      }

      // ── Login success ────────────────────────────────
      // Save token for future API calls
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Pass user to App.jsx
      onLogin(data.user)

    } catch (err) {
      // Backend not running
      setError(
        'Cannot connect to server. ' +
        'Make sure backend is running on port 8000.'
      )
      setLoading(false)
    }
  }

  const inp = {
    width:'100%', background:C.bg2,
    border:`1px solid ${C.border}`,
    borderRadius:9, padding:'12px 14px',
    color:C.text, fontSize:13,
    fontFamily:'inherit', outline:'none',
    boxSizing:'border-box', transition:'border-color .2s',
  }

  return (
    <div style={{
      minHeight:'100vh', background:C.bg0,
      display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column',
      fontFamily:"'IBM Plex Mono','Courier New',monospace",
      padding:20,
    }}>

      {/* Background grid */}
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage:`
          linear-gradient(${C.border}44 1px, transparent 1px),
          linear-gradient(90deg, ${C.border}44 1px, transparent 1px)
        `,
        backgroundSize:'40px 40px',
      }}/>
      <div style={{
        position:'fixed', top:'30%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:500, height:300,
        background:`radial-gradient(ellipse,${C.cyan}14 0%,transparent 70%)`,
        pointerEvents:'none', zIndex:0,
      }}/>

      {/* Login card */}
      <div style={{
        position:'relative', zIndex:1,
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:18, padding:'44px 44px 36px',
        width:'100%', maxWidth:420,
        boxShadow:`0 0 60px ${C.cyan}12`,
      }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            width:54, height:54, borderRadius:14,
            background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:26,
            margin:'0 auto 16px',
            boxShadow:`0 0 30px ${C.cyan}30`,
          }}>⚡</div>
          <div style={{
            fontSize:24, fontWeight:900,
            color:C.cyan, letterSpacing:3,
          }}>SENTIMENTIQ</div>
          <div style={{
            fontSize:11, color:C.dim,
            marginTop:5, letterSpacing:1.5,
          }}>
            NTT DATA · AI ANALYTICS PLATFORM
          </div>
          <div style={{
            marginTop:8, fontSize:10,
            color:C.dim, letterSpacing:1,
          }}>
            v1.0.0 · Internal Use Only
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display:'flex', flexDirection:'column', gap:18 }}
        >

          {/* Username */}
          <div>
            <label style={{
              display:'block', fontSize:11, color:C.sub,
              letterSpacing:1.5, fontWeight:700,
              marginBottom:8, textTransform:'uppercase',
            }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e=>setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              spellCheck={false}
              style={inp}
              onFocus={e=>(e.target.style.borderColor=C.cyan)}
              onBlur={e =>(e.target.style.borderColor=C.border)}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display:'block', fontSize:11, color:C.sub,
              letterSpacing:1.5, fontWeight:700,
              marginBottom:8, textTransform:'uppercase',
            }}>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPwd?'text':'password'}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...inp, paddingRight:44 }}
                onFocus={e=>(e.target.style.borderColor=C.cyan)}
                onBlur={e =>(e.target.style.borderColor=C.border)}
              />
              <button
                type="button"
                onClick={()=>setShowPwd(v=>!v)}
                style={{
                  position:'absolute', right:12, top:'50%',
                  transform:'translateY(-50%)',
                  background:'transparent', border:'none',
                  color:C.dim, cursor:'pointer', fontSize:16, padding:4,
                }}
              >{showPwd?'🙈':'👁️'}</button>
            </div>
          </div>

          {/* Error message from backend */}
          {error && (
            <div style={{
              background:C.red+'15',
              border:`1px solid ${C.red}40`,
              borderRadius:8, padding:'10px 13px',
              fontSize:12, color:C.red, fontWeight:600,
            }}>⚠ {error}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? C.dim
                : `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border:'none', borderRadius:10, padding:14,
              width:'100%',
              color: loading ? C.sub : '#000',
              fontSize:14, fontWeight:900,
              cursor: loading?'not-allowed':'pointer',
              fontFamily:'inherit', letterSpacing:1, marginTop:4,
            }}
          >
            {loading ? 'Signing in…' : 'SIGN IN →'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{
        position:'relative', zIndex:1,
        marginTop:20, fontSize:10,
        color:C.dim, textAlign:'center',
      }}>
        NTT Data Internal Platform · Authorized Access Only
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg0}}
        input::placeholder{color:${C.dim}}
        button:active{transform:scale(.97)}
      `}</style>
    </div>
  )
}
