# ============================================================
# DATA MICROSERVICE — Complete Version
# ============================================================

import io
import uuid
import pandas as pd

from services.db_service import (
    save_upload,
    get_upload_rows,
    get_all_uploads,
    test_connection,
)

print("[DataService] Data microservice loaded")

current_df     = pd.DataFrame()
current_upload = {
    'upload_id'  : None,
    'filename'   : None,
    'uploaded_by': None,
    'rows'       : 0,
}


def is_true(val) -> bool:
    try:
        if pd.isna(val): return False
    except: pass
    if val == 1 or val == True: return True
    s = str(val).strip().lower()
    return s in ['1', '1.0', 'true', 'yes']


def find_col(df, *names):
    cols = [
        c.strip().lower().replace(' ','')
        for c in df.columns
    ]
    for n in names:
        n_clean = n.lower().replace(' ','')
        for i, c in enumerate(cols):
            if c == n_clean:
                return df.columns[i]
    return None


def process_upload(contents: bytes,
                   filename: str,
                   uploaded_by: str = 'unknown'):
    global current_df, current_upload

    name = filename.lower()

    if name.endswith('.csv'):
        current_df = pd.read_csv(
            io.BytesIO(contents))
    elif name.endswith(('.xlsx', '.xls')):
        current_df = pd.read_excel(
            io.BytesIO(contents))
    elif name.endswith('.json'):
        current_df = pd.read_json(
            io.BytesIO(contents))
    else:
        raise ValueError(
            f"Unsupported file: {filename}")

    current_df = current_df.fillna('')

    # Keep original for metrics
    metrics_df = current_df.copy()

    # Convert to string for DB and frontend
    str_df = current_df.copy()
    for col in str_df.columns:
        str_df[col] = str_df[col].astype(str)

    rows_for_db = str_df.to_dict(orient='records')
    upload_id   = f"upload_{uuid.uuid4().hex[:8]}"

    # Save to SQLite
    save_upload(
        rows        = rows_for_db,
        filename    = filename,
        uploaded_by = uploaded_by,
        upload_id   = upload_id,
    )

    # Keep original in memory for metrics
    current_df = metrics_df

    current_upload = {
        'upload_id'  : upload_id,
        'filename'   : filename,
        'uploaded_by': uploaded_by,
        'rows'       : len(rows_for_db),
    }

    # Clean rows for frontend
    rows_for_frontend = []
    for row in rows_for_db:
        clean = {}
        for k, v in row.items():
            v = str(v) if v is not None else ''
            v = '' if v in ['nan','None','NaN'] else v
            clean[str(k)] = v
        rows_for_frontend.append(clean)

    print(f"[DataService] {len(rows_for_db)} rows "
          f"saved to sentimentiq.db!")

    return {
        "message"  : f"Uploaded {len(rows_for_db)} rows",
        "rows"     : len(rows_for_db),
        "columns"  : list(current_df.columns),
        "filename" : filename,
        "upload_id": upload_id,
        "data"     : rows_for_frontend,
    }


