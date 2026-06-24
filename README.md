# ============================================================
# DATA MICROSERVICE — Complete Correct Version
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
    """
    Finds column ignoring case, spaces,
    underscores and hyphens
    Type_of_Data == TypeofData == type of data
    """
    cols_clean = [
        c.strip().lower()
         .replace(' ','').replace('_','').replace('-','')
        for c in df.columns
    ]
    for n in names:
        n_clean = (n.strip().lower()
                    .replace(' ','').replace('_','')
                    .replace('-',''))
        for i, col in enumerate(cols_clean):
            if col == n_clean:
                return df.columns[i]
    return None


def safe_str(val):
    if val is None: return ''
    s = str(val).strip()
    if s.lower() in ['nan','none','nat','n/a','']: return ''
    return s


def process_upload(contents: bytes,
                   filename: str,
                   uploaded_by: str = 'unknown'):
    global current_df, current_upload

    name = filename.lower()
    if name.endswith('.csv'):
        current_df = pd.read_csv(io.BytesIO(contents))
    elif name.endswith(('.xlsx','.xls')):
        current_df = pd.read_excel(io.BytesIO(contents))
    elif name.endswith('.json'):
        current_df = pd.read_json(io.BytesIO(contents))
    else:
        raise ValueError(f"Unsupported file: {filename}")

    current_df = current_df.fillna('')

    print(f"[DataService] Loaded {len(current_df)} rows")
    print(f"[DataService] Columns: {list(current_df.columns)}")

    metrics_df = current_df.copy()

    str_df = current_df.copy()
    for col in str_df.columns:
        str_df[col] = str_df[col].astype(str)

    rows_for_db = str_df.to_dict(orient='records')
    upload_id   = f"upload_{uuid.uuid4().hex[:8]}"

    save_upload(
        rows        = rows_for_db,
        filename    = filename,
        uploaded_by = uploaded_by,
        upload_id   = upload_id,
    )

    current_df = metrics_df
    current_upload = {
        'upload_id'  : upload_id,
        'filename'   : filename,
        'uploaded_by': uploaded_by,
        'rows'       : len(rows_for_db),
    }

    rows_for_frontend = []
    for row in rows_for_db:
        clean = {}
        for k, v in row.items():
            v = str(v) if v is not None else ''
            v = '' if v in ['nan','None','NaN','nat','NaT'] else v
            clean[str(k)] = v
        rows_for_frontend.append(clean)

    print(f"[DataService] {len(rows_for_db)} rows saved!")

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
            return {"message":"No data uploaded yet.","total":0}

        df    = current_df.copy()
        total = len(df)

        csat_col   = find_col(df,'ISHAPPY','CSAT','Satisfied')
        dsat_col   = find_col(df,'ISSAD','DSAT','Dissatisfied')
        pass_col   = find_col(df,'ISPASSIVE','Neutral','Passive')
        sent_col   = find_col(df,'Predicted_Sentiment','Sentiment')
        team_col   = find_col(df,'TEAM','Department','Team')
        region_col = find_col(df,'REGION','Industry','Region')

        print(f"[DataService] CSAT col: {csat_col}, DSAT col: {dsat_col}")

        csat_n = sum(1 for v in df[csat_col] if is_true(v)) if csat_col else 0
        dsat_n = sum(1 for v in df[dsat_col] if is_true(v)) if dsat_col else 0
        neu_n  = sum(1 for v in df[pass_col] if is_true(v)) if pass_col else 0

        print(f"[DataService] csat={csat_n} dsat={dsat_n} total={total}")

        if sent_col:
            pos_n = sum(1 for v in df[sent_col] if str(v).strip().lower()=='positive')
            neg_n = sum(1 for v in df[sent_col] if str(v).strip().lower()=='negative')
            neu_n = sum(1 for v in df[sent_col] if str(v).strip().lower()=='neutral')
        else:
            pos_n = csat_n
            neg_n = dsat_n

        pct = lambda n: round(n/total*100,1) if total else 0

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

        if team_col and csat_col:
            stats = {}
            for _, row in df.iterrows():
                k = safe_str(row[team_col])
                if not k: continue
                if k not in stats:
                    stats[k] = {'csat':0,'dsat':0,'total':0}
                stats[k]['total'] += 1
                if is_true(row[csat_col]): stats[k]['csat'] += 1
                if dsat_col and is_true(row[dsat_col]): stats[k]['dsat'] += 1
            result['team_breakdown'] = {
                t:{'csat_pct':round(v['csat']/v['total']*100,1) if v['total'] else 0,
                   'dsat_pct':round(v['dsat']/v['total']*100,1) if v['total'] else 0,
                   'total':v['total']}
                for t,v in stats.items()
            }

        if region_col and csat_col:
            stats = {}
            for _, row in df.iterrows():
                k = safe_str(row[region_col])
                if not k: continue
                if k not in stats:
                    stats[k] = {'csat':0,'dsat':0,'total':0}
                stats[k]['total'] += 1
                if is_true(row[csat_col]): stats[k]['csat'] += 1
                if dsat_col and is_true(row[dsat_col]): stats[k]['dsat'] += 1
            result['region_breakdown'] = {
                r:{'csat_pct':round(v['csat']/v['total']*100,1) if v['total'] else 0,
                   'dsat_pct':round(v['dsat']/v['total']*100,1) if v['total'] else 0,
                   'total':v['total']}
                for r,v in stats.items()
            }

        return result

    except Exception as e:
        print(f"[DataService] metrics error: {e}")
        import traceback; traceback.print_exc()
        return {"total":0,"error":str(e)}


def get_data(limit: int = 5000, upload_id: str = None) -> dict:
    global current_df, current_upload
    try:
        if not current_df.empty:
            df_copy = current_df.copy()
            for col in df_copy.columns:
                df_copy[col] = (df_copy[col].astype(str)
                                .replace('nan','')
                                .replace('None','')
                                .replace('NaT',''))
            rows = df_copy.to_dict(orient='records')
            return {"rows":rows,"total":len(rows),
                    "upload_id":current_upload['upload_id']}
        return {"rows":[],"total":0}
    except Exception as e:
        print(f"[DataService] get_data error: {e}")
        return {"rows":[],"total":0}


