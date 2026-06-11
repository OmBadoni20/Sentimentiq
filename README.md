import { useState } from 'react'

const USERS = {
  'om.badoni': { password:'NTT@2026',     role:'Developer', name:'Om Badoni'   },
  'manager':   { password:'Manager@2026', role:'Manager',   name:'NTT Manager' },
  'admin':     { password:'Admin@2026',   role:'Admin',     name:'Admin User'  },
}

const C = {
  bg0:'#07090f', bg2:'#161b22', panel:'#13181f', border:'#21262d',
  cyan:'#58a6ff', red:'#f85149', violet:'#bc8cff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Please enter your username'); return }
    if (!password.trim()) { setError('Please enter your password'); return }
    setLoading(true)
    setTimeout(() => {
      const user = USERS[username.trim().toLowerCase()]
      if (user && user.password === password) {
        onLogin({ username: username.trim(), name: user.name, role: user.role })
      } else {
        setError('Invalid username or password')
        setLoading(false)
      }
    }, 600)
  }

  const inp = {
    width:'100%', background:C.bg2,
    border:`1px solid ${C.border}`, borderRadius:9,
    padding:'12px 14px', color:C.text, fontSize:13,
    fontFamily:'inherit', outline:'none', boxSizing:'border-box',
    transition:'border-color .2s',
  }

  return (
    <div style={{
      minHeight:'100vh', background:C.bg0,
      display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column',
      fontFamily:"'IBM Plex Mono','Courier New',monospace", padding:20,
    }}>

      {/* background grid */}
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage:`linear-gradient(${C.border}44 1px,transparent 1px),
                         linear-gradient(90deg,${C.border}44 1px,transparent 1px)`,
        backgroundSize:'40px 40px',
      }}/>
      <div style={{
        position:'fixed', top:'30%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:500, height:300,
        background:`radial-gradient(ellipse,${C.cyan}14 0%,transparent 70%)`,
        pointerEvents:'none', zIndex:0,
      }}/>

      {/* card */}
      <div style={{
        position:'relative', zIndex:1,
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:18, padding:'44px 44px 36px',
        width:'100%', maxWidth:420,
        boxShadow:`0 0 60px ${C.cyan}12`,
      }}>

        {/* logo */}
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
          <div style={{ fontSize:11, color:C.dim, marginTop:5, letterSpacing:1.5 }}>
            NTT DATA · AI ANALYTICS PLATFORM
          </div>
          <div style={{
            marginTop:10, fontSize:10,
            color:C.dim, letterSpacing:1,
          }}>
            v1.0.0 · Internal Use Only
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{
          display:'flex', flexDirection:'column', gap:18,
        }}>

          {/* username */}
          <div>
            <label style={{
              display:'block', fontSize:11, color:C.sub,
              letterSpacing:1.5, fontWeight:700,
              marginBottom:8, textTransform:'uppercase',
            }}>Username</label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username" spellCheck={false}
              style={inp}
              onFocus={e => (e.target.style.borderColor = C.cyan)}
              onBlur={e  => (e.target.style.borderColor = C.border)}
            />
          </div>

          {/* password */}
          <div>
            <label style={{
              display:'block', fontSize:11, color:C.sub,
              letterSpacing:1.5, fontWeight:700,
              marginBottom:8, textTransform:'uppercase',
            }}>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...inp, paddingRight:44 }}
                onFocus={e => (e.target.style.borderColor = C.cyan)}
                onBlur={e  => (e.target.style.borderColor = C.border)}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position:'absolute', right:12, top:'50%',
                  transform:'translateY(-50%)',
                  background:'transparent', border:'none',
                  color:C.dim, cursor:'pointer', fontSize:16, padding:4,
                }}
              >{showPwd ? '🙈' : '👁️'}</button>
            </div>
          </div>

          {/* error */}
          {error && (
            <div style={{
              background:C.red+'15', border:`1px solid ${C.red}40`,
              borderRadius:8, padding:'10px 13px',
              fontSize:12, color:C.red, fontWeight:600,
            }}>⚠ {error}</div>
          )}

          {/* submit */}
          <button
            type="submit" disabled={loading}
            style={{
              background: loading
                ? C.dim
                : `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border:'none', borderRadius:10, padding:14,
              width:'100%', color: loading ? C.sub : '#000',
              fontSize:14, fontWeight:900,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'inherit', letterSpacing:1,
              marginTop:4,
            }}
          >{loading ? 'Signing in…' : 'SIGN IN →'}</button>
        </form>
      </div>

      {/* version footer */}
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







import * as XLSX from 'xlsx'

// ── CSV ───────────────────────────────────────────────────
export function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (!lines.length) return []
  const headers = lines[0].split(',').map(h =>
    h.trim().replace(/^"|"$/g, '')
  )
  return lines.slice(1).map(line => {
    const vals = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    vals.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

// ── Excel ─────────────────────────────────────────────────
export function parseExcel(buffer) {
  const wb   = XLSX.read(buffer, { type:'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval:'' })
  return { rows, sheet: wb.SheetNames[0] }
}

// ── JSON ──────────────────────────────────────────────────
export function parseJSON(text) {
  const data = JSON.parse(text)
  if (Array.isArray(data)) return data
  if (typeof data === 'object' && data !== null) {
    // Check if it's an object with array values
    const firstVal = Object.values(data)[0]
    if (Array.isArray(firstVal)) return firstVal
    return [data]
  }
  return [{ value: String(data) }]
}

// ── TXT ───────────────────────────────────────────────────
export function parseTXT(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (!lines.length) return []

  // Try tab separated
  if (lines[0].includes('\t')) {
    const headers = lines[0].split('\t').map(h => h.trim())
    return lines.slice(1).map(line => {
      const vals = line.split('\t').map(v => v.trim())
      const obj  = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
  }

  // Try comma separated
  if (lines[0].includes(',')) {
    return parseCSV(text)
  }

  // Try key: value pairs
  if (lines[0].includes(':')) {
    const rows = []
    let currentRow = {}
    let rowCount   = 0
    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim().replace(/\s+/g, '_')
        const val = line.slice(colonIdx + 1).trim()
        currentRow[key] = val
        rowCount++
        if (rowCount % 5 === 0) {
          rows.push({ ...currentRow })
          currentRow = {}
        }
      }
    }
    if (Object.keys(currentRow).length) rows.push(currentRow)
    return rows.length ? rows : lines.map((l, i) => ({
      Line: i + 1, Content: l.trim()
    }))
  }

  // Plain text fallback
  return lines.map((l, i) => ({ Line: i + 1, Content: l.trim() }))
}

// ── Main readFile ─────────────────────────────────────────
export function readFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('No file selected')); return }
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const rows = parseCSV(e.target.result)
          if (!rows.length) throw new Error('File is empty')
          resolve({ rows, fileName: file.name, type: 'CSV' })
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)

    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const { rows, sheet } = parseExcel(e.target.result)
          if (!rows.length) throw new Error('Excel file is empty')
          resolve({ rows, fileName: file.name, type: 'Excel', sheet })
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)

    } else if (ext === 'json') {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const rows = parseJSON(e.target.result)
          if (!rows.length) throw new Error('JSON file is empty')
          resolve({ rows, fileName: file.name, type: 'JSON' })
        } catch (err) {
          reject(new Error('Invalid JSON: ' + err.message))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)

    } else if (ext === 'txt') {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const rows = parseTXT(e.target.result)
          if (!rows.length) throw new Error('TXT file is empty')
          resolve({ rows, fileName: file.name, type: 'TXT' })
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)

    } else {
      reject(new Error(
        `File type .${ext} not supported. Use CSV, Excel, JSON or TXT.`
      ))
    }
  })
}






import { useState, useMemo } from 'react'

const PAGE_SIZE = 200   // ← 200 rows per page as manager asked

const C = {
  bg0:'#07090f', bg2:'#161b22', panel:'#13181f', border:'#21262d',
  cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

const BADGE_MAP = {
  Positive:  {bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  Negative:  {bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  Neutral:   {bg:'#d2992218',c:'#d29922',bd:'#d2992240'},
  Promoter:  {bg:'#58a6ff18',c:'#58a6ff',bd:'#58a6ff40'},
  Detractor: {bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  Passive:   {bg:'#bc8cff18',c:'#bc8cff',bd:'#bc8cff40'},
  Yes:       {bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  No:        {bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  P1:        {bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  P2:        {bg:'#d2992218',c:'#d29922',bd:'#d2992240'},
  P3:        {bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  '1':       {bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  '0':       {bg:'#48484818',c:'#484f58',bd:'#48484840'},
}
const BADGE_COLS = new Set([
  'Predicted_Sentiment','NPS_Category','SLA_Breached',
  'Priority','CSAT','DSAT','Status','status',
  'ISHAPPY','ISSAD','ISPASSIVE',
])
const EMAIL_COLS = new Set([
  'Employee_Email','Client_Email','email','Email',
  'USER EMAIL','user email','ASSIGNED TOEMAIL',
])

function Badge({ v }) {
  const s = BADGE_MAP[String(v)]
  if (!s) return <span style={{ color:C.text, fontSize:11 }}>{v}</span>
  return (
    <span style={{
      background:s.bg, color:s.c,
      border:`1px solid ${s.bd}`,
      borderRadius:5, padding:'2px 9px',
      fontSize:11, fontWeight:700, whiteSpace:'nowrap',
    }}>{v}</span>
  )
}

// ── Empty Excel-like table ────────────────────────────────
function EmptyTable() {
  const cols = ['A','B','C','D','E','F','G','H','I','J']
  const rows = 12

  return (
    <div style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:12, overflow:'hidden',
    }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:C.bg2 }}>
              {/* row number col */}
              <th style={{
                width:40, padding:'9px 8px',
                borderBottom:`1px solid ${C.border}`,
                borderRight:`1px solid ${C.border}`,
                color:C.dim, fontSize:10, fontWeight:700,
                position:'sticky', top:0, background:C.bg2,
              }}>#</th>
              {cols.map(c => (
                <th key={c} style={{
                  padding:'9px 60px',
                  borderBottom:`1px solid ${C.border}`,
                  borderRight:`1px solid ${C.border}22`,
                  color:C.dim, fontSize:11, fontWeight:700,
                  letterSpacing:1, textAlign:'center',
                  position:'sticky', top:0, background:C.bg2,
                  minWidth:120,
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, ri) => (
              <tr key={ri} style={{
                borderBottom:`1px solid ${C.border}22`,
                background: ri%2 ? '#ffffff03' : 'transparent',
              }}>
                <td style={{
                  padding:'8px', textAlign:'center',
                  color:C.dim, fontSize:10, fontWeight:700,
                  borderRight:`1px solid ${C.border}`,
                  background:C.bg2+'88',
                }}>{ri+1}</td>
                {cols.map(c => (
                  <td key={c} style={{
                    padding:'8px 12px',
                    borderRight:`1px solid ${C.border}22`,
                    minWidth:120, height:36,
                  }}/>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* center message */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        textAlign:'center', pointerEvents:'none',
      }}>
        <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
        <div style={{ fontSize:13, fontWeight:700, color:C.sub }}>
          Import a file to see data
        </div>
        <div style={{ fontSize:11, color:C.dim, marginTop:4 }}>
          CSV · Excel · JSON · TXT
        </div>
      </div>
    </div>
  )
}

function PaginationBar({ page, totalPages, setPage, totalFiltered }) {
  if (totalPages <= 1) return null

  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, totalFiltered)

  function pgBtn(label, onClick, disabled, active) {
    return (
      <button
        key={label}
        onClick={onClick}
        disabled={disabled}
        style={{
          background: active ? C.cyan : disabled ? 'transparent' : C.bg2,
          border:`1px solid ${active ? C.cyan : C.border}`,
          color: active ? '#000' : disabled ? C.dim : C.text,
          borderRadius:7, padding:'5px 11px',
          fontSize:11, fontWeight:700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily:'inherit', opacity: disabled ? 0.4 : 1,
          minWidth:34,
        }}
      >{label}</button>
    )
  }

  const from     = Math.max(1, page - 2)
  const to       = Math.min(totalPages, page + 2)
  const pageNums = []
  for (let i = from; i <= to; i++) pageNums.push(i)

  return (
    <div style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:10, padding:'10px 16px',
      display:'flex', alignItems:'center',
      justifyContent:'space-between',
      flexWrap:'wrap', gap:10,
    }}>
      <div style={{ fontSize:11, color:C.sub }}>
        Rows{' '}
        <strong style={{ color:C.cyan }}>{start.toLocaleString()}</strong>
        {' – '}
        <strong style={{ color:C.cyan }}>{end.toLocaleString()}</strong>
        {' of '}
        <strong style={{ color:C.text }}>{totalFiltered.toLocaleString()}</strong>
        {' · Page '}
        <strong style={{ color:C.cyan }}>{page}</strong>
        {' of '}
        <strong style={{ color:C.text }}>{totalPages}</strong>
        <span style={{ color:C.dim }}> · {PAGE_SIZE} per page</span>
      </div>

      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {pgBtn('«', () => setPage(1), page===1, false)}
        {pgBtn('‹', () => setPage(p=>p-1), page===1, false)}
        {from>1 && <>
          {pgBtn('1', ()=>setPage(1), false, false)}
          {from>2 && <span style={{color:C.dim,padding:'0 2px'}}>…</span>}
        </>}
        {pageNums.map(p => pgBtn(String(p), ()=>setPage(p), false, p===page))}
        {to<totalPages && <>
          {to<totalPages-1 &&
            <span style={{color:C.dim,padding:'0 2px'}}>…</span>}
          {pgBtn(String(totalPages), ()=>setPage(totalPages), false, false)}
        </>}
        {pgBtn('›', ()=>setPage(p=>p+1), page===totalPages, false)}
        {pgBtn('»', ()=>setPage(totalPages), page===totalPages, false)}
      </div>
    </div>
  )
}

export default function DataTable({ rows }) {
  const [search,    setSearch]    = useState('')
  const [sortCol,   setSortCol]   = useState(null)
  const [sortDir,   setSortDir]   = useState('asc')
  const [colFilter, setColFilter] = useState({})
  const [page,      setPage]      = useState(1)

  // ── Empty state — show Excel-like empty table ─────────
  if (!rows || rows.length === 0) {
    return (
      <div style={{ position:'relative' }}>
        <EmptyTable/>
      </div>
    )
  }

  const cols = Object.keys(rows[0])

  const uniqueValues = useMemo(() => {
    const map = {}
    cols.forEach(col => {
      const vals = [...new Set(rows.map(r => String(r[col] ?? '')))]
      if (vals.length <= 30) map[col] = vals
    })
    return map
  }, [rows])

  function doSort(col) {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }
  function doFilter(col, val) {
    setColFilter(prev => ({ ...prev, [col]: val }))
    setPage(1)
  }
  function doSearch(val) { setSearch(val); setPage(1) }
  function clearAll() {
    setSearch(''); setColFilter({})
    setSortCol(null); setSortDir('asc'); setPage(1)
  }

  const filtered = useMemo(() => {
    let data = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(q)
        )
      )
    }
    Object.entries(colFilter).forEach(([col, val]) => {
      if (val && val !== 'All') {
        data = data.filter(row =>
          String(row[col]??'').toLowerCase() === val.toLowerCase()
        )
      }
    })
    if (sortCol) {
      data = [...data].sort((a, b) => {
        const av = String(a[sortCol]??'')
        const bv = String(b[sortCol]??'')
        const nA = parseFloat(av), nB = parseFloat(bv)
        const cmp = !isNaN(nA)&&!isNaN(nB) ? nA-nB : av.localeCompare(bv)
        return sortDir==='asc' ? cmp : -cmp
      })
    }
    return data
  }, [rows, search, colFilter, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage    = Math.min(page, totalPages)
  const sliced     = filtered.slice(
    (curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE
  )
  const hasFilters = search ||
    Object.values(colFilter).some(v => v && v !== 'All')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {/* toolbar */}
      <div style={{
        display:'flex', gap:10, alignItems:'center', flexWrap:'wrap',
      }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{
            position:'absolute', left:11, top:'50%',
            transform:'translateY(-50%)',
            color:C.dim, fontSize:13, pointerEvents:'none',
          }}>🔍</span>
          <input
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Search across all columns…"
            style={{
              width:'100%', background:C.bg2,
              border:`1px solid ${C.border}`,
              borderRadius:8, padding:'8px 12px 8px 32px',
              color:C.text, fontSize:12,
              fontFamily:'inherit', outline:'none', boxSizing:'border-box',
            }}
          />
        </div>
        <div style={{ fontSize:11, color:C.sub, whiteSpace:'nowrap' }}>
          <strong style={{ color:C.cyan }}>
            {filtered.length.toLocaleString()}
          </strong>
          {' of '}
          <strong style={{ color:C.text }}>
            {rows.length.toLocaleString()}
          </strong>
          {' rows'}
        </div>
        {hasFilters && (
          <button onClick={clearAll} style={{
            background:C.red+'18', border:`1px solid ${C.red}50`,
            color:C.red, borderRadius:7, padding:'6px 12px',
            fontSize:11, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>✕ Clear</button>
        )}
      </div>

      {/* pagination top */}
      <PaginationBar
        page={curPage} totalPages={totalPages}
        setPage={setPage} totalFiltered={filtered.length}
      />

      {/* table */}
      <div style={{
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:12, overflow:'hidden',
      }}>
        <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'50vh' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg0 }}>
                {cols.map(col => (
                  <th key={col} onClick={() => doSort(col)} style={{
                    padding:'10px 14px', textAlign:'left',
                    color:C.cyan, fontWeight:700, fontSize:10,
                    letterSpacing:1.4, textTransform:'uppercase',
                    whiteSpace:'nowrap',
                    borderBottom:`1px solid ${C.border}`,
                    cursor:'pointer', userSelect:'none',
                    position:'sticky', top:0, background:C.bg0,
                  }}>
                    {col.replace(/_/g,' ')}
                    <span style={{
                      marginLeft:4,
                      color:sortCol===col ? C.cyan : C.dim,
                    }}>
                      {sortCol===col
                        ? (sortDir==='asc' ? '↑' : '↓')
                        : '⇅'}
                    </span>
                  </th>
                ))}
              </tr>
              <tr style={{ background:C.bg0 }}>
                {cols.map(col => {
                  const opts = uniqueValues[col]
                  return (
                    <th key={col} style={{
                      padding:'4px 8px',
                      borderBottom:`2px solid ${C.cyan}33`,
                      position:'sticky', top:37, background:C.bg0,
                    }}>
                      {opts ? (
                        <select
                          value={colFilter[col]||'All'}
                          onChange={e => doFilter(col, e.target.value)}
                          style={{
                            background:C.panel,
                            border:`1px solid ${colFilter[col]&&colFilter[col]!=='All'?C.cyan:C.border}`,
                            borderRadius:5,
                            color:colFilter[col]&&colFilter[col]!=='All'
                              ? C.cyan : C.dim,
                            fontSize:10, padding:'3px 6px',
                            fontFamily:'inherit', cursor:'pointer',
                            width:'100%', outline:'none',
                          }}
                        >
                          <option value="All">All</option>
                          {opts.sort().map(v => (
                            <option key={v} value={v}>{v||'(empty)'}</option>
                          ))}
                        </select>
                      ) : <div style={{ height:24 }}/>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sliced.map((row, ri) => (
                <tr key={ri} style={{
                  borderBottom:`1px solid ${C.border}22`,
                  background:ri%2 ? '#ffffff04' : 'transparent',
                  transition:'background .1s',
                }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.background = C.cyan+'0a')}
                  onMouseLeave={e =>
                    (e.currentTarget.style.background =
                      ri%2 ? '#ffffff04' : 'transparent')}
                >
                  {cols.map(col => (
                    <td key={col} style={{
                      padding:'9px 14px', whiteSpace:'nowrap',
                    }}>
                      {BADGE_COLS.has(col)
                        ? <Badge v={String(row[col]??'')}/>
                        : EMAIL_COLS.has(col)
                        ? <span style={{ color:C.violet, fontSize:11 }}>
                            {row[col]}
                          </span>
                        : <span style={{ color:C.text }}>
                            {String(row[col]??'').length>48
                              ? String(row[col]).slice(0,48)+'…'
                              : row[col]}
                          </span>}
                    </td>
                  ))}
                </tr>
              ))}
              {!sliced.length && (
                <tr><td colSpan={cols.length} style={{
                  padding:40, textAlign:'center', color:C.dim,
                }}>No records match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* pagination bottom */}
      <PaginationBar
        page={curPage} totalPages={totalPages}
        setPage={setPage} totalFiltered={filtered.length}
      />

      <style>{`
        select option{background:${C.bg2};color:${C.text}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#07090f}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
      `}</style>
    </div>
  )
}





import { useState, useRef, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import DataTable    from '../components/DataTable.jsx'
import { readFile } from '../utils/fileParser.js'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff', sky:'#79c0ff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}
const TT = {
  background:C.panel, border:`1px solid ${C.border}`,
  borderRadius:8, fontSize:11, color:C.text,
}

function findCol(row, ...names) {
  const keys = Object.keys(row)
  for (const name of names) {
    const f = keys.find(
      k => k.trim().toLowerCase().replace(/\s+/g,'')
        === name.toLowerCase().replace(/\s+/g,'')
    )
    if (f) return f
  }
  return null
}

function isTrue(val) {
  if (val===null||val===undefined) return false
  return val===1||val===true||
    String(val).trim().toLowerCase()==='1'||
    String(val).trim().toLowerCase()==='true'||
    String(val).trim().toLowerCase()==='yes'
}

function calcMetrics(rows) {
  if (!rows||!rows.length) return null
  const s = rows[0]

  const csatCol    = findCol(s,'ISHAPPY','ishappy','CSAT','csat')
  const dsatCol    = findCol(s,'ISSAD','issad','DSAT','dsat')
  const passiveCol = findCol(s,'ISPASSIVE','ispassive')
  const sentCol    = findCol(s,'Predicted_Sentiment','predicted_sentiment','Sentiment')
  const teamCol    = findCol(s,'TEAM','Team','Department','department')
  const regionCol  = findCol(s,'REGION','Region','Industry','industry')

  let csatN=0, dsatN=0, posN=0, negN=0, neuN=0
  const byTeam={}, byRegion={}

  rows.forEach(r => {
    const cv = r[csatCol]
    const dv = r[dsatCol]
    const pv = r[passiveCol]

    if (csatCol&&isTrue(cv)) csatN++
    if (dsatCol&&isTrue(dv)) dsatN++

    if (sentCol) {
      const sv = String(r[sentCol]??'').trim().toLowerCase()
      if      (sv==='positive') posN++
      else if (sv==='negative') negN++
      else if (sv==='neutral')  neuN++
    } else {
      if      (isTrue(cv)) posN++
      else if (isTrue(dv)) negN++
      else if (isTrue(pv)) neuN++
    }

    // team
    if (teamCol) {
      const k = String(r[teamCol]??'').trim()
      if (k&&k!=='nan') {
        if (!byTeam[k]) byTeam[k]={name:k,csat:0,dsat:0,total:0}
        byTeam[k].total++
        if (isTrue(cv)) byTeam[k].csat++
        if (isTrue(dv)) byTeam[k].dsat++
      }
    }

    // region
    if (regionCol) {
      const k = String(r[regionCol]??'').trim()
      if (k&&k!=='nan') {
        if (!byRegion[k]) byRegion[k]={name:k,csat:0,dsat:0,total:0}
        byRegion[k].total++
        if (isTrue(cv)) byRegion[k].csat++
        if (isTrue(dv)) byRegion[k].dsat++
      }
    }
  })

  const total = rows.length
  const pct   = n => total ? parseFloat((n/total*100).toFixed(1)) : 0

  return {
    total, csatN, dsatN, posN, negN, neuN,
    csatPct: pct(csatN), dsatPct: pct(dsatN),
    posPct: pct(posN),   negPct: pct(negN),
    neuPct: pct(neuN),

    teamData: Object.values(byTeam)
      .map(d=>({
        name: d.name,
        'CSAT%': d.total?parseFloat((d.csat/d.total*100).toFixed(1)):0,
        'DSAT%': d.total?parseFloat((d.dsat/d.total*100).toFixed(1)):0,
      }))
      .sort((a,b)=>b['CSAT%']-a['CSAT%']).slice(0,10),

    regionData: Object.values(byRegion)
      .map(d=>({
        name: d.name,
        'CSAT%': d.total?parseFloat((d.csat/d.total*100).toFixed(1)):0,
        'DSAT%': d.total?parseFloat((d.dsat/d.total*100).toFixed(1)):0,
      }))
      .sort((a,b)=>b['CSAT%']-a['CSAT%']).slice(0,10),
  }
}

function KPI({ label, value, sub, accent }) {
  return (
    <div style={{
      background:C.panel, border:`1px solid ${accent}33`,
      borderRadius:12, padding:'16px 20px',
    }}>
      <div style={{
        fontSize:10, color:C.sub, letterSpacing:1.5,
        textTransform:'uppercase', marginBottom:6, fontFamily:'monospace',
      }}>{label}</div>
      <div style={{
        fontSize:30, fontWeight:900, color:accent,
        fontFamily:'monospace', lineHeight:1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize:11, color:C.dim, marginTop:5 }}>{sub}</div>
      )}
      <div style={{
        marginTop:10, height:3,
        background:accent+'20', borderRadius:2,
      }}>
        <div style={{
          height:'100%',
          width:`${Math.min(parseFloat(value)||0, 100)}%`,
          background:accent, borderRadius:2, transition:'width .5s',
        }}/>
      </div>
    </div>
  )
}

function ChartBox({ title, sub, children }) {
  return (
    <div style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:12, padding:'18px 20px',
    }}>
      <div style={{
        fontSize:12, fontWeight:700, color:C.text, marginBottom:2,
      }}>{title}</div>
      {sub && (
        <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>{sub}</div>
      )}
      {!sub && <div style={{ marginBottom:14 }}/>}
      {children}
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

export default function Dashboard({ user, rows, setRows, onLogout }) {
  const [fileMeta, setFileMeta] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [toast,    setToast]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  function notify(msg, color, icon='✓') {
    setToast({ msg, color, icon })
    setTimeout(() => setToast(null), 3000)
  }

  async function processFile(file) {
    if (!file) return
    setError(''); setLoading(true)
    setRows([]); setFileMeta(null)
    try {
      const result = await readFile(file)
      if (!result.rows.length) throw new Error('No data rows found')
      setTimeout(() => {
        setRows(result.rows)
        setFileMeta({ name:result.fileName, type:result.type, sheet:result.sheet })
        setLoading(false)
        notify(`Imported ${result.rows.length.toLocaleString()} rows from "${result.fileName}"`, C.green)
      }, 50)
    } catch (err) {
      setError(err.message)
      notify(err.message, C.red, '⚠')
      setLoading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])
  }

  function exportCSV() {
    if (!rows.length) return
    const h = Object.keys(rows[0]).join(',')
    const b = rows.map(r =>
      Object.values(r)
        .map(v => `"${String(v??'').replace(/"/g,'""')}"`)
        .join(',')
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob([h+'\n'+b], { type:'text/csv' })
    )
    a.download = `sentimentiq_${Date.now()}.csv`
    a.click()
    notify('CSV exported!', C.green)
  }

  const m = useMemo(() => calcMetrics(rows), [rows])
  const ROLE_COLOR = { Admin:C.red, Manager:C.amber, Developer:C.cyan }
  const roleColor  = ROLE_COLOR[user.role] || C.violet

  // Chart data
  const sentBarData = m ? [
    { name:'Positive', value:m.posN,  pct:m.posPct },
    { name:'Negative', value:m.negN,  pct:m.negPct },
    { name:'Neutral',  value:m.neuN,  pct:m.neuPct },
  ] : []

  const csatDsatBar = m ? [
    { name:'CSAT', value:m.csatPct, fill:C.green },
    { name:'DSAT', value:m.dsatPct, fill:C.red   },
  ] : []

  return (
    <div style={{
      minHeight:'100vh', background:C.bg0, color:C.text,
      fontFamily:"'IBM Plex Mono','Courier New',monospace",
    }}>
      <Toast toast={toast}/>

      {/* Header */}
      <header style={{
        background:C.bg1, borderBottom:`1px solid ${C.border}`,
        height:56, display:'flex', alignItems:'center',
        padding:'0 24px', gap:14,
        position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:30, height:30, borderRadius:8,
            background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:15,
          }}>⚡</div>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:C.cyan, letterSpacing:2 }}>
              SENTIMENTIQ
            </div>
            <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5 }}>
              NTT DATA · AI ANALYTICS PLATFORM
            </div>
          </div>
        </div>

        <div style={{ flex:1 }}/>

        {fileMeta && (
          <div style={{
            background:C.violet+'12', border:`1px solid ${C.violet}40`,
            borderRadius:7, padding:'4px 12px',
            fontSize:10, color:C.violet,
          }}>
            📁 {fileMeta.name}
            <span style={{ color:C.dim }}>
              {' '}· {m?.total?.toLocaleString()} rows
            </span>
          </div>
        )}

        <div style={{
          background:roleColor+'12', border:`1px solid ${roleColor}40`,
          borderRadius:7, padding:'4px 12px',
          fontSize:10, color:roleColor, fontWeight:700,
        }}>
          👤 {user.name}
          <span style={{ color:C.dim, fontWeight:400 }}>
            {' '}· {user.role}
          </span>
        </div>

        <button onClick={onLogout} style={{
          background:C.red+'15', border:`1px solid ${C.red}40`,
          color:C.red, borderRadius:7, padding:'5px 14px',
          fontSize:11, fontWeight:700,
          cursor:'pointer', fontFamily:'inherit',
        }}>Sign Out</button>
      </header>

      <main style={{ padding:'22px 24px', maxWidth:1400, margin:'0 auto' }}>

        {/* Import bar — always visible at top */}
        <div style={{
          background:C.panel, border:`1px solid ${C.border}`,
          borderRadius:12, padding:'14px 20px',
          display:'flex', alignItems:'center',
          justifyContent:'space-between',
          flexWrap:'wrap', gap:12, marginBottom:20,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:22 }}>📁</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text }}>
                {fileMeta
                  ? `${fileMeta.name} — ${m?.total?.toLocaleString()} rows loaded`
                  : 'Import Data'}
              </div>
              <div style={{ fontSize:10, color:C.sub, marginTop:2 }}>
                CSV · Excel · JSON · TXT
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <input
              ref={fileRef} type="file"
              accept=".csv,.xlsx,.xls,.json,.txt"
              style={{ display:'none' }}
              onChange={e => {
                if (e.target.files[0]) processFile(e.target.files[0])
                e.target.value=''
              }}
            />

            <button
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={onDrop}
              onClick={()=>fileRef.current?.click()}
              style={{
                background:dragging?C.violet+'30':C.violet+'18',
                border:`1px solid ${C.violet}${dragging?'':'50'}`,
                color:C.violet, borderRadius:8, padding:'7px 18px',
                fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}
            >
              {loading ? '⏳ Loading…' : '⬆ Import File'}
            </button>

            {rows.length>0 && (
              <button onClick={exportCSV} style={{
                background:C.green+'18', border:`1px solid ${C.green}50`,
                color:C.green, borderRadius:8, padding:'7px 18px',
                fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}>⬇ Export CSV</button>
            )}
          </div>

          {error && (
            <div style={{
              width:'100%', background:C.red+'10',
              border:`1px solid ${C.red}40`, borderRadius:8,
              padding:'8px 13px', fontSize:11,
              color:C.red, fontWeight:600,
            }}>⚠ {error}</div>
          )}
        </div>

        {/* KPI Cards — show when data loaded */}
        {m && (
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(4,1fr)',
            gap:12, marginBottom:20,
          }}>
            <KPI
              label="Total Records"
              value={m.total.toLocaleString()}
              sub="rows imported"
              accent={C.sky}
            />
            <KPI
              label="CSAT"
              value={`${m.csatPct}%`}
              sub={`${m.csatN.toLocaleString()} satisfied`}
              accent={C.green}
            />
            <KPI
              label="DSAT"
              value={`${m.dsatPct}%`}
              sub={`${m.dsatN.toLocaleString()} dissatisfied`}
              accent={C.red}
            />
            <KPI
              label="Neutral"
              value={`${m.neuPct}%`}
              sub={`${m.neuN.toLocaleString()} neutral`}
              accent={C.amber}
            />
          </div>
        )}

        {/* Charts — show when data loaded */}
        {m && (
          <>
            {/* Row 1: Sentiment Bar + CSAT vs DSAT */}
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr',
              gap:14, marginBottom:14,
            }}>

              {/* Sentiment Distribution — BAR CHART */}
              <ChartBox
                title="Sentiment Distribution"
                sub={`Positive: ${m.posN} · Negative: ${m.negN} · Neutral: ${m.neuN}`}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sentBarData} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="name" stroke={C.dim} fontSize={11}/>
                    <YAxis stroke={C.dim} fontSize={10}/>
                    <Tooltip
                      contentStyle={TT}
                      formatter={(v,n,p) => [
                        `${v} (${p.payload.pct}%)`, 'Count'
                      ]}
                    />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      <Cell fill={C.green}/>
                      <Cell fill={C.red}/>
                      <Cell fill={C.amber}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>

              {/* CSAT vs DSAT Merged */}
              <ChartBox
                title="CSAT vs DSAT Comparison"
                sub={`CSAT: ${m.csatPct}% satisfied · DSAT: ${m.dsatPct}% dissatisfied`}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={csatDsatBar} barSize={80}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="name" stroke={C.dim} fontSize={12}/>
                    <YAxis stroke={C.dim} fontSize={10} domain={[0,100]} unit="%"/>
                    <Tooltip
                      contentStyle={TT}
                      formatter={v=>[`${v}%`]}
                    />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      {csatDsatBar.map((d,i)=>(
                        <Cell key={i} fill={d.fill}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            </div>

            {/* Row 2: By Team + By Region */}
            {(m.teamData.length>0||m.regionData.length>0) && (
              <div style={{
                display:'grid',
                gridTemplateColumns:
                  m.teamData.length>0&&m.regionData.length>0
                    ? '1fr 1fr' : '1fr',
                gap:14, marginBottom:14,
              }}>
                {m.teamData.length>0 && (
                  <ChartBox
                    title="CSAT% and DSAT% by Team"
                    sub="Team performance comparison"
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={m.teamData} barSize={12}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                        <XAxis dataKey="name" stroke={C.dim} fontSize={9}
                          interval={0} angle={-20} textAnchor="end" height={50}/>
                        <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                        <Tooltip contentStyle={TT} formatter={v=>[`${v}%`]}/>
                        <Legend iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize:11 }}/>
                        <Bar dataKey="CSAT%" fill={C.green} radius={[4,4,0,0]}/>
                        <Bar dataKey="DSAT%" fill={C.red}   radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartBox>
                )}
                {m.regionData.length>0 && (
                  <ChartBox
                    title="CSAT% and DSAT% by Region"
                    sub="Regional performance comparison"
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={m.regionData} barSize={12}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                        <XAxis dataKey="name" stroke={C.dim} fontSize={9}
                          interval={0} angle={-20} textAnchor="end" height={60}/>
                        <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                        <Tooltip contentStyle={TT} formatter={v=>[`${v}%`]}/>
                        <Legend iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize:11 }}/>
                        <Bar dataKey="CSAT%" fill={C.cyan}   radius={[4,4,0,0]}/>
                        <Bar dataKey="DSAT%" fill={C.violet} radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartBox>
                )}
              </div>
            )}
          </>
        )}

        {/* Table — always visible */}
        <div>
          <div style={{
            display:'flex', alignItems:'center',
            justifyContent:'space-between',
            marginBottom:12, flexWrap:'wrap', gap:10,
          }}>
            <div>
              <div style={{
                fontSize:13, fontWeight:700, color:C.text,
              }}>Data Table</div>
              <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>
                {rows.length>0
                  ? `${rows.length.toLocaleString()} records · Click headers to sort · Dropdowns to filter · 200 rows per page`
                  : 'Import a file to see data'}
              </div>
            </div>
            {rows.length>0 && (
              <button onClick={exportCSV} style={{
                background:C.green+'18', border:`1px solid ${C.green}50`,
                color:C.green, borderRadius:8, padding:'7px 18px',
                fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}>⬇ Export CSV</button>
            )}
          </div>
          <DataTable rows={rows}/>
        </div>

      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg0}}
        select option{background:${C.bg2};color:${C.text}}
        input::placeholder{color:${C.dim}}
        button:active{transform:scale(.97)}
      `}</style>
    </div>
  )
}





import { useState } from 'react'
import Login     from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [rows, setRows] = useState([])

  if (!user) return <Login onLogin={setUser} />

  return (
    <Dashboard
      user={user}
      rows={rows}
      setRows={setRows}
      onLogout={() => { setUser(null); setRows([]) }}
    />
  )
}