def get_metrics() -> dict:
    global current_df
    try:
        if current_df.empty:
            return {
                "message": "No data uploaded yet.",
                "total"  : 0
            }

        df    = current_df.copy()
        total = len(df)

        csat_col   = find_col(df,'ISHAPPY','CSAT')
        dsat_col   = find_col(df,'ISSAD','DSAT')
        pass_col   = find_col(df,'ISPASSIVE')
        sent_col   = find_col(df,
                      'Predicted_Sentiment',
                      'Sentiment')
        team_col   = find_col(df,'TEAM','Department')
        region_col = find_col(df,'REGION','Industry')

        print(f"[DataService] csat_col={csat_col} "
              f"dsat_col={dsat_col}")

        csat_n = sum(
            1 for v in df[csat_col]
            if is_true(v)
        ) if csat_col else 0

        dsat_n = sum(
            1 for v in df[dsat_col]
            if is_true(v)
        ) if dsat_col else 0

        neu_n = sum(
            1 for v in df[pass_col]
            if is_true(v)
        ) if pass_col else 0

        print(f"[DataService] csat={csat_n} "
              f"dsat={dsat_n} total={total}")

        if sent_col:
            pos_n = sum(1 for v in df[sent_col]
                if str(v).strip().lower()=='positive')
            neg_n = sum(1 for v in df[sent_col]
                if str(v).strip().lower()=='negative')
            neu_n = sum(1 for v in df[sent_col]
                if str(v).strip().lower()=='neutral')
        else:
            pos_n = csat_n
            neg_n = dsat_n

        pct = lambda n: round(
            n/total*100,1) if total else 0

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
                if not k or k=='nan': continue
                if k not in stats:
                    stats[k]={
                        'csat':0,'dsat':0,'total':0
                    }
                stats[k]['total'] += 1
                if is_true(row[csat_col]):
                    stats[k]['csat'] += 1
                if dsat_col and is_true(row[dsat_col]):
                    stats[k]['dsat'] += 1
            result['team_breakdown'] = {
                t:{
                    'csat_pct':round(
                        v['csat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'dsat_pct':round(
                        v['dsat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'total':v['total'],
                } for t,v in stats.items()
            }

        # Region breakdown
        if region_col and csat_col:
            stats = {}
            for _, row in df.iterrows():
                k = str(row[region_col]).strip()
                if not k or k=='nan': continue
                if k not in stats:
                    stats[k]={
                        'csat':0,'dsat':0,'total':0
                    }
                stats[k]['total'] += 1
                if is_true(row[csat_col]):
                    stats[k]['csat'] += 1
                if dsat_col and is_true(row[dsat_col]):
                    stats[k]['dsat'] += 1
            result['region_breakdown'] = {
                r:{
                    'csat_pct':round(
                        v['csat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'dsat_pct':round(
                        v['dsat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'total':v['total'],
                } for r,v in stats.items()
            }

        return result

    except Exception as e:
        print(f"[DataService] metrics error: {e}")
        import traceback
        traceback.print_exc()
        return {"total":0,"error":str(e)}


def get_data(limit: int = 5000,
             upload_id: str = None) -> dict:
    global current_df, current_upload
    try:
        if not current_df.empty:
            df_copy = current_df.copy()
            for col in df_copy.columns:
                df_copy[col] = (
                    df_copy[col].astype(str)
                    .replace('nan','')
                    .replace('None','')
                )
            rows = df_copy.to_dict(orient='records')
            return {
                "rows"     : rows,
                "total"    : len(rows),
                "upload_id": current_upload['upload_id'],
            }
        return {"rows":[], "total":0}
    except Exception as e:
        print(f"[DataService] get_data error: {e}")
        return {"rows":[], "total":0}


# ── NEW: Effective Data ───────────────────────────────────
def get_effective_data(limit: int = 1000) -> dict:
    """
    Returns filtered columns:
    Name, Email, Comments,
    Type_of_Data, Type_of_Issue
    """
    global current_df
    try:
        if current_df.empty:
            return {"rows":[], "total":0}

        df   = current_df.copy()
        cols = list(df.columns)

        # Find required columns flexibly
        name_col    = find_col(df,'Name','CustomerName',
                               'Customer','FullName')
        email_col   = find_col(df,'Email','EmailID',
                               'Email_ID','CustomerEmail')
        comment_col = find_col(df,'Comments','Comment',
                               'Feedback','Description',
                               'Issue','Text')
        type_col    = find_col(df,'Type_of_Data',
                               'TypeofData','DataType',
                               'Type','Category')
        issue_col   = find_col(df,'Type_of_Issue',
                               'TypeofIssue','IssueType',
                               'Issue_Type','IssueCategory')
        dsat_col    = find_col(df,'ISSAD','DSAT')

        # Build effective data
        result_rows = []
        for _, row in df.iterrows():
            r = {}
            r['Name']          = str(row[name_col]).strip() \
                                  if name_col else 'N/A'
            r['Email']         = str(row[email_col]).strip() \
                                  if email_col else 'N/A'
            r['Comments']      = str(row[comment_col]).strip() \
                                  if comment_col else 'N/A'
            r['Type_of_Data']  = str(row[type_col]).strip() \
                                  if type_col else 'N/A'
            r['Type_of_Issue'] = str(row[issue_col]).strip() \
                                  if issue_col else 'N/A'
            r['Sentiment']     = 'Negative' \
                                  if (dsat_col and
                                      is_true(row[dsat_col])) \
                                  else 'Positive'

            # Clean NaN
            for k in r:
                if r[k] in ['nan','None','NaN','']:
                    r[k] = 'N/A'

            result_rows.append(r)

        # Sort — negative first
        result_rows.sort(
            key=lambda x: x['Sentiment'],
            reverse=True
        )

        return {
            "rows" : result_rows[:limit],
            "total": len(result_rows),
        }

    except Exception as e:
        print(f"[DataService] effective_data error: {e}")
        import traceback
        traceback.print_exc()
        return {"rows":[], "total":0}


# ── NEW: Repetitive Issues ────────────────────────────────
def get_repetitive_issues() -> dict:
    """
    Groups by Type_of_Issue
    Returns count and percentage
    Sorted by most frequent
    """
    global current_df
    try:
        if current_df.empty:
            return {"issues":[], "total":0}

        df    = current_df.copy()
        total = len(df)

        issue_col = find_col(df,'Type_of_Issue',
                             'TypeofIssue','IssueType',
                             'Issue_Type','Category',
                             'Type_of_Data')
        dsat_col  = find_col(df,'ISSAD','DSAT')
        csat_col  = find_col(df,'ISHAPPY','CSAT')

        if not issue_col:
            return {"issues":[], "total":0,
                    "message":"No issue column found"}

        # Count by issue type
        stats = {}
        for _, row in df.iterrows():
            issue = str(row[issue_col]).strip()
            if not issue or issue in ['nan','None','N/A']:
                continue
            if issue not in stats:
                stats[issue] = {
                    'count'  : 0,
                    'negative': 0,
                    'positive': 0,
                }
            stats[issue]['count'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[issue]['negative'] += 1
            elif csat_col and is_true(row[csat_col]):
                stats[issue]['positive'] += 1

        # Build result list
        issues = []
        for issue, data in stats.items():
            count = data['count']
            issues.append({
                'issue'      : issue,
                'count'      : count,
                'percentage' : round(count/total*100,1),
                'negative'   : data['negative'],
                'positive'   : data['positive'],
                'neg_pct'    : round(
                    data['negative']/count*100,1
                ) if count else 0,
            })

        # Sort by count descending
        issues.sort(key=lambda x: x['count'],
                    reverse=True)

        return {
            "issues": issues,
            "total" : total,
            "unique_issues": len(issues),
        }

    except Exception as e:
        print(f"[DataService] repetitive error: {e}")
        import traceback
        traceback.print_exc()
        return {"issues":[], "total":0}


def get_uploads_history():
    return get_all_uploads()


def get_status() -> dict:
    return {
        "data_loaded"   : not current_df.empty,
        "data_rows"     : len(current_df),
        "current_upload": current_upload,
        "columns"       : list(current_df.columns)
                          if not current_df.empty
                          else [],
    }







    # ============================================================
# SENTIMENTIQ BACKEND — Complete Version
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
    FastAPI, UploadFile, File, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from services.db_service import (
    init_database,
    test_connection,
    get_latest_upload_id,
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
    get_effective_data,
    get_repetitive_issues,
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
    print("[Backend] All systems ready!\n")


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
            status_code=401,
            detail="Invalid username or password"
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
        print(f"[Backend] Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))


@app.get("/data/metrics")
def metrics():
    try:
        return get_metrics()
    except Exception as e:
        print(f"[Backend] Metrics error: {e}")
        return {
            "total":0,"csat_pct":0,
            "dsat_pct":0,"neutral_pct":0
        }


@app.get("/data/rows")
def rows(limit: int = 5000,
         upload_id: Optional[str] = None):
    try:
        result = get_data(limit, upload_id)
        print(f"[Backend] Returning "
              f"{len(result.get('rows',[]))} rows")
        return result
    except Exception as e:
        print(f"[Backend] Rows error: {e}")
        return {"rows":[], "total":0}


@app.get("/data/uploads")
def uploads():
    try:
        history = get_uploads_history()
        return {"uploads":history,"total":len(history)}
    except Exception as e:
        return {"uploads":[],"total":0}


@app.get("/data/status")
def data_status():
    try:
        return get_status()
    except Exception as e:
        return {"data_loaded":False,"data_rows":0}


# ── NEW: Analysis Endpoints ───────────────────────────────
@app.get("/data/effective")
def effective_data(limit: int = 1000):
    """
    Returns Name, Email, Comments,
    Type_of_Data, Type_of_Issue columns
    """
    try:
        return get_effective_data(limit)
    except Exception as e:
        print(f"[Backend] Effective data error: {e}")
        return {"rows":[], "total":0}


@app.get("/data/repetitive")
def repetitive_issues():
    """
    Returns issues grouped by type
    with count and percentage
    """
    try:
        return get_repetitive_issues()
    except Exception as e:
        print(f"[Backend] Repetitive error: {e}")
        return {"issues":[], "total":0}


# ── System ────────────────────────────────────────────────
@app.get("/health")
def health():
    try:
        db_ok = test_connection()
        data  = get_status()
        return {
            "status"    : "running",
            "app"       : CONFIG['app']['name'],
            "version"   : CONFIG['app']['version'],
            "database"  : "SQLite sentimentiq.db",
            "db_ok"     : db_ok,
            "data_loaded": data['data_loaded'],
            "data_rows" : data['data_rows'],
        }
    except Exception as e:
        return {"status":"error","error":str(e)}


@app.get("/")
def root():
    return {
        "message": f"{CONFIG['app']['name']} running!",
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








    import { useState, useRef, useMemo } from 'react'
import DataTable from '../components/DataTable.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'

const API = 'http://localhost:8000'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22',
  panel:'#13181f', border:'#21262d',
  cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff', sky:'#79c0ff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

const TT = {
  background:C.panel, border:`1px solid ${C.border}`,
  borderRadius:8, fontSize:11, color:C.text,
}

function KPI({ label, value, sub, accent }) {
  return (
    <div style={{
      background:C.panel,
      border:`1px solid ${accent}33`,
      borderRadius:12, padding:'16px 20px',
    }}>
      <div style={{
        fontSize:10, color:C.sub,
        letterSpacing:1.5, textTransform:'uppercase',
        marginBottom:6, fontFamily:'monospace',
      }}>{label}</div>
      <div style={{
        fontSize:28, fontWeight:900, color:accent,
        fontFamily:'monospace', lineHeight:1,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontSize:11, color:C.dim, marginTop:5
        }}>{sub}</div>
      )}
      <div style={{
        marginTop:10, height:3,
        background:accent+'20', borderRadius:2,
      }}>
        <div style={{
          height:'100%',
          width:`${Math.min(parseFloat(value)||0,100)}%`,
          background:accent, borderRadius:2,
          transition:'width .6s',
        }}/>
      </div>
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div style={{
      position:'fixed', top:16, right:16,
      zIndex:9999, background:C.panel,
      border:`1px solid ${toast.color}`,
      borderRadius:9, padding:'10px 18px',
      color:toast.color, fontSize:12,
      fontWeight:700,
      boxShadow:`0 0 24px ${toast.color}30`,
      fontFamily:'monospace',
    }}>{toast.icon} {toast.msg}</div>
  )
}

export default function Dashboard({
  user, rows, setRows, onLogout
}) {
  const [page,        setPage]       = useState('charts')
  const [loading,     setLoading]    = useState(false)
  const [error,       setError]      = useState('')
  const [dragging,    setDragging]   = useState(false)
  const [toast,       setToast]      = useState(null)
  const [metrics,     setMetrics]    = useState(null)
  const [fileMeta,    setFileMeta]   = useState(null)
  const [effData,     setEffData]    = useState([])
  const [repIssues,   setRepIssues]  = useState([])
  const [analysisLoading, setAnalysisLoading]
                                     = useState(false)
  const fileRef = useRef(null)
  const token   = localStorage.getItem('token')

  const ROLE_COLOR = {
    Admin:C.red, Manager:C.amber, Developer:C.cyan
  }
  const roleColor = ROLE_COLOR[user?.role] || C.violet

  // ── Chart data ────────────────────────────────────
  const sentBarData = useMemo(() =>
    !metrics ? [] : [
      { name:'Positive', value:metrics.pos_n||0,
        pct:metrics.csat_pct||0 },
      { name:'Negative', value:metrics.neg_n||0,
        pct:metrics.dsat_pct||0 },
      { name:'Neutral',  value:metrics.neutral_n||0,
        pct:metrics.neutral_pct||0 },
    ], [metrics])

  const csatDsatBar = useMemo(() =>
    !metrics ? [] : [
      { name:'CSAT', value:metrics.csat_pct||0,
        fill:C.green },
      { name:'DSAT', value:metrics.dsat_pct||0,
        fill:C.red },
    ], [metrics])

  const teamData = useMemo(() => {
    if (!metrics?.team_breakdown) return []
    return Object.entries(metrics.team_breakdown)
      .map(([name,v]) => ({
        name,
        'CSAT%':v.csat_pct,
        'DSAT%':v.dsat_pct,
      }))
      .sort((a,b) => b['CSAT%']-a['CSAT%'])
      .slice(0,8)
  }, [metrics])

  const regionData = useMemo(() => {
    if (!metrics?.region_breakdown) return []
    return Object.entries(metrics.region_breakdown)
      .map(([name,v]) => ({
        name,
        'CSAT%':v.csat_pct,
        'DSAT%':v.dsat_pct,
      }))
      .sort((a,b) => b['CSAT%']-a['CSAT%'])
      .slice(0,8)
  }, [metrics])

  const repBarData = useMemo(() =>
    repIssues.slice(0,10).map(i => ({
      name   : i.issue.length > 15
               ? i.issue.slice(0,13)+'…'
               : i.issue,
      fullName: i.issue,
      Count  : i.count,
      'Neg%' : i.neg_pct,
    }))
  , [repIssues])

  function notify(msg, color, icon='✓') {
    setToast({ msg, color, icon })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Fetch analysis data ───────────────────────────
  async function fetchAnalysis() {
    setAnalysisLoading(true)
    try {
      const [effRes, repRes] = await Promise.all([
        fetch(`${API}/data/effective?limit=1000`, {
          headers:{
            'Authorization':`Bearer ${token}`
          }
        }),
        fetch(`${API}/data/repetitive`, {
          headers:{
            'Authorization':`Bearer ${token}`
          }
        }),
      ])
      if (effRes.ok) {
        const d = await effRes.json()
        setEffData(d.rows || [])
      }
      if (repRes.ok) {
        const d = await repRes.json()
        setRepIssues(d.issues || [])
      }
    } catch(e) {
      console.error('Analysis fetch error:', e)
    }
    setAnalysisLoading(false)
  }

  // ── Upload function ───────────────────────────────
  async function uploadToBackend(file) {
    setError('')
    setLoading(true)
    setMetrics(null)
    setRows([])
    setEffData([])
    setRepIssues([])

    try {
      const savedUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      )
      const username = savedUser.username || 'unknown'

      const formData = new FormData()
      formData.append('file', file)

      console.log('[Dashboard] Uploading:', file.name)

      const uploadRes = await fetch(
        `${API}/data/upload?username=${username}`,
        {
          method:'POST',
          headers:{
            'Authorization':`Bearer ${token}`
          },
          body: formData,
        }
      )

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.detail || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      console.log('[Dashboard] Upload success:',
        uploadData.rows, 'rows')

      setFileMeta({
        name: uploadData.filename,
        rows: uploadData.rows,
      })

      // Use rows from upload response directly!
      if (uploadData.data?.length > 0) {
        console.log('[Dashboard] Setting rows:',
          uploadData.data.length)
        setRows(uploadData.data)
      }

      // Get metrics
      const metricsRes = await fetch(
        `${API}/data/metrics`,
        { headers:{
          'Authorization':`Bearer ${token}`
        }}
      )
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        console.log('[Dashboard] Metrics:',
          metricsData.csat_pct + '%')
        setMetrics(metricsData)
      }

      setLoading(false)
      setPage('charts')
      notify(
        `Imported ${uploadData.rows
          .toLocaleString()} rows`,
        C.green
      )

    } catch(err) {
      console.error('[Dashboard] Error:', err)
      setError(err.message)
      notify(err.message, C.red, '⚠')
      setLoading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files[0])
      uploadToBackend(e.dataTransfer.files[0])
  }

  const NAV = [
    { id:'charts',   icon:'📊',
      label:'Charts',       sub:'Analytics & KPIs' },
    { id:'data',     icon:'📋',
      label:'Data',         sub:'Import & Export'  },
    { id:'analysis', icon:'🔍',
      label:'Data Analysis',sub:'Insights & Issues' },
  ]

  // ── Loading Screen ────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight:'100vh', background:C.bg0,
        display:'flex', alignItems:'center',
        justifyContent:'center',
        flexDirection:'column',
        fontFamily:'monospace',
        color:C.text, gap:16,
      }}>
        <div style={{ fontSize:48 }}>⏳</div>
        <div style={{
          fontSize:16, fontWeight:700, color:C.amber
        }}>
          Importing file, please wait…
        </div>
        <div style={{ fontSize:11, color:C.dim }}>
          This may take a few seconds for large files
        </div>
      </div>
    )
  }

  // ── Sidebar ───────────────────────────────────────
  const Sidebar = () => (
    <div style={{
      width:220, minWidth:220, background:C.bg1,
      borderRight:`1px solid ${C.border}`,
      display:'flex', flexDirection:'column',
      height:'100vh', position:'fixed',
      left:0, top:0, zIndex:200,
    }}>
      {/* Logo */}
      <div style={{
        padding:'20px 18px 16px',
        borderBottom:`1px solid ${C.border}`,
      }}>
        <div style={{
          display:'flex', alignItems:'center', gap:10
        }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:`linear-gradient(
              135deg,${C.cyan},${C.violet})`,
            display:'flex', alignItems:'center',
            justifyContent:'center',
            fontSize:18, flexShrink:0,
          }}>⚡</div>
          <div>
            <div style={{
              fontSize:13, fontWeight:900,
              color:C.cyan, letterSpacing:2,
            }}>SENTIMENTIQ</div>
            <div style={{
              fontSize:9, color:C.dim,
              letterSpacing:1.5,
            }}>NTT DATA · AI</div>
          </div>
        </div>
      </div>

      {/* File info */}
      {fileMeta && (
        <div style={{
          margin:'10px 10px 0',
          background:C.violet+'12',
          border:`1px solid ${C.violet}30`,
          borderRadius:8, padding:'8px 10px',
        }}>
          <div style={{
            fontSize:10, color:C.violet,
            fontWeight:700, whiteSpace:'nowrap',
            overflow:'hidden', textOverflow:'ellipsis',
          }}>
            📁 {fileMeta.name.length > 22
              ? fileMeta.name.slice(0,20)+'…'
              : fileMeta.name}
          </div>
          <div style={{
            fontSize:9, color:C.dim, marginTop:3
          }}>
            {fileMeta.rows?.toLocaleString()} rows loaded
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{
        flex:1, padding:'12px 10px',
        display:'flex', flexDirection:'column', gap:4,
      }}>
        <div style={{
          fontSize:9, color:C.dim, letterSpacing:1.5,
          fontWeight:700, padding:'4px 8px 8px',
        }}>NAVIGATION</div>

        {NAV.map(item => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id)
                if (item.id === 'analysis' &&
                    rows.length > 0 &&
                    effData.length === 0) {
                  fetchAnalysis()
                }
              }}
              style={{
                display:'flex', alignItems:'center',
                gap:12,
                background:active
                  ? C.cyan+'18' : 'transparent',
                border:`1px solid ${active
                  ? C.cyan+'50' : 'transparent'}`,
                borderRadius:9, padding:'10px 12px',
                cursor:'pointer', fontFamily:'inherit',
                textAlign:'left', width:'100%',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background=C.bg2
                  e.currentTarget.style.borderColor=C.border
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background
                    ='transparent'
                  e.currentTarget.style.borderColor
                    ='transparent'
                }
              }}
            >
              <span style={{ fontSize:18 }}>
                {item.icon}
              </span>
              <div>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:active ? C.cyan : C.text,
                }}>{item.label}</div>
                <div style={{
                  fontSize:9, color:C.dim, marginTop:1
                }}>{item.sub}</div>
              </div>
              {active && (
                <div style={{
                  marginLeft:'auto', width:3, height:26,
                  background:C.cyan, borderRadius:2,
                }}/>
              )}
            </button>
          )
        })}
      </nav>

      {/* Quick stats */}
      {metrics && (
        <div style={{
          margin:'0 10px 12px',
          background:C.bg2,
          border:`1px solid ${C.border}`,
          borderRadius:9, padding:'10px 12px',
        }}>
          <div style={{
            fontSize:9, color:C.dim,
            letterSpacing:1.5, fontWeight:700,
            marginBottom:8,
          }}>QUICK STATS</div>
          {[
            ['CSAT', `${metrics.csat_pct||0}%`, C.green],
            ['DSAT', `${metrics.dsat_pct||0}%`, C.red],
            ['Neutral',
             `${metrics.neutral_pct||0}%`, C.amber],
          ].map(([label,value,color]) => (
            <div key={label} style={{
              display:'flex',
              justifyContent:'space-between',
              marginBottom:5, alignItems:'center',
            }}>
              <span style={{
                fontSize:10, color:C.sub
              }}>{label}</span>
              <span style={{
                fontSize:12, fontWeight:900,
                color, fontFamily:'monospace',
              }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* User + logout */}
      <div style={{
        borderTop:`1px solid ${C.border}`,
        padding:'12px',
      }}>
        <div style={{
          display:'flex', alignItems:'center',
          justifyContent:'space-between', gap:8,
        }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:11, fontWeight:700,
              color:roleColor, whiteSpace:'nowrap',
              overflow:'hidden', textOverflow:'ellipsis',
            }}>{user?.name}</div>
            <div style={{
              fontSize:9, color:C.dim, marginTop:1
            }}>{user?.role}</div>
          </div>
          <button onClick={onLogout} style={{
            background:C.red+'15',
            border:`1px solid ${C.red}40`,
            color:C.red, borderRadius:6,
            padding:'5px 9px', fontSize:10,
            fontWeight:700, cursor:'pointer',
            fontFamily:'inherit', flexShrink:0,
          }}>OUT</button>
        </div>
      </div>
    </div>
  )

  // ── Main Dashboard ────────────────────────────────
  return (
    <div style={{
      display:'flex', height:'100vh',
      background:C.bg0, color:C.text,
      fontFamily:"'IBM Plex Mono',monospace",
      overflow:'hidden',
    }}>
      <Toast toast={toast}/>
      <Sidebar/>

      {/* RIGHT CONTENT */}
      <div style={{
        marginLeft:220, flex:1,
        height:'100vh', overflowY:'auto',
        overflowX:'hidden',
      }}>

        {/* ── CHARTS PAGE ─────────────────────── */}
        {page === 'charts' && (
          <div style={{ padding:'24px' }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{
                fontSize:20, fontWeight:900,
                color:C.cyan, margin:0, letterSpacing:1,
              }}>Charts & Analytics</h1>
              <p style={{
                fontSize:11, color:C.sub,
                margin:'4px 0 0',
              }}>
                {metrics
                  ? `${metrics.total?.toLocaleString()} records analysed`
                  : 'Import data from Data section to see analytics'}
              </p>
            </div>

            {/* KPI Cards */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(4,1fr)',
              gap:12, marginBottom:20,
            }}>
              <KPI
                label="Total Records"
                value={(metrics?.total||0)
                  .toLocaleString()}
                sub={metrics
                  ? "records loaded"
                  : "no data yet"}
                accent={C.sky}
              />
              <KPI
                label="CSAT"
                value={`${metrics?.csat_pct||0}%`}
                sub={metrics
                  ? `${metrics.csat_n||0} satisfied`
                  : "no data yet"}
                accent={C.green}
              />
              <KPI
                label="DSAT"
                value={`${metrics?.dsat_pct||0}%`}
                sub={metrics
                  ? `${metrics.dsat_n||0} dissatisfied`
                  : "no data yet"}
                accent={C.red}
              />
              <KPI
                label="Neutral"
                value={`${metrics?.neutral_pct||0}%`}
                sub={metrics
                  ? `${metrics.neutral_n||0} neutral`
                  : "no data yet"}
                accent={C.amber}
              />
            </div>

            {/* Empty state */}
            {!metrics && (
              <div style={{
                background:C.panel,
                border:`1px solid ${C.border}`,
                borderRadius:12,
                padding:'60px 20px',
                textAlign:'center',
              }}>
                <div style={{
                  fontSize:48, marginBottom:16
                }}>📊</div>
                <div style={{
                  fontSize:16, fontWeight:700,
                  color:C.sub, marginBottom:8,
                }}>No Data Imported Yet</div>
                <div style={{
                  fontSize:12, color:C.dim,
                  marginBottom:20,
                }}>
                  Go to Data section to import
                  your data file
                </div>
                <button
                  onClick={() => setPage('data')}
                  style={{
                    background:`linear-gradient(
                      135deg,${C.cyan},${C.violet})`,
                    border:'none', borderRadius:10,
                    padding:'12px 24px', color:'#000',
                    fontSize:13, fontWeight:900,
                    cursor:'pointer',
                    fontFamily:'inherit',
                  }}
                >Go to Data Section →</button>
              </div>
            )}

            {/* Charts — only if data */}
            {metrics && metrics.total > 0 && (
              <>
                {/* Charts Row 1 */}
                <div style={{
                  display:'grid',
                  gridTemplateColumns:'1fr 1fr',
                  gap:14, marginBottom:14,
                }}>
                  {/* Sentiment Distribution */}
                  <div style={{
                    background:C.panel,
                    border:`1px solid ${C.border}`,
                    borderRadius:12, padding:'18px 20px',
                  }}>
                    <div style={{
                      fontSize:12, fontWeight:700,
                      color:C.text, marginBottom:2,
                    }}>Sentiment Distribution</div>
                    <div style={{
                      fontSize:10, color:C.sub,
                      marginBottom:14,
                    }}>
                      Pos: {metrics.pos_n||0} ·
                      Neg: {metrics.neg_n||0} ·
                      Neu: {metrics.neutral_n||0}
                    </div>
                    <ResponsiveContainer
                      width="100%" height={210}>
                      <BarChart
                        data={sentBarData} barSize={55}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={C.border}/>
                        <XAxis dataKey="name"
                          stroke={C.dim} fontSize={11}/>
                        <YAxis
                          stroke={C.dim} fontSize={10}/>
                        <Tooltip contentStyle={TT}
                          formatter={(v,n,p) => [
                            `${v} (${p.payload.pct}%)`,
                            'Count'
                          ]}/>
                        <Bar dataKey="value"
                          radius={[6,6,0,0]}>
                          <Cell fill={C.green}/>
                          <Cell fill={C.red}/>
                          <Cell fill={C.amber}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* CSAT vs DSAT */}
                  <div style={{
                    background:C.panel,
                    border:`1px solid ${C.border}`,
                    borderRadius:12, padding:'18px 20px',
                  }}>
                    <div style={{
                      fontSize:12, fontWeight:700,
                      color:C.text, marginBottom:2,
                    }}>CSAT vs DSAT</div>
                    <div style={{
                      fontSize:10, color:C.sub,
                      marginBottom:14,
                    }}>
                      CSAT: {metrics.csat_pct||0}% ·
                      DSAT: {metrics.dsat_pct||0}%
                    </div>
                    <ResponsiveContainer
                      width="100%" height={210}>
                      <BarChart
                        data={csatDsatBar} barSize={90}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={C.border}/>
                        <XAxis dataKey="name"
                          stroke={C.dim} fontSize={12}/>
                        <YAxis stroke={C.dim}
                          fontSize={10}
                          domain={[0,100]} unit="%"/>
                        <Tooltip contentStyle={TT}
                          formatter={v => [`${v}%`]}/>
                        <Bar dataKey="value"
                          radius={[6,6,0,0]}>
                          {csatDsatBar.map((d,i) => (
                            <Cell key={i} fill={d.fill}/>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Team + Region */}
                {(teamData.length > 0 ||
                  regionData.length > 0) && (
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:
                      teamData.length > 0 &&
                      regionData.length > 0
                        ? '1fr 1fr' : '1fr',
                    gap:14, marginBottom:14,
                  }}>
                    {teamData.length > 0 && (
                      <div style={{
                        background:C.panel,
                        border:`1px solid ${C.border}`,
                        borderRadius:12,
                        padding:'18px 20px',
                      }}>
                        <div style={{
                          fontSize:12, fontWeight:700,
                          color:C.text, marginBottom:2,
                        }}>CSAT% and DSAT% by Team</div>
                        <div style={{
                          fontSize:10, color:C.sub,
                          marginBottom:14,
                        }}>Team performance</div>
                        <ResponsiveContainer
                          width="100%" height={220}>
                          <BarChart
                            data={teamData} barSize={12}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={C.border}/>
                            <XAxis dataKey="name"
                              stroke={C.dim} fontSize={9}
                              interval={0} angle={-20}
                              textAnchor="end"
                              height={50}/>
                            <YAxis stroke={C.dim}
                              fontSize={10} unit="%"/>
                            <Tooltip contentStyle={TT}
                              formatter={v=>[`${v}%`]}/>
                            <Legend iconType="circle"
                              iconSize={8}
                              wrapperStyle={{fontSize:11}}/>
                            <Bar dataKey="CSAT%"
                              fill={C.green}
                              radius={[4,4,0,0]}/>
                            <Bar dataKey="DSAT%"
                              fill={C.red}
                              radius={[4,4,0,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {regionData.length > 0 && (
                      <div style={{
                        background:C.panel,
                        border:`1px solid ${C.border}`,
                        borderRadius:12,
                        padding:'18px 20px',
                      }}>
                        <div style={{
                          fontSize:12, fontWeight:700,
                          color:C.text, marginBottom:2,
                        }}>
                          CSAT% and DSAT% by Region
                        </div>
                        <div style={{
                          fontSize:10, color:C.sub,
                          marginBottom:14,
                        }}>Regional performance</div>
                        <ResponsiveContainer
                          width="100%" height={220}>
                          <BarChart
                            data={regionData} barSize={12}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={C.border}/>
                            <XAxis dataKey="name"
                              stroke={C.dim} fontSize={9}
                              interval={0} angle={-20}
                              textAnchor="end" height={60}/>
                            <YAxis stroke={C.dim}
                              fontSize={10} unit="%"/>
                            <Tooltip contentStyle={TT}
                              formatter={v=>[`${v}%`]}/>
                            <Legend iconType="circle"
                              iconSize={8}
                              wrapperStyle={{fontSize:11}}/>
                            <Bar dataKey="CSAT%"
                              fill={C.cyan}
                              radius={[4,4,0,0]}/>
                            <Bar dataKey="DSAT%"
                              fill={C.violet}
                              radius={[4,4,0,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── DATA PAGE ───────────────────────── */}
        {page === 'data' && (
          <div style={{ padding:'24px' }}>

            {/* Header with Import button top right */}
            <div style={{
              display:'flex', alignItems:'center',
              justifyContent:'space-between',
              marginBottom:20, flexWrap:'wrap', gap:12,
            }}>
              <div>
                <h1 style={{
                  fontSize:20, fontWeight:900,
                  color:C.cyan, margin:0, letterSpacing:1,
                }}>Data</h1>
                <p style={{
                  fontSize:11, color:C.sub,
                  margin:'4px 0 0',
                }}>
                  {rows.length > 0
                    ? `${rows.length.toLocaleString()} rows · Sort · Filter · Export`
                    : 'Import a file to get started'}
                </p>
              </div>

              {/* Import button — top right */}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.txt"
                  style={{ display:'none' }}
                  onChange={e => {
                    if (e.target.files[0])
                      uploadToBackend(e.target.files[0])
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragging(false)
                    if (e.dataTransfer.files[0])
                      uploadToBackend(
                        e.dataTransfer.files[0])
                  }}
                  style={{
                    background:dragging
                      ? C.cyan+'30'
                      : `linear-gradient(
                          135deg,${C.cyan},${C.violet})`,
                    border:'none', borderRadius:10,
                    padding:'10px 20px', color:'#000',
                    fontSize:12, fontWeight:900,
                    cursor:'pointer',
                    fontFamily:'inherit', letterSpacing:1,
                    display:'flex', alignItems:'center',
                    gap:8,
                  }}
                >
                  ⬆ Import File
                </button>
              </div>
            </div>

            {/* Empty state */}
            {rows.length === 0 && (
              <div style={{
                background:C.panel,
                border:`2px dashed ${C.border}`,
                borderRadius:12,
                padding:'60px 20px',
                textAlign:'center',
              }}>
                <div style={{
                  fontSize:48, marginBottom:16
                }}>📂</div>
                <div style={{
                  fontSize:16, fontWeight:700,
                  color:C.sub, marginBottom:8,
                }}>No Data Imported Yet</div>
                <div style={{
                  fontSize:12, color:C.dim,
                  marginBottom:20,
                }}>
                  Click "Import File" button above
                  to upload CSV or Excel file
                </div>
                <div style={{
                  display:'flex',
                  justifyContent:'center',
                  gap:8, flexWrap:'wrap',
                }}>
                  {['CSV','Excel','JSON','TXT']
                    .map(f => (
                    <div key={f} style={{
                      background:C.bg2,
                      border:`1px solid ${C.border}`,
                      borderRadius:6, padding:'4px 12px',
                      fontSize:10, color:C.sub,
                      fontWeight:700,
                    }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Table */}
            {rows.length > 0 && (
              <div style={{ position:'relative' }}>
                <DataTable
                  rows={rows}
                  onNotify={notify}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                marginTop:14,
                background:C.red+'10',
                border:`1px solid ${C.red}40`,
                borderRadius:8, padding:'10px 14px',
                fontSize:11, color:C.red, fontWeight:600,
              }}>⚠ {error}</div>
            )}
          </div>
        )}

        {/* ── DATA ANALYSIS PAGE ──────────────── */}
        {page === 'analysis' && (
          <div style={{ padding:'24px' }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{
                fontSize:20, fontWeight:900,
                color:C.cyan, margin:0, letterSpacing:1,
              }}>Data Analysis</h1>
              <p style={{
                fontSize:11, color:C.sub,
                margin:'4px 0 0',
              }}>
                Effective data and repetitive issues
              </p>
            </div>

            {/* No data state */}
            {rows.length === 0 && (
              <div style={{
                background:C.panel,
                border:`1px solid ${C.border}`,
                borderRadius:12, padding:'60px 20px',
                textAlign:'center',
              }}>
                <div style={{ fontSize:48, marginBottom:16 }}>
                  🔍
                </div>
                <div style={{
                  fontSize:16, fontWeight:700,
                  color:C.sub, marginBottom:8,
                }}>No Data to Analyse</div>
                <div style={{
                  fontSize:12, color:C.dim,
                  marginBottom:20,
                }}>
                  Import data first from the Data section
                </div>
                <button
                  onClick={() => setPage('data')}
                  style={{
                    background:`linear-gradient(
                      135deg,${C.cyan},${C.violet})`,
                    border:'none', borderRadius:10,
                    padding:'12px 24px', color:'#000',
                    fontSize:13, fontWeight:900,
                    cursor:'pointer', fontFamily:'inherit',
                  }}
                >Go to Data Section →</button>
              </div>
            )}

            {rows.length > 0 && (
              <>
                {/* Loading */}
                {analysisLoading && (
                  <div style={{
                    background:C.panel,
                    border:`1px solid ${C.border}`,
                    borderRadius:12, padding:'40px',
                    textAlign:'center', marginBottom:16,
                  }}>
                    <div style={{
                      fontSize:11, color:C.amber,
                      fontWeight:700,
                    }}>
                      ⏳ Loading analysis...
                    </div>
                  </div>
                )}

                {/* Refresh button */}
                {!analysisLoading && (
                  <div style={{
                    display:'flex',
                    justifyContent:'flex-end',
                    marginBottom:12,
                  }}>
                    <button
                      onClick={fetchAnalysis}
                      style={{
                        background:C.cyan+'18',
                        border:`1px solid ${C.cyan}50`,
                        color:C.cyan, borderRadius:8,
                        padding:'7px 16px', fontSize:11,
                        fontWeight:700, cursor:'pointer',
                        fontFamily:'inherit',
                      }}
                    >↺ Refresh Analysis</button>
                  </div>
                )}

                {/* ── SUB-SECTION 1: Effective Data ── */}
                <div style={{
                  background:C.panel,
                  border:`1px solid ${C.border}`,
                  borderRadius:12, padding:'20px',
                  marginBottom:20,
                }}>
                  <div style={{
                    fontSize:14, fontWeight:700,
                    color:C.cyan, marginBottom:4,
                  }}>📋 Effective Data</div>
                  <div style={{
                    fontSize:10, color:C.sub,
                    marginBottom:16,
                  }}>
                    Name · Email · Comments ·
                    Type of Data · Type of Issue
                    {effData.length > 0 &&
                      ` · ${effData.length.toLocaleString()} records`}
                  </div>

                  {effData.length === 0 &&
                   !analysisLoading && (
                    <div style={{
                      textAlign:'center', padding:'20px',
                      color:C.dim, fontSize:11,
                    }}>
                      Click "Refresh Analysis" to load
                    </div>
                  )}

                  {effData.length > 0 && (
                    <div style={{ overflowX:'auto' }}>
                      <table style={{
                        width:'100%',
                        borderCollapse:'collapse',
                        fontSize:11,
                      }}>
                        <thead>
                          <tr>
                            {['Name','Email',
                              'Comments','Type of Data',
                              'Type of Issue',
                              'Sentiment'].map(h => (
                              <th key={h} style={{
                                padding:'10px 12px',
                                background:C.bg2,
                                border:`1px solid ${C.border}`,
                                color:C.sub,
                                fontWeight:700,
                                textAlign:'left',
                                whiteSpace:'nowrap',
                                letterSpacing:0.5,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {effData.slice(0,100)
                            .map((row,i) => (
                            <tr key={i}
                              style={{
                                background:i%2===0
                                  ? 'transparent'
                                  : C.bg2+'50',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget
                                  .style.background
                                  = C.cyan+'08'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget
                                  .style.background
                                  = i%2===0
                                    ? 'transparent'
                                    : C.bg2+'50'
                              }}
                            >
                              <td style={{
                                padding:'8px 12px',
                                border:`1px solid ${C.border}`,
                                color:C.text,
                                whiteSpace:'nowrap',
                              }}>{row.Name}</td>
                              <td style={{
                                padding:'8px 12px',
                                border:`1px solid ${C.border}`,
                                color:C.sky,
                                whiteSpace:'nowrap',
                                fontSize:10,
                              }}>{row.Email}</td>
                              <td style={{
                                padding:'8px 12px',
                                border:`1px solid ${C.border}`,
                                color:C.sub,
                                maxWidth:250,
                                overflow:'hidden',
                                textOverflow:'ellipsis',
                                whiteSpace:'nowrap',
                              }}
                              title={row.Comments}>
                                {row.Comments}
                              </td>
                              <td style={{
                                padding:'8px 12px',
                                border:`1px solid ${C.border}`,
                                color:C.amber,
                                whiteSpace:'nowrap',
                              }}>{row.Type_of_Data}</td>
                              <td style={{
                                padding:'8px 12px',
                                border:`1px solid ${C.border}`,
                                color:C.violet,
                                whiteSpace:'nowrap',
                              }}>{row.Type_of_Issue}</td>
                              <td style={{
                                padding:'8px 12px',
                                border:`1px solid ${C.border}`,
                                textAlign:'center',
                              }}>
                                <span style={{
                                  background:
                                    row.Sentiment==='Negative'
                                      ? C.red+'20'
                                      : C.green+'20',
                                  color:
                                    row.Sentiment==='Negative'
                                      ? C.red
                                      : C.green,
                                  borderRadius:20,
                                  padding:'2px 10px',
                                  fontSize:10,
                                  fontWeight:700,
                                  whiteSpace:'nowrap',
                                }}>
                                  {row.Sentiment==='Negative'
                                    ? '😠 Negative'
                                    : '😊 Positive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {effData.length > 100 && (
                        <div style={{
                          padding:'10px 12px',
                          fontSize:10, color:C.dim,
                          textAlign:'center',
                          borderTop:`1px solid ${C.border}`,
                        }}>
                          Showing 100 of
                          {' '}{effData.length.toLocaleString()}
                          {' '}records
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SUB-SECTION 2: Repetitive Issues ── */}
                <div style={{
                  background:C.panel,
                  border:`1px solid ${C.border}`,
                  borderRadius:12, padding:'20px',
                }}>
                  <div style={{
                    fontSize:14, fontWeight:700,
                    color:C.cyan, marginBottom:4,
                  }}>🔁 Repetitive Issues</div>
                  <div style={{
                    fontSize:10, color:C.sub,
                    marginBottom:16,
                  }}>
                    Most frequently occurring issue types
                    {repIssues.length > 0 &&
                      ` · ${repIssues.length} unique issues found`}
                  </div>

                  {repIssues.length === 0 &&
                   !analysisLoading && (
                    <div style={{
                      textAlign:'center', padding:'20px',
                      color:C.dim, fontSize:11,
                    }}>
                      Click "Refresh Analysis" to load
                    </div>
                  )}

                  {repIssues.length > 0 && (
                    <>
                      {/* Bar chart */}
                      <div style={{ marginBottom:20 }}>
                        <ResponsiveContainer
                          width="100%" height={280}>
                          <BarChart
                            data={repBarData}
                            layout="vertical"
                            margin={{
                              left:10, right:40,
                              top:5, bottom:5
                            }}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={C.border}
                              horizontal={false}/>
                            <XAxis type="number"
                              stroke={C.dim} fontSize={10}/>
                            <YAxis type="category"
                              dataKey="name"
                              stroke={C.dim} fontSize={10}
                              width={120}/>
                            <Tooltip
                              contentStyle={TT}
                              formatter={(v,n,p) => [
                                `${v.toLocaleString()} tickets`,
                                p.payload.fullName
                              ]}/>
                            <Bar dataKey="Count"
                              fill={C.red}
                              radius={[0,6,6,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Table */}
                      <div style={{ overflowX:'auto' }}>
                        <table style={{
                          width:'100%',
                          borderCollapse:'collapse',
                          fontSize:11,
                        }}>
                          <thead>
                            <tr>
                              {['Rank','Issue Type',
                                'Count','% of Total',
                                'Negative','Neg%']
                                .map(h => (
                                <th key={h} style={{
                                  padding:'10px 12px',
                                  background:C.bg2,
                                  border:`1px solid ${C.border}`,
                                  color:C.sub,
                                  fontWeight:700,
                                  textAlign:
                                    h==='Issue Type'
                                      ? 'left' : 'center',
                                  whiteSpace:'nowrap',
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {repIssues.map((issue,i) => (
                              <tr key={i}
                                style={{
                                  background:i%2===0
                                    ? 'transparent'
                                    : C.bg2+'50',
                                }}
                              >
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.dim,
                                  textAlign:'center',
                                  fontWeight:700,
                                }}>#{i+1}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.text,
                                  fontWeight:600,
                                }}>{issue.issue}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.cyan,
                                  textAlign:'center',
                                  fontWeight:700,
                                  fontFamily:'monospace',
                                }}>
                                  {issue.count
                                    .toLocaleString()}
                                </td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  textAlign:'center',
                                }}>
                                  <div style={{
                                    display:'flex',
                                    alignItems:'center',
                                    gap:6,
                                    justifyContent:'center',
                                  }}>
                                    <div style={{
                                      width:60, height:6,
                                      background:C.border,
                                      borderRadius:3,
                                    }}>
                                      <div style={{
                                        width:`${Math.min(
                                          issue.percentage*2,
                                          100)}%`,
                                        height:'100%',
                                        background:C.violet,
                                        borderRadius:3,
                                      }}/>
                                    </div>
                                    <span style={{
                                      color:C.violet,
                                      fontWeight:700,
                                      fontFamily:'monospace',
                                      fontSize:10,
                                    }}>
                                      {issue.percentage}%
                                    </span>
                                  </div>
                                </td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.red,
                                  textAlign:'center',
                                  fontFamily:'monospace',
                                }}>
                                  {issue.negative
                                    .toLocaleString()}
                                </td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  textAlign:'center',
                                }}>
                                  <span style={{
                                    background:
                                      issue.neg_pct > 70
                                        ? C.red+'20'
                                        : issue.neg_pct > 40
                                          ? C.amber+'20'
                                          : C.green+'20',
                                    color:
                                      issue.neg_pct > 70
                                        ? C.red
                                        : issue.neg_pct > 40
                                          ? C.amber
                                          : C.green,
                                    borderRadius:20,
                                    padding:'2px 8px',
                                    fontSize:10,
                                    fontWeight:700,
                                    fontFamily:'monospace',
                                  }}>
                                    {issue.neg_pct}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg0};overflow:hidden}
        select option{background:${C.bg2};color:${C.text}}
        input::placeholder{color:${C.dim}}
        button:active{transform:scale(.97)}
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-track{background:${C.bg1}}
        ::-webkit-scrollbar-thumb{
          background:${C.border};border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{
          background:${C.dim}}
      `}</style>
    </div>
  )
}