def get_effective_data(limit: int = 99999) -> dict:
    """
    Returns Name, Email, Comments,
    Type_of_Data, Type_of_Issue, Sentiment
    Works with any column naming style!
    """
    global current_df
    try:
        if current_df.empty:
            return {"rows":[],"total":0}

        df    = current_df.copy()
        total = len(df)

        print(f"[DataService] All columns: {list(df.columns)}")

        name_col    = find_col(df,'Name','CustomerName','Customer',
                               'FullName','Employee','PersonName',
                               'EmployeeName')
        email_col   = find_col(df,'Email','EmailID','Email_ID',
                               'CustomerEmail','EmployeeEmail',
                               'EmailAddress','Mail')
        comment_col = find_col(df,'Comments','Comment','Feedback',
                               'Description','Issue','Text',
                               'Message','FeedbackText','Notes',
                               'IssueDescription','CustomerFeedback')
        type_col    = find_col(df,'Type_of_Data','TypeofData',
                               'DataType','Type','Category',
                               'IssueCategory','DataCategory',
                               'FeedbackType')
        issue_col   = find_col(df,'Type_of_Issue','TypeofIssue',
                               'IssueType','Issue_Type',
                               'IssueName','Problem',
                               'TicketType','TypeIssue')
        dsat_col    = find_col(df,'ISSAD','DSAT','Dissatisfied',
                               'IsNegative','IsSad')
        csat_col    = find_col(df,'ISHAPPY','CSAT','Satisfied',
                               'IsPositive','IsHappy')

        print(f"[DataService] Column mapping:")
        print(f"  Name    -> {name_col}")
        print(f"  Email   -> {email_col}")
        print(f"  Comment -> {comment_col}")
        print(f"  Type    -> {type_col}")
        print(f"  Issue   -> {issue_col}")

        result_rows = []
        for _, row in df.iterrows():
            r = {}
            r['Name']          = safe_str(row[name_col])    if name_col    else 'N/A'
            r['Email']         = safe_str(row[email_col])   if email_col   else 'N/A'
            r['Comments']      = safe_str(row[comment_col]) if comment_col else 'N/A'
            r['Type_of_Data']  = safe_str(row[type_col])    if type_col    else 'N/A'
            r['Type_of_Issue'] = safe_str(row[issue_col])   if issue_col   else 'N/A'

            if dsat_col and is_true(row[dsat_col]):
                r['Sentiment'] = 'Negative'
            elif csat_col and is_true(row[csat_col]):
                r['Sentiment'] = 'Positive'
            else:
                r['Sentiment'] = 'Neutral'

            for k in r:
                if not r[k] or r[k] == '':
                    r[k] = 'N/A'

            result_rows.append(r)

        order = {'Negative':0,'Neutral':1,'Positive':2}
        result_rows.sort(key=lambda x: order.get(x.get('Sentiment','Neutral'),1))

        print(f"[DataService] Effective data: {len(result_rows)} rows ready")

        return {"rows":result_rows[:limit],"total":len(result_rows)}

    except Exception as e:
        print(f"[DataService] effective error: {e}")
        import traceback; traceback.print_exc()
        return {"rows":[],"total":0}


def get_repetitive_issues() -> dict:
    global current_df
    try:
        if current_df.empty:
            return {"issues":[],"total":0}

        df    = current_df.copy()
        total = len(df)

        issue_col = find_col(df,'Type_of_Issue','TypeofIssue',
                             'IssueType','Issue_Type','IssueName',
                             'Problem','TicketType','TypeIssue',
                             'Type_of_Data','TypeofData',
                             'Category','DataType')
        dsat_col  = find_col(df,'ISSAD','DSAT','Dissatisfied')
        csat_col  = find_col(df,'ISHAPPY','CSAT','Satisfied')

        if not issue_col:
            print(f"[DataService] No issue column found!")
            print(f"  Available: {list(df.columns)}")
            return {"issues":[],"total":0,
                    "message":"No issue type column found"}

        print(f"[DataService] Issue col: {issue_col}")

        stats = {}
        for _, row in df.iterrows():
            issue = safe_str(row[issue_col])
            if not issue or issue == 'N/A': continue
            if issue not in stats:
                stats[issue] = {'count':0,'negative':0,'positive':0}
            stats[issue]['count'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[issue]['negative'] += 1
            elif csat_col and is_true(row[csat_col]):
                stats[issue]['positive'] += 1

        issues = []
        for issue, data in stats.items():
            count = data['count']
            issues.append({
                'issue'     : issue,
                'count'     : count,
                'percentage': round(count/total*100,1) if total else 0,
                'negative'  : data['negative'],
                'positive'  : data['positive'],
                'neg_pct'   : round(data['negative']/count*100,1) if count else 0,
            })

        issues.sort(key=lambda x: x['count'], reverse=True)
        print(f"[DataService] Repetitive issues: {len(issues)} types")

        return {"issues":issues,"total":total,"unique_issues":len(issues)}

    except Exception as e:
        print(f"[DataService] repetitive error: {e}")
        import traceback; traceback.print_exc()
        return {"issues":[],"total":0}


def get_uploads_history():
    return get_all_uploads()


def get_status() -> dict:
    return {
        "data_loaded"   : not current_df.empty,
        "data_rows"     : len(current_df),
        "current_upload": current_upload,
        "columns"       : list(current_df.columns) if not current_df.empty else [],
    }







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
        fontSize:10, color:C.sub, letterSpacing:1.5,
        textTransform:'uppercase', marginBottom:6,
        fontFamily:'monospace',
      }}>{label}</div>
      <div style={{
        fontSize:28, fontWeight:900, color:accent,
        fontFamily:'monospace', lineHeight:1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize:11, color:C.dim, marginTop:5 }}>
          {sub}
        </div>
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
      position:'fixed', top:16, right:16, zIndex:9999,
      background:C.panel, border:`1px solid ${toast.color}`,
      borderRadius:9, padding:'10px 18px',
      color:toast.color, fontSize:12, fontWeight:700,
      boxShadow:`0 0 24px ${toast.color}30`,
      fontFamily:'monospace',
    }}>{toast.icon} {toast.msg}</div>
  )
}

function EmptyChart({ height = 210 }) {
  return (
    <div style={{
      height, display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column',
      gap:8, background:C.bg2+'80', borderRadius:8,
      border:`1px dashed ${C.border}`,
    }}>
      <div style={{ fontSize:32, opacity:0.3 }}>📊</div>
      <div style={{ fontSize:10, color:C.dim, fontWeight:600, letterSpacing:1 }}>
        IMPORT DATA TO SEE CHART
      </div>
    </div>
  )
}

export default function Dashboard({ user, rows, setRows, onLogout }) {
  const [page,            setPage]           = useState('charts')
  const [loading,         setLoading]        = useState(false)
  const [error,           setError]          = useState('')
  const [dragging,        setDragging]       = useState(false)
  const [toast,           setToast]          = useState(null)
  const [metrics,         setMetrics]        = useState(null)
  const [fileMeta,        setFileMeta]       = useState(null)
  const [effData,         setEffData]        = useState([])
  const [repIssues,       setRepIssues]      = useState([])
  const [analysisLoading, setAnalysisLoading]= useState(false)
  const fileRef = useRef(null)
  const token   = localStorage.getItem('token')

  const ROLE_COLOR = { Admin:C.red, Manager:C.amber, Developer:C.cyan }
  const roleColor  = ROLE_COLOR[user?.role] || C.violet

  const sentBarData = useMemo(() => !metrics ? [] : [
    { name:'Positive', value:metrics.pos_n||0,    pct:metrics.csat_pct||0    },
    { name:'Negative', value:metrics.neg_n||0,    pct:metrics.dsat_pct||0    },
    { name:'Neutral',  value:metrics.neutral_n||0,pct:metrics.neutral_pct||0 },
  ], [metrics])

  const csatDsatBar = useMemo(() => !metrics ? [] : [
    { name:'CSAT', value:metrics.csat_pct||0, fill:C.green },
    { name:'DSAT', value:metrics.dsat_pct||0, fill:C.red   },
  ], [metrics])

  const teamData = useMemo(() => {
    if (!metrics?.team_breakdown) return []
    return Object.entries(metrics.team_breakdown)
      .map(([name,v]) => ({ name, 'CSAT%':v.csat_pct, 'DSAT%':v.dsat_pct }))
      .sort((a,b) => b['CSAT%']-a['CSAT%']).slice(0,8)
  }, [metrics])

  const regionData = useMemo(() => {
    if (!metrics?.region_breakdown) return []
    return Object.entries(metrics.region_breakdown)
      .map(([name,v]) => ({ name, 'CSAT%':v.csat_pct, 'DSAT%':v.dsat_pct }))
      .sort((a,b) => b['CSAT%']-a['CSAT%']).slice(0,8)
  }, [metrics])

  const repBarData = useMemo(() =>
    repIssues.slice(0,10).map(i => ({
      name    : i.issue.length > 15 ? i.issue.slice(0,13)+'…' : i.issue,
      fullName: i.issue,
      Count   : i.count,
    }))
  , [repIssues])

  function notify(msg, color, icon='✓') {
    setToast({ msg, color, icon })
    setTimeout(() => setToast(null), 3500)
  }

  function exportCSV(data, filename) {
    if (!data || data.length === 0) {
      notify('No data to export!', C.red, '⚠')
      return
    }
    const headers = Object.keys(data[0]).join(',')
    const body    = data.map(r =>
      Object.values(r).map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([headers+'\n'+body], { type:'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `${filename}_${Date.now()}.csv`
    a.click()
    notify(`Exported ${data.length.toLocaleString()} rows!`, C.green)
  }

  async function fetchAnalysis() {
    setAnalysisLoading(true)
    try {
      const [effRes, repRes] = await Promise.all([
        fetch(`${API}/data/effective?limit=99999`, {
          headers:{ 'Authorization':`Bearer ${token}` }
        }),
        fetch(`${API}/data/repetitive`, {
          headers:{ 'Authorization':`Bearer ${token}` }
        }),
      ])
      if (effRes.ok) {
        const d = await effRes.json()
        console.log('[Dashboard] Effective data:', d.rows?.length, 'rows')
        setEffData(d.rows || [])
      }
      if (repRes.ok) {
        const d = await repRes.json()
        setRepIssues(d.issues || [])
      }
    } catch(e) {
      console.error('Analysis fetch error:', e)
      notify('Failed to load analysis!', C.red, '⚠')
    }
    setAnalysisLoading(false)
  }

  async function uploadToBackend(file) {
    setError(''); setLoading(true)
    setMetrics(null); setRows([])
    setEffData([]); setRepIssues([])

    try {
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const username  = savedUser.username || 'unknown'

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(
        `${API}/data/upload?username=${username}`,
        { method:'POST', headers:{ 'Authorization':`Bearer ${token}` }, body:formData }
      )

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.detail || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      setFileMeta({ name:uploadData.filename, rows:uploadData.rows })

      if (uploadData.data?.length > 0) setRows(uploadData.data)

      const metricsRes = await fetch(`${API}/data/metrics`, {
        headers:{ 'Authorization':`Bearer ${token}` }
      })
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData)
      }

      setLoading(false)
      setPage('charts')
      notify(`Imported ${uploadData.rows.toLocaleString()} rows`, C.green)

    } catch(err) {
      setError(err.message)
      notify(err.message, C.red, '⚠')
      setLoading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files[0]) uploadToBackend(e.dataTransfer.files[0])
  }

  function buildMetricsText(forReport = false) {
    if (!metrics) return null
    const teamStr = metrics.team_breakdown
      ? Object.entries(metrics.team_breakdown)
          .sort((a,b) => b[1].csat_pct - a[1].csat_pct)
          .map(([t,v],i) => `  ${i+1}. ${t}: CSAT ${v.csat_pct}% | DSAT ${v.dsat_pct}% | Total ${v.total}`)
          .join('\n')
      : '  No team data'
    const regionStr = metrics.region_breakdown
      ? Object.entries(metrics.region_breakdown)
          .sort((a,b) => b[1].csat_pct - a[1].csat_pct)
          .map(([r,v],i) => `  ${i+1}. ${r}: CSAT ${v.csat_pct}% | DSAT ${v.dsat_pct}% | Total ${v.total}`)
          .join('\n')
      : '  No region data'

    if (forReport) {
      return `SentimentIQ Data for Report Generation:
Reporting Period: ${new Date().toLocaleDateString()}
File: ${fileMeta?.name || 'Unknown'}
Total Records Analysed: ${metrics.total?.toLocaleString()}
CSAT Score: ${metrics.csat_pct}%
DSAT Score: ${metrics.dsat_pct}%
Neutral Score: ${metrics.neutral_pct}%
Total Satisfied: ${metrics.csat_n}
Total Dissatisfied: ${metrics.dsat_n}

Team Performance (sorted by CSAT):
${teamStr}

Regional Performance (sorted by CSAT):
${regionStr}

Please generate a professional executive summary report from this data.`
    }

    return `SentimentIQ Current Data for Analysis:
Total Records: ${metrics.total?.toLocaleString()}
CSAT Score: ${metrics.csat_pct}%
DSAT Score: ${metrics.dsat_pct}%
Neutral Score: ${metrics.neutral_pct}%
Satisfied Customers: ${metrics.csat_n}
Dissatisfied Customers: ${metrics.dsat_n}

Team Breakdown:
${teamStr}

Region Breakdown:
${regionStr}

Please analyze this data and provide insights and recommendations.`
  }

  const NAV = [
    { id:'charts',   icon:'📊', label:'Charts',       sub:'Analytics & KPIs'  },
    { id:'data',     icon:'📋', label:'Data',          sub:'Import & Export'   },
    { id:'analysis', icon:'🔍', label:'Data Analysis', sub:'Insights & Issues' },
    { id:'agents',   icon:'🤖', label:'AI Agents',     sub:'Copilot Assistants'},
  ]

  if (loading) {
    return (
      <div style={{
        minHeight:'100vh', background:C.bg0, display:'flex',
        alignItems:'center', justifyContent:'center',
        flexDirection:'column', fontFamily:'monospace', color:C.text, gap:16,
      }}>
        <div style={{ fontSize:48 }}>⏳</div>
        <div style={{ fontSize:16, fontWeight:700, color:C.amber }}>
          Importing file, please wait…
        </div>
        <div style={{ fontSize:11, color:C.dim }}>Large files may take a moment</div>
      </div>
    )
  }

  const Sidebar = () => (
    <div style={{
      width:220, minWidth:220, background:C.bg1,
      borderRight:`1px solid ${C.border}`,
      display:'flex', flexDirection:'column',
      height:'100vh', position:'fixed', left:0, top:0, zIndex:200,
    }}>
      <div style={{ padding:'20px 18px 16px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:18, flexShrink:0,
          }}>⚡</div>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:C.cyan, letterSpacing:2 }}>
              SENTIMENTIQ
            </div>
            <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5 }}>NTT DATA · AI</div>
          </div>
        </div>
      </div>

      {fileMeta && (
        <div style={{
          margin:'10px 10px 0', background:C.violet+'12',
          border:`1px solid ${C.violet}30`, borderRadius:8, padding:'8px 10px',
        }}>
          <div style={{
            fontSize:10, color:C.violet, fontWeight:700,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            📁 {fileMeta.name.length > 22 ? fileMeta.name.slice(0,20)+'…' : fileMeta.name}
          </div>
          <div style={{ fontSize:9, color:C.dim, marginTop:3 }}>
            {fileMeta.rows?.toLocaleString()} rows loaded
          </div>
        </div>
      )}

      <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{
          fontSize:9, color:C.dim, letterSpacing:1.5,
          fontWeight:700, padding:'4px 8px 8px',
        }}>NAVIGATION</div>

        {NAV.map(item => {
          const active = page === item.id
          return (
            <button key={item.id}
              onClick={() => {
                setPage(item.id)
                if (item.id === 'analysis' && rows.length > 0 && effData.length === 0) {
                  fetchAnalysis()
                }
              }}
              style={{
                display:'flex', alignItems:'center', gap:12,
                background:active ? C.cyan+'18' : 'transparent',
                border:`1px solid ${active ? C.cyan+'50' : 'transparent'}`,
                borderRadius:9, padding:'10px 12px',
                cursor:'pointer', fontFamily:'inherit',
                textAlign:'left', width:'100%',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = C.bg2
                  e.currentTarget.style.borderColor = C.border
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:active ? C.cyan : C.text }}>
                  {item.label}
                </div>
                <div style={{ fontSize:9, color:C.dim, marginTop:1 }}>{item.sub}</div>
              </div>
              {active && (
                <div style={{ marginLeft:'auto', width:3, height:26, background:C.cyan, borderRadius:2 }}/>
              )}
            </button>
          )
        })}
      </nav>

      <div style={{
        margin:'0 10px 12px', background:C.bg2,
        border:`1px solid ${C.border}`, borderRadius:9, padding:'10px 12px',
      }}>
        <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5, fontWeight:700, marginBottom:8 }}>
          QUICK STATS
        </div>
        {[
          ['CSAT',    `${metrics?.csat_pct||0}%`,    C.green],
          ['DSAT',    `${metrics?.dsat_pct||0}%`,    C.red  ],
          ['Neutral', `${metrics?.neutral_pct||0}%`, C.amber],
        ].map(([label,value,color]) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:5, alignItems:'center' }}>
            <span style={{ fontSize:10, color:C.sub }}>{label}</span>
            <span style={{ fontSize:12, fontWeight:900, color, fontFamily:'monospace' }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:11, fontWeight:700, color:roleColor,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>{user?.name}</div>
            <div style={{ fontSize:9, color:C.dim, marginTop:1 }}>{user?.role}</div>
          </div>
          <button onClick={onLogout} style={{
            background:C.red+'15', border:`1px solid ${C.red}40`,
            color:C.red, borderRadius:6, padding:'5px 9px',
            fontSize:10, fontWeight:700, cursor:'pointer',
            fontFamily:'inherit', flexShrink:0,
          }}>OUT</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      display:'flex', height:'100vh',
      background:C.bg0, color:C.text,
      fontFamily:"'IBM Plex Mono',monospace",
      overflow:'hidden',
    }}>
      <Toast toast={toast}/>
      <Sidebar/>

      <div style={{ marginLeft:220, flex:1, height:'100vh', overflowY:'auto', overflowX:'hidden' }}>

        {/* ═══ CHARTS PAGE ═══ */}
        {page === 'charts' && (
          <div style={{ padding:'24px' }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:20, fontWeight:900, color:C.cyan, margin:0, letterSpacing:1 }}>
                Charts & Analytics
              </h1>
              <p style={{ fontSize:11, color:C.sub, margin:'4px 0 0' }}>
                {metrics
                  ? `${metrics.total?.toLocaleString()} records analysed`
                  : 'Import data from Data section to see analytics'}
              </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              <KPI label="Total Records" value={(metrics?.total||0).toLocaleString()}
                sub={metrics ? "records loaded" : "no data yet"} accent={C.sky}/>
              <KPI label="CSAT" value={`${metrics?.csat_pct||0}%`}
                sub={metrics ? `${metrics.csat_n||0} satisfied` : "no data yet"} accent={C.green}/>
              <KPI label="DSAT" value={`${metrics?.dsat_pct||0}%`}
                sub={metrics ? `${metrics.dsat_n||0} dissatisfied` : "no data yet"} accent={C.red}/>
              <KPI label="Neutral" value={`${metrics?.neutral_pct||0}%`}
                sub={metrics ? `${metrics.neutral_n||0} neutral` : "no data yet"} accent={C.amber}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>Sentiment Distribution</div>
                <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>
                  {metrics ? `Pos: ${metrics.pos_n||0} · Neg: ${metrics.neg_n||0} · Neu: ${metrics.neutral_n||0}` : 'No data imported yet'}
                </div>
                {sentBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={sentBarData} barSize={55}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={11}/>
                      <YAxis stroke={C.dim} fontSize={10}/>
                      <Tooltip contentStyle={TT} formatter={(v,n,p) => [`${v} (${p.payload.pct}%)`, 'Count']}/>
                      <Bar dataKey="value" radius={[6,6,0,0]}>
                        <Cell fill={C.green}/><Cell fill={C.red}/><Cell fill={C.amber}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={210}/>}
              </div>

              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>CSAT vs DSAT</div>
                <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>
                  {metrics ? `CSAT: ${metrics.csat_pct||0}% · DSAT: ${metrics.dsat_pct||0}%` : 'No data imported yet'}
                </div>
                {csatDsatBar.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={csatDsatBar} barSize={90}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={12}/>
                      <YAxis stroke={C.dim} fontSize={10} domain={[0,100]} unit="%"/>
                      <Tooltip contentStyle={TT} formatter={v => [`${v}%`]}/>
                      <Bar dataKey="value" radius={[6,6,0,0]}>
                        {csatDsatBar.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={210}/>}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>CSAT% and DSAT% by Team</div>
                <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>Team performance</div>
                {teamData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={teamData} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={9} interval={0} angle={-20} textAnchor="end" height={50}/>
                      <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                      <Tooltip contentStyle={TT} formatter={v=>[`${v}%`]}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="CSAT%" fill={C.green} radius={[4,4,0,0]}/>
                      <Bar dataKey="DSAT%" fill={C.red}   radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={220}/>}
              </div>

              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>CSAT% and DSAT% by Region</div>
                <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>Regional performance</div>
                {regionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={regionData} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={9} interval={0} angle={-20} textAnchor="end" height={60}/>
                      <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                      <Tooltip contentStyle={TT} formatter={v=>[`${v}%`]}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="CSAT%" fill={C.cyan}   radius={[4,4,0,0]}/>
                      <Bar dataKey="DSAT%" fill={C.violet} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={220}/>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ DATA PAGE ═══ */}
        {page === 'data' && (
          <div style={{ padding:'24px', display:'flex', flexDirection:'column', minHeight:'100vh' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
              <div>
                <h1 style={{ fontSize:20, fontWeight:900, color:C.cyan, margin:0, letterSpacing:1 }}>Data</h1>
                <p style={{ fontSize:11, color:C.sub, margin:'4px 0 0' }}>
                  {rows.length > 0 ? `${rows.length.toLocaleString()} rows · Sort · Filter · Export` : 'Import a file to get started'}
                </p>
              </div>
              <div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.txt"
                  style={{ display:'none' }}
                  onChange={e => { if (e.target.files[0]) uploadToBackend(e.target.files[0]); e.target.value='' }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) uploadToBackend(e.dataTransfer.files[0]) }}
                  style={{
                    background:dragging ? C.cyan+'30' : `linear-gradient(135deg,${C.cyan},${C.violet})`,
                    border:'none', borderRadius:10, padding:'10px 20px',
                    color:'#000', fontSize:12, fontWeight:900,
                    cursor:'pointer', fontFamily:'inherit', letterSpacing:1,
                  }}
                >⬆ Import File</button>
              </div>
            </div>

            {rows.length === 0 && (
              <div style={{
                background:C.panel, border:`2px dashed ${C.border}`,
                borderRadius:12, padding:'60px 20px', textAlign:'center',
              }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.sub, marginBottom:8 }}>No Data Imported Yet</div>
                <div style={{ fontSize:12, color:C.dim, marginBottom:20 }}>Click Import File button above</div>
                <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap' }}>
                  {['CSV','Excel','JSON','TXT'].map(f => (
                    <div key={f} style={{
                      background:C.bg2, border:`1px solid ${C.border}`,
                      borderRadius:6, padding:'4px 12px', fontSize:10, color:C.sub, fontWeight:700,
                    }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {rows.length > 0 && <div style={{ flex:1 }}><DataTable rows={rows} onNotify={notify}/></div>}

            {error && (
              <div style={{
                marginTop:14, background:C.red+'10', border:`1px solid ${C.red}40`,
                borderRadius:8, padding:'10px 14px', fontSize:11, color:C.red, fontWeight:600,
              }}>⚠ {error}</div>
            )}

            {rows.length > 0 && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                <button onClick={() => exportCSV(rows, 'sentimentiq_data')}
                  style={{
                    background:C.green+'18', border:`1px solid ${C.green}50`,
                    color:C.green, borderRadius:10, padding:'10px 20px',
                    fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit', letterSpacing:1,
                    display:'flex', alignItems:'center', gap:8,
                  }}
                >
                  ⬇ Export CSV
                  <span style={{ fontSize:10, fontWeight:400, color:C.dim }}>
                    ({rows.length.toLocaleString()} rows)
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ DATA ANALYSIS PAGE ═══ */}
        {page === 'analysis' && (
          <div style={{ padding:'24px', display:'flex', flexDirection:'column', minHeight:'100vh' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
              <div>
                <h1 style={{ fontSize:20, fontWeight:900, color:C.cyan, margin:0, letterSpacing:1 }}>Data Analysis</h1>
                <p style={{ fontSize:11, color:C.sub, margin:'4px 0 0' }}>Effective data and repetitive issues</p>
              </div>
              {rows.length > 0 && (
                <button onClick={fetchAnalysis} disabled={analysisLoading}
                  style={{
                    background:C.cyan+'18', border:`1px solid ${C.cyan}50`,
                    color:C.cyan, borderRadius:8, padding:'8px 16px',
                    fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                    opacity:analysisLoading ? 0.5 : 1,
                  }}
                >
                  {analysisLoading ? '⏳ Loading…' : '↺ Refresh Analysis'}
                </button>
              )}
            </div>

            {rows.length === 0 && (
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'60px 20px', textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.sub, marginBottom:8 }}>No Data to Analyse</div>
                <div style={{ fontSize:12, color:C.dim, marginBottom:20 }}>Import data first from Data section</div>
                <button onClick={() => setPage('data')} style={{
                  background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
                  border:'none', borderRadius:10, padding:'12px 24px', color:'#000',
                  fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit',
                }}>Go to Data Section →</button>
              </div>
            )}

            {rows.length > 0 && (
              <>
                {/* Effective Data */}
                <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'20px', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.cyan }}>📋 Effective Data</div>
                    {effData.length > 0 && (
                      <span style={{ fontSize:10, color:C.dim }}>{effData.length.toLocaleString()} records</span>
                    )}
                  </div>
                  <div style={{ fontSize:10, color:C.sub, marginBottom:16 }}>
                    Name · Email · Comments · Type of Data · Type of Issue · Sentiment
                  </div>

                  {!analysisLoading && effData.length === 0 && (
                    <div style={{ textAlign:'center', padding:'30px', color:C.dim, fontSize:11 }}>
                      Click Refresh Analysis to load effective data
                    </div>
                  )}
                  {analysisLoading && (
                    <div style={{ textAlign:'center', padding:'30px', color:C.amber, fontSize:11, fontWeight:700 }}>
                      ⏳ Loading...
                    </div>
                  )}

                  {effData.length > 0 && !analysisLoading && (
                    <>
                      <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:500 }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                          <thead style={{ position:'sticky', top:0, zIndex:10 }}>
                            <tr>
                              {['#','Name','Email','Comments','Type of Data','Type of Issue','Sentiment'].map(h => (
                                <th key={h} style={{
                                  padding:'10px 12px', background:C.bg1,
                                  border:`1px solid ${C.border}`, color:C.sub,
                                  fontWeight:700, textAlign: h==='#' ? 'center' : 'left',
                                  whiteSpace:'nowrap', letterSpacing:0.5,
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {effData.map((row, i) => (
                              <tr key={i}
                                style={{ background: i%2===0 ? 'transparent' : C.bg2+'50' }}
                                onMouseEnter={e => { e.currentTarget.style.background = C.cyan+'08' }}
                                onMouseLeave={e => { e.currentTarget.style.background = i%2===0 ? 'transparent' : C.bg2+'50' }}
                              >
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.dim, textAlign:'center', fontSize:10 }}>{i+1}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.text, whiteSpace:'nowrap', fontWeight:600 }}>{row.Name}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.sky, whiteSpace:'nowrap', fontSize:10 }}>{row.Email}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.sub, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={row.Comments}>{row.Comments}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.amber, whiteSpace:'nowrap' }}>{row.Type_of_Data}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.violet, whiteSpace:'nowrap' }}>{row.Type_of_Issue}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, textAlign:'center' }}>
                                  <span style={{
                                    background: row.Sentiment==='Negative' ? C.red+'20' : row.Sentiment==='Positive' ? C.green+'20' : C.amber+'20',
                                    color: row.Sentiment==='Negative' ? C.red : row.Sentiment==='Positive' ? C.green : C.amber,
                                    borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700, whiteSpace:'nowrap',
                                  }}>
                                    {row.Sentiment==='Negative' ? '😠 Negative' : row.Sentiment==='Positive' ? '😊 Positive' : '😐 Neutral'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
                        <button onClick={() => exportCSV(effData, 'effective_data')}
                          style={{
                            background:C.green+'18', border:`1px solid ${C.green}50`,
                            color:C.green, borderRadius:10, padding:'10px 20px',
                            fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit', letterSpacing:1,
                            display:'flex', alignItems:'center', gap:8,
                          }}
                        >
                          ⬇ Export Effective Data
                          <span style={{ fontSize:10, fontWeight:400, color:C.dim }}>({effData.length.toLocaleString()} rows)</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Repetitive Issues */}
                <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'20px', marginBottom:20 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.cyan, marginBottom:4 }}>🔁 Repetitive Issues</div>
                  <div style={{ fontSize:10, color:C.sub, marginBottom:16 }}>
                    Most frequently occurring issues
                    {repIssues.length > 0 && ` · ${repIssues.length} unique types`}
                  </div>

                  {!analysisLoading && repIssues.length === 0 && (
                    <div style={{ textAlign:'center', padding:'30px', color:C.dim, fontSize:11 }}>
                      Click Refresh Analysis to load issues
                    </div>
                  )}
                  {analysisLoading && (
                    <div style={{ textAlign:'center', padding:'30px', color:C.amber, fontSize:11, fontWeight:700 }}>⏳ Loading...</div>
                  )}

                  {repIssues.length > 0 && !analysisLoading && (
                    <>
                      <div style={{ marginBottom:20 }}>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={repBarData} layout="vertical" margin={{ left:10, right:40, top:5, bottom:5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                            <XAxis type="number" stroke={C.dim} fontSize={10}/>
                            <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={10} width={120}/>
                            <Tooltip contentStyle={TT} formatter={(v,n,p) => [`${v.toLocaleString()} tickets`, p.payload.fullName]}/>
                            <Bar dataKey="Count" fill={C.red} radius={[0,6,6,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                          <thead>
                            <tr>
                              {['Rank','Issue Type','Count','% Total','Negative','Neg%'].map(h => (
                                <th key={h} style={{
                                  padding:'10px 12px', background:C.bg2,
                                  border:`1px solid ${C.border}`, color:C.sub, fontWeight:700,
                                  textAlign: h==='Issue Type' ? 'left' : 'center', whiteSpace:'nowrap',
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {repIssues.map((issue, i) => (
                              <tr key={i} style={{ background: i%2===0 ? 'transparent' : C.bg2+'50' }}>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.dim, textAlign:'center', fontWeight:700 }}>#{i+1}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.text, fontWeight:600 }}>{issue.issue}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.cyan, textAlign:'center', fontWeight:700, fontFamily:'monospace' }}>{issue.count.toLocaleString()}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, textAlign:'center' }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                                    <div style={{ width:60, height:6, background:C.border, borderRadius:3 }}>
                                      <div style={{ width:`${Math.min(issue.percentage*2,100)}%`, height:'100%', background:C.violet, borderRadius:3 }}/>
                                    </div>
                                    <span style={{ color:C.violet, fontWeight:700, fontFamily:'monospace', fontSize:10 }}>{issue.percentage}%</span>
                                  </div>
                                </td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.red, textAlign:'center', fontFamily:'monospace' }}>{issue.negative.toLocaleString()}</td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, textAlign:'center' }}>
                                  <span style={{
                                    background: issue.neg_pct>70 ? C.red+'20' : issue.neg_pct>40 ? C.amber+'20' : C.green+'20',
                                    color: issue.neg_pct>70 ? C.red : issue.neg_pct>40 ? C.amber : C.green,
                                    borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, fontFamily:'monospace',
                                  }}>{issue.neg_pct}%</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
                        <button onClick={() => exportCSV(
                          repIssues.map(i => ({
                            'Issue Type': i.issue,
                            'Count': i.count,
                            '% of Total': i.percentage+'%',
                            'Negative': i.negative,
                            'Negative %': i.neg_pct+'%',
                            'Positive': i.positive,
                          })), 'repetitive_issues'
                        )}
                          style={{
                            background:C.green+'18', border:`1px solid ${C.green}50`,
                            color:C.green, borderRadius:10, padding:'10px 20px',
                            fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit', letterSpacing:1,
                            display:'flex', alignItems:'center', gap:8,
                          }}
                        >
                          ⬇ Export Issues
                          <span style={{ fontSize:10, fontWeight:400, color:C.dim }}>({repIssues.length} issues)</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ AI AGENTS PAGE ═══ */}
        {page === 'agents' && (
          <div style={{ padding:'24px' }}>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ fontSize:20, fontWeight:900, color:C.cyan, margin:0, letterSpacing:1 }}>AI Agents</h1>
              <p style={{ fontSize:11, color:C.sub, margin:'4px 0 0' }}>Microsoft Copilot powered agents for NTT Data</p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>

              {/* Agent 1 */}
              {[
                {
                  icon:'🎫', title:'Ticket Router', color:C.cyan,
                  desc:'Routes IT complaints to correct teams automatically with priority assignment and self help steps',
                  caps:['Auto categorize IT issues','Assign P1 P2 P3 P4 priority','Route to correct NTT team','Generate ticket number','Provide self help steps'],
                  howto:['Click Open Ticket Router','Copilot opens in new tab','Select Ticket Router agent','Describe your IT issue','Get ticket + self help steps'],
                  btnLabel:'🚀 Open Ticket Router',
                  btnStyle: { background:`linear-gradient(135deg,${C.cyan},${C.violet})` },
                  onClick: () => {
                    window.open('https://copilot.microsoft.com','_blank')
                    notify('Copilot opened! Select Ticket Router agent', C.cyan)
                  }
                },
                {
                  icon:'📊', title:'Sentiment Analyst', color:C.green,
                  desc:'Analyzes CSAT DSAT scores, identifies team patterns and gives actionable recommendations',
                  caps:['CSAT DSAT health analysis','Team performance comparison','Regional insights','Trend identification','Actionable recommendations'],
                  howto:['Import your data first','Click Copy Data + Open below','Metrics copied to clipboard','Select Sentiment Analyst','Press Ctrl+V to get analysis'],
                  btnLabel: metrics ? '📋 Copy Data + Open Agent' : '⚠ Import Data First',
                  btnStyle: { background: metrics ? `linear-gradient(135deg,${C.green},${C.cyan})` : C.bg2,
                              border: metrics ? 'none' : `1px solid ${C.border}`,
                              color: metrics ? '#000' : C.dim,
                              cursor: metrics ? 'pointer' : 'not-allowed' },
                  onClick: () => {
                    const text = buildMetricsText(false)
                    if (text) {
                      navigator.clipboard.writeText(text).then(() => {
                        notify('Metrics copied! Open Copilot and paste to Sentiment Analyst', C.green)
                        window.open('https://copilot.microsoft.com','_blank')
                      })
                    } else {
                      notify('Import data first!', C.amber, '⚠')
                    }
                  }
                },
                {
                  icon:'📝', title:'Research Reporter', color:C.amber,
                  desc:'Generates executive summaries, weekly reports, monthly analysis and business insights',
                  caps:['Executive summaries','Weekly operations report','Monthly trend analysis','Team performance reports','Regional analysis reports'],
                  howto:['Import your data first','Click Copy Data + Open below','Report data copied','Select Research Reporter','Press Ctrl+V to get report'],
                  btnLabel: metrics ? '📄 Copy Data + Open Agent' : '⚠ Import Data First',
                  btnStyle: { background: metrics ? `linear-gradient(135deg,${C.amber},${C.red})` : C.bg2,
                              border: metrics ? 'none' : `1px solid ${C.border}`,
                              color: metrics ? '#000' : C.dim,
                              cursor: metrics ? 'pointer' : 'not-allowed' },
                  onClick: () => {
                    const text = buildMetricsText(true)
                    if (text) {
                      navigator.clipboard.writeText(text).then(() => {
                        notify('Report data copied! Open Copilot and paste to Research Reporter', C.green)
                        window.open('https://copilot.microsoft.com','_blank')
                      })
                    } else {
                      notify('Import data first!', C.amber, '⚠')
                    }
                  }
                },
              ].map((agent, ai) => (
                <div key={ai} style={{
                  background:C.panel, border:`1px solid ${C.border}`,
                  borderRadius:14, padding:'20px',
                  display:'flex', flexDirection:'column', gap:12,
                }}>
                  <div style={{ fontSize:40, textAlign:'center' }}>{agent.icon}</div>
                  <div style={{ fontSize:14, fontWeight:900, color:agent.color, textAlign:'center' }}>
                    {agent.title}
                  </div>
                  <div style={{ fontSize:10, color:C.sub, textAlign:'center', lineHeight:1.7 }}>
                    {agent.desc}
                  </div>
                  <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px' }}>
                    <div style={{ color:agent.color, fontWeight:700, marginBottom:6, fontSize:10 }}>CAPABILITIES</div>
                    {agent.caps.map((cap,ci) => (
                      <div key={ci} style={{ marginBottom:4, fontSize:10, color:C.sub }}>✓ {cap}</div>
                    ))}
                  </div>
                  <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px' }}>
                    <div style={{ color:C.dim, marginBottom:4, fontWeight:700, fontSize:9 }}>HOW TO USE</div>
                    {agent.howto.map((step,si) => (
                      <div key={si} style={{ fontSize:9, color:C.sub, lineHeight:1.8 }}>
                        {si+1}. {step}
                      </div>
                    ))}
                  </div>
                  <button onClick={agent.onClick} style={{
                    border:'none', borderRadius:10, padding:'12px',
                    fontSize:12, fontWeight:900, fontFamily:'inherit',
                    ...agent.btnStyle,
                  }}>
                    {agent.btnLabel}
                  </button>
                </div>
              ))}
            </div>

            {/* How to Use Guide */}
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'20px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.cyan, marginBottom:16 }}>📖 How to Use the Agents</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                {[
                  { title:'🎫 Ticket Router', color:C.cyan,
                    steps:['Click Open Ticket Router','Copilot opens in new tab','Select Ticket Router agent','Type your IT issue','Get ticket number + steps'] },
                  { title:'📊 Sentiment Analyst', color:C.green,
                    steps:['Import data file first','Click Copy Data + Open Agent','Metrics copied to clipboard','Select Sentiment Analyst in Copilot','Press Ctrl+V then get analysis'] },
                  { title:'📝 Research Reporter', color:C.amber,
                    steps:['Import data file first','Click Copy Data + Open Agent','Report data copied','Select Research Reporter in Copilot','Press Ctrl+V then ask for report'] },
                ].map((agent, ai) => (
                  <div key={ai}>
                    <div style={{ fontSize:11, fontWeight:700, color:agent.color, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
                      {agent.title}
                    </div>
                    {agent.steps.map((step, si) => (
                      <div key={si} style={{ fontSize:10, color:C.sub, marginBottom:6, display:'flex', gap:6, alignItems:'flex-start' }}>
                        <span style={{ color:agent.color, flexShrink:0 }}>{si+1}.</span>
                        {step}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Data Status */}
            <div style={{
              background:C.panel,
              border:`1px solid ${metrics ? C.green : C.amber}30`,
              borderRadius:12, padding:'16px 20px',
            }}>
              {metrics ? (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:C.green, marginBottom:12 }}>
                    ✅ Current Data Ready for Agents
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                    {[
                      ['Total Records', metrics.total?.toLocaleString()],
                      ['CSAT', `${metrics.csat_pct}%`],
                      ['DSAT', `${metrics.dsat_pct}%`],
                      ['Neutral', `${metrics.neutral_pct}%`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background:C.bg2, borderRadius:8, padding:'10px', textAlign:'center' }}>
                        <div style={{ fontSize:9, color:C.dim, marginBottom:4, letterSpacing:1, textTransform:'uppercase' }}>{label}</div>
                        <div style={{ fontSize:16, fontWeight:900, color:C.cyan, fontFamily:'monospace' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, fontSize:9, color:C.dim }}>
                    File: {fileMeta?.name} · {fileMeta?.rows?.toLocaleString()} rows
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:11, color:C.amber, fontWeight:700, marginBottom:8 }}>
                    ⚠ Import data to use Sentiment Analyst and Research Reporter!
                  </div>
                  <div style={{ fontSize:10, color:C.dim, marginBottom:12 }}>Ticket Router works without data</div>
                  <button onClick={() => setPage('data')} style={{
                    background:C.cyan+'18', border:`1px solid ${C.cyan}50`,
                    color:C.cyan, borderRadius:8, padding:'8px 16px',
                    fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  }}>Go to Data Section →</button>
                </div>
              )}
            </div>
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
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:${C.dim}}
      `}</style>
    </div>
  )
}
