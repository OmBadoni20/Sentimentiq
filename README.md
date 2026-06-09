import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)





import { useState } from 'react'
import Login     from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const [user, setUser] = useState(null)

  if (!user) return <Login onLogin={setUser} />
  return <Dashboard user={user} onLogout={() => setUser(null)} />
}





import { useState } from 'react'

const USERS = {
  'om.badoni': { password: 'NTT@2026',     role: 'Developer', name: 'Om Badoni'   },
  'manager':   { password: 'Manager@2026', role: 'Manager',   name: 'NTT Manager' },
  'admin':     { password: 'Admin@2026',   role: 'Admin',     name: 'Admin User'  },
}

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  violet:'#bc8cff', text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
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
    if (!username.trim()) { setError('Username is required'); return }
    if (!password.trim()) { setError('Password is required'); return }
    setLoading(true)
    setTimeout(() => {
      const user = USERS[username.trim().toLowerCase()]
      if (user && user.password === password) {
        onLogin({ username: username.trim(), name: user.name, role: user.role })
      } else {
        setError('Invalid username or password')
        setLoading(false)
      }
    }, 700)
  }

  const inp = {
    width: '100%', background: C.bg2,
    border: `1px solid ${C.border}`, borderRadius: 9,
    padding: '12px 14px', color: C.text, fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color .2s',
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Mono','Courier New',monospace", padding: 20,
    }}>

      {/* grid bg */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.border}44 1px,transparent 1px),
                          linear-gradient(90deg,${C.border}44 1px,transparent 1px)`,
        backgroundSize: '40px 40px',
      }}/>

      {/* glow */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%',
        transform: 'translate(-50%,-50%)', width: 500, height: 300,
        background: `radial-gradient(ellipse,${C.cyan}14 0%,transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }}/>

      {/* card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 18, padding: '40px 44px',
        width: '100%', maxWidth: 420,
        boxShadow: `0 0 60px ${C.cyan}12`,
      }}>

        {/* logo */}
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 14px',
            boxShadow: `0 0 28px ${C.cyan}30`,
          }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.cyan, letterSpacing: 3 }}>
            SENTIMENTIQ
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4, letterSpacing: 1.5 }}>
            NTT DATA · AI ANALYTICS PLATFORM
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* username */}
          <div>
            <label style={{
              display: 'block', fontSize: 10, color: C.sub,
              letterSpacing: 1.5, fontWeight: 700, marginBottom: 7, textTransform: 'uppercase',
            }}>Username</label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g.  om.badoni"
              autoComplete="username" spellCheck={false}
              style={inp}
              onFocus={e => (e.target.style.borderColor = C.cyan)}
              onBlur={e  => (e.target.style.borderColor = C.border)}
            />
          </div>

          {/* password */}
          <div>
            <label style={{
              display: 'block', fontSize: 10, color: C.sub,
              letterSpacing: 1.5, fontWeight: 700, marginBottom: 7, textTransform: 'uppercase',
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                style={{ ...inp, paddingRight: 44 }}
                onFocus={e => (e.target.style.borderColor = C.cyan)}
                onBlur={e  => (e.target.style.borderColor = C.border)}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent', border: 'none',
                color: C.dim, cursor: 'pointer', fontSize: 16, padding: 4,
              }}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* error */}
          {error && (
            <div style={{
              background: C.red + '15', border: `1px solid ${C.red}40`,
              borderRadius: 8, padding: '9px 13px',
              fontSize: 12, color: C.red, fontWeight: 600,
            }}>⚠ {error}</div>
          )}

          {/* submit */}
          <button type="submit" disabled={loading} style={{
            background: loading ? C.dim : `linear-gradient(135deg,${C.cyan},${C.violet})`,
            border: 'none', borderRadius: 10, padding: 13, width: '100%',
            color: loading ? C.sub : '#000',
            fontSize: 13, fontWeight: 900,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', letterSpacing: 1,
          }}>
            {loading ? 'SIGNING IN…' : 'SIGN IN →'}
          </button>
        </form>

        {/* demo creds */}
        <div style={{
          marginTop: 26, padding: 14,
          background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 9,
        }}>
          <div style={{
            fontSize: 10, color: C.dim, letterSpacing: 1.5, fontWeight: 700, marginBottom: 8,
          }}>DEMO CREDENTIALS</div>
          {[
            ['om.badoni',  'NTT@2026',     'Developer'],
            ['manager',    'Manager@2026', 'Manager'  ],
            ['admin',      'Admin@2026',   'Admin'    ],
          ].map(([u, p, r]) => (
            <div key={u} onClick={() => { setUsername(u); setPassword(p) }} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: C.sub, padding: '5px 0',
              cursor: 'pointer', borderBottom: `1px solid ${C.border}44`,
            }}>
              <span style={{ color: C.cyan }}>{u}</span>
              <span>{p}</span>
              <span style={{ color: C.violet }}>{r}</span>
            </div>
          ))}
          <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>Click any row to auto-fill</div>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg0}}
        input::placeholder{color:${C.dim}}
      `}</style>
    </div>
  )
}







import * as XLSX from 'xlsx'

export function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (!lines.length) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
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

export function parseExcel(buffer) {
  const wb   = XLSX.read(buffer, { type: 'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return { rows, sheet: wb.SheetNames[0], allSheets: wb.SheetNames }
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload  = e => {
        try {
          const rows = parseCSV(e.target.result)
          resolve({ rows, fileName: file.name, type: 'CSV' })
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsText(file)

    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload  = e => {
        try {
          const { rows, sheet } = parseExcel(e.target.result)
          resolve({ rows, fileName: file.name, type: 'Excel', sheet })
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)

    } else {
      reject(new Error(`Unsupported file type: .${ext}`))
    }
  })
}






import { useState, useMemo } from 'react'

export default function useTableData(rows) {
  const [search,    setSearch]    = useState('')
  const [sortCol,   setSortCol]   = useState(null)
  const [sortDir,   setSortDir]   = useState('asc')
  const [colFilter, setColFilter] = useState({})

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function setFilter(col, val) {
    setColFilter(prev => ({ ...prev, [col]: val }))
  }

  function clearFilters() {
    setSearch(''); setColFilter({})
    setSortCol(null); setSortDir('asc')
  }

  const processed = useMemo(() => {
    let data = [...rows]

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      )
    }

    Object.entries(colFilter).forEach(([col, val]) => {
      if (val && val !== 'All') {
        data = data.filter(row =>
          String(row[col]).toLowerCase() === String(val).toLowerCase()
        )
      }
    })

    if (sortCol) {
      data.sort((a, b) => {
        const av = String(a[sortCol] ?? '')
        const bv = String(b[sortCol] ?? '')
        const nA = parseFloat(av), nB = parseFloat(bv)
        const cmp = (!isNaN(nA) && !isNaN(nB))
          ? nA - nB : av.localeCompare(bv)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return data
  }, [rows, search, colFilter, sortCol, sortDir])

  const uniqueValues = useMemo(() => {
    const map = {}
    if (!rows.length) return map
    Object.keys(rows[0]).forEach(col => {
      const vals = [...new Set(rows.map(r => String(r[col])))]
      if (vals.length <= 30) map[col] = vals
    })
    return map
  }, [rows])

  return {
    processed, search, setSearch,
    sortCol, sortDir, handleSort,
    colFilter, setFilter,
    uniqueValues, clearFilters,
  }
}






import useTableData from '../hooks/useTableData.js'

const C = {
  bg2:'#161b22', panel:'#13181f', border:'#21262d',
  cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

const BADGE_MAP = {
  Positive:{bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  Negative:{bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  Neutral:{bg:'#d2992218',c:'#d29922',bd:'#d2992240'},
  Promoter:{bg:'#58a6ff18',c:'#58a6ff',bd:'#58a6ff40'},
  Detractor:{bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  Passive:{bg:'#bc8cff18',c:'#bc8cff',bd:'#bc8cff40'},
  Yes:{bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  No:{bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  P1:{bg:'#f8514918',c:'#f85149',bd:'#f8514940'},
  P2:{bg:'#d2992218',c:'#d29922',bd:'#d2992240'},
  P3:{bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  '1':{bg:'#3fb95018',c:'#3fb950',bd:'#3fb95040'},
  '0':{bg:'#48484818',c:'#484f58',bd:'#48484840'},
}
const BADGE_COLS = new Set([
  'Predicted_Sentiment','NPS_Category','SLA_Breached',
  'Priority','CSAT','DSAT','Status','status',
])
const EMAIL_COLS = new Set([
  'Employee_Email','Client_Email','email','Email',
])

function Badge({ v }) {
  const s = BADGE_MAP[String(v)]
  if (!s) return <span style={{ color: C.text, fontSize: 11 }}>{v}</span>
  return (
    <span style={{
      background: s.bg, color: s.c, border: `1px solid ${s.bd}`,
      borderRadius: 5, padding: '2px 9px',
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{v}</span>
  )
}

export default function DataTable({ rows }) {
  const {
    processed, search, setSearch,
    sortCol, sortDir, handleSort,
    colFilter, setFilter,
    uniqueValues, clearFilters,
  } = useTableData(rows)

  const cols = rows.length ? Object.keys(rows[0]) : []
  const hasFilters = search || Object.values(colFilter).some(v => v && v !== 'All')

  return (
    <div>
      {/* toolbar */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 12, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)', color: C.dim, fontSize: 13,
          }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search across all columns…"
            style={{
              width: '100%', background: C.bg2,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '8px 12px 8px 32px',
              color: C.text, fontSize: 12,
              fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: C.sub }}>
          Showing{' '}
          <strong style={{ color: C.cyan }}>{processed.length}</strong>
          {' '}of {rows.length} rows
        </div>

        {hasFilters && (
          <button onClick={clearFilters} style={{
            background: C.red + '18', border: `1px solid ${C.red}50`,
            color: C.red, borderRadius: 7, padding: '6px 12px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>✕ Clear Filters</button>
        )}
      </div>

      {/* table */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '62vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>

              {/* row 1 — column names + sort arrows */}
              <tr style={{ background: C.bg2 }}>
                {cols.map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    style={{
                      padding: '10px 14px', textAlign: 'left',
                      color: C.cyan, fontWeight: 700, fontSize: 10,
                      letterSpacing: 1.4, textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer', userSelect: 'none',
                      position: 'sticky', top: 0, background: C.bg2,
                    }}
                  >
                    {col.replace(/_/g, ' ')}
                    <span style={{ marginLeft: 4, color: sortCol === col ? C.cyan : C.dim }}>
                      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                    </span>
                  </th>
                ))}
              </tr>

              {/* row 2 — per-column filter dropdowns */}
              <tr style={{ background: C.bg2 }}>
                {cols.map(col => {
                  const opts = uniqueValues[col]
                  return (
                    <th key={col} style={{
                      padding: '4px 8px',
                      borderBottom: `1px solid ${C.border}`,
                      position: 'sticky', top: 38, background: C.bg2,
                    }}>
                      {opts ? (
                        <select
                          value={colFilter[col] || 'All'}
                          onChange={e => setFilter(col, e.target.value)}
                          style={{
                            background: C.panel,
                            border: `1px solid ${C.border}`,
                            borderRadius: 5,
                            color: colFilter[col] && colFilter[col] !== 'All'
                              ? C.cyan : C.dim,
                            fontSize: 10, padding: '3px 6px',
                            fontFamily: 'inherit', cursor: 'pointer',
                            width: '100%', outline: 'none',
                          }}
                        >
                          <option value="All">All</option>
                          {opts.sort().map(v => (
                            <option key={v} value={v}>{v || '(empty)'}</option>
                          ))}
                        </select>
                      ) : <div style={{ height: 24 }} />}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {processed.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: `1px solid ${C.border}22`,
                    background: ri % 2 ? '#ffffff04' : 'transparent',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.cyan + '0a')}
                  onMouseLeave={e => (e.currentTarget.style.background = ri % 2 ? '#ffffff04' : 'transparent')}
                >
                  {cols.map(col => (
                    <td key={col} style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                      {BADGE_COLS.has(col) ? (
                        <Badge v={String(row[col])} />
                      ) : EMAIL_COLS.has(col) ? (
                        <span style={{ color: C.violet, fontSize: 11 }}>{row[col]}</span>
                      ) : (
                        <span style={{ color: C.text }}>
                          {String(row[col]).length > 48
                            ? String(row[col]).slice(0, 48) + '…'
                            : row[col]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {!processed.length && (
                <tr>
                  <td colSpan={cols.length}
                    style={{ padding: 48, textAlign: 'center', color: C.dim }}>
                    No records match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        select option { background: ${C.bg2}; color: ${C.text}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #07090f; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
    </div>
  )
}




import { useState, useRef } from 'react'
import DataTable    from '../components/DataTable.jsx'
import { readFile } from '../utils/fileParser.js'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff', sky:'#79c0ff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${accent}33`,
      borderRadius: 12, padding: '16px 20px',
    }}>
      <div style={{
        fontSize: 10, color: C.sub, letterSpacing: 1.5,
        textTransform: 'uppercase', marginBottom: 6, fontFamily: 'monospace',
      }}>{label}</div>
      <div style={{
        fontSize: 30, fontWeight: 900, color: accent,
        fontFamily: 'monospace', lineHeight: 1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      background: C.panel, border: `1px solid ${toast.color}`,
      borderRadius: 9, padding: '10px 18px',
      color: toast.color, fontSize: 12, fontWeight: 700,
      boxShadow: `0 0 24px ${toast.color}30`,
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>
      {toast.icon} {toast.msg}
    </div>
  )
}

export default function Dashboard({ user, onLogout }) {
  const [rows,     setRows]     = useState([])
  const [fileMeta, setFileMeta] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [toast,    setToast]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  function notify(msg, color, icon = '✓') {
    setToast({ msg, color, icon })
    setTimeout(() => setToast(null), 2800)
  }

  async function processFile(file) {
    setError(''); setLoading(true)
    try {
      const result = await readFile(file)
      if (!result.rows.length) throw new Error('No data rows found in file')
      setRows(result.rows)
      setFileMeta({ name: result.fileName, type: result.type, sheet: result.sheet })
      notify(`Imported ${result.rows.length.toLocaleString()} rows from "${result.fileName}"`, C.green)
    } catch (err) {
      setError(err.message)
      notify(err.message, C.red, '⚠')
    }
    setLoading(false)
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function exportCSV() {
    if (!rows.length) return
    const headers = Object.keys(rows[0]).join(',')
    const body = rows
      .map(r => Object.values(r)
        .map(v => `"${String(v).replace(/"/g,'""')}"`)
        .join(','))
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([headers+'\n'+body],{type:'text/csv'}))
    a.download = `sentimentiq_export_${Date.now()}.csv`
    a.click()
    notify('CSV exported!', C.green)
  }

  const total = rows.length
  const csatN = rows.filter(r => r.CSAT === '1' || r.CSAT === 1).length
  const dsatN = rows.filter(r => r.DSAT === '1' || r.DSAT === 1).length
  const slaY  = rows.filter(r => r.SLA_Breached === 'Yes').length
  const pct   = n => total ? Math.round(n / total * 100) : 0

  const ROLE_COLOR = { Admin:C.red, Manager:C.amber, Developer:C.cyan }
  const roleColor  = ROLE_COLOR[user.role] || C.violet

  return (
    <div style={{
      minHeight: '100vh', background: C.bg0, color: C.text,
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>
      <Toast toast={toast} />

      {/* header */}
      <header style={{
        background: C.bg1, borderBottom: `1px solid ${C.border}`,
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 15,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.cyan, letterSpacing: 2 }}>
              SENTIMENTIQ
            </div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1.5 }}>
              NTT DATA · AI PLATFORM
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {fileMeta && (
          <div style={{
            background: C.violet + '12', border: `1px solid ${C.violet}40`,
            borderRadius: 7, padding: '4px 12px',
            fontSize: 10, color: C.violet,
          }}>
            📁 {fileMeta.name}
            {fileMeta.sheet && <span style={{ color: C.dim }}> · {fileMeta.sheet}</span>}
            <span style={{ color: C.dim }}> · {fileMeta.type} · {total.toLocaleString()} rows</span>
          </div>
        )}

        <div style={{
          background: roleColor + '12', border: `1px solid ${roleColor}40`,
          borderRadius: 7, padding: '4px 12px',
          fontSize: 10, color: roleColor, fontWeight: 700,
        }}>
          👤 {user.name}
          <span style={{ color: C.dim, fontWeight: 400 }}> · {user.role}</span>
        </div>

        <button onClick={onLogout} style={{
          background: C.red + '15', border: `1px solid ${C.red}40`,
          color: C.red, borderRadius: 7, padding: '5px 14px',
          fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>Sign Out</button>
      </header>

      {/* main */}
      <main style={{ padding: '22px 24px', maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: C.cyan, margin: 0, letterSpacing: 1 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>
            Import Excel or CSV · Filter · Sort · Export
          </p>
        </div>

        {/* stat cards — shown only when data loaded */}
        {total > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: 12, marginBottom: 20,
          }}>
            <StatCard label="Total Rows"  value={total.toLocaleString()} sub="records imported"        accent={C.sky}   />
            <StatCard label="CSAT"        value={`${pct(csatN)}%`}       sub={`${csatN} satisfied`}    accent={C.green} />
            <StatCard label="DSAT"        value={`${pct(dsatN)}%`}       sub={`${dsatN} dissatisfied`} accent={C.red}   />
            <StatCard label="SLA Breach"  value={`${pct(slaY)}%`}        sub={`${slaY} breached`}      accent={C.amber} />
          </div>
        )}

        {/* import panel */}
        <div style={{
          background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 20, marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16,
            flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Import Data</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                Supports CSV (.csv) and Excel (.xlsx, .xls)
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files[0]) processFile(e.target.files[0])
                  e.target.value = ''
                }}
              />
              <button onClick={() => fileRef.current?.click()} style={{
                background: C.violet + '18', border: `1px solid ${C.violet}50`,
                color: C.violet, borderRadius: 8, padding: '7px 18px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>⬆ Browse File</button>

              {rows.length > 0 && (
                <button onClick={exportCSV} style={{
                  background: C.green + '18', border: `1px solid ${C.green}50`,
                  color: C.green, borderRadius: 8, padding: '7px 18px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>⬇ Export CSV</button>
              )}
            </div>
          </div>

          {/* drag drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? C.cyan : C.border}`,
              borderRadius: 10, padding: '28px 20px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? C.cyan + '08' : C.bg2,
              transition: 'all .2s',
            }}
          >
            {loading ? (
              <div style={{ color: C.amber, fontSize: 13 }}>⏳ Parsing file…</div>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{dragging ? '📂' : '📁'}</div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: dragging ? C.cyan : C.text, marginBottom: 4,
                }}>
                  {dragging ? 'Drop to import!' : 'Drag & drop your file here'}
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  or click Browse File above · CSV and Excel accepted
                </div>
                {fileMeta && (
                  <div style={{ marginTop: 10, fontSize: 11, color: C.green, fontWeight: 700 }}>
                    ✓ {fileMeta.name} loaded — {total.toLocaleString()} rows
                  </div>
                )}
              </>
            )}
          </div>

          {/* format badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[
              { label:'CSV',      icon:'📄', color:C.green },
              { label:'Excel XLSX', icon:'📊', color:C.cyan  },
              { label:'Excel XLS',  icon:'📊', color:C.cyan  },
            ].map(f => (
              <div key={f.label} style={{
                background: f.color + '10', border: `1px solid ${f.color}30`,
                borderRadius: 7, padding: '5px 12px',
                fontSize: 10, color: f.color, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {f.icon} {f.label}
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              marginTop: 12, background: C.red + '10',
              border: `1px solid ${C.red}40`, borderRadius: 8,
              padding: '9px 13px', fontSize: 12, color: C.red, fontWeight: 600,
            }}>⚠ {error}</div>
          )}
        </div>

        {/* table or empty state */}
        {rows.length > 0 ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Data Table</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                Click column headers to sort · Dropdowns to filter per column · Search box for global search
              </div>
            </div>
            <DataTable rows={rows} />
          </div>
        ) : (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '60px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              No data imported yet
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 20 }}>
              Import a CSV or Excel file above to visualise your feedback data
            </div>
            <button onClick={() => fileRef.current?.click()} style={{
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border: 'none', borderRadius: 9, padding: '10px 28px',
              color: '#000', fontSize: 12, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>⬆ Import File Now</button>
          </div>
        )}
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





<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SentimentIQ — NTT Data</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>




import useTableData from '../hooks/useTableData.js'

const C = {
  bg2:'#161b22', panel:'#13181f', border:'#21262d',
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
])
const EMAIL_COLS = new Set([
  'Employee_Email','Client_Email','email','Email',
])

function Badge({ v }) {
  const s = BADGE_MAP[String(v)]
  if (!s) return <span style={{ color: C.text, fontSize: 11 }}>{v}</span>
  return (
    <span style={{
      background: s.bg, color: s.c, border: `1px solid ${s.bd}`,
      borderRadius: 5, padding: '2px 9px',
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{v}</span>
  )
}

// ── Pagination bar ────────────────────────────────────────
function Pagination({ page, totalPages, setPage, filtered, pageSize }) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, filtered.length)

  // build page number buttons — show max 5 around current
  const pages = []
  let from = Math.max(1, page - 2)
  let to   = Math.min(totalPages, page + 2)
  if (page <= 2)              to   = Math.min(5, totalPages)
  if (page >= totalPages - 1) from = Math.max(1, totalPages - 4)

  for (let i = from; i <= to; i++) pages.push(i)

  const btnBase = {
    border: `1px solid ${C.border}`, borderRadius: 7,
    padding: '6px 12px', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all .15s', minWidth: 36, textAlign: 'center',
  }
  const btnActive = { ...btnBase, background: C.cyan + '20', border: `1px solid ${C.cyan}`, color: C.cyan }
  const btnNormal = { ...btnBase, background: 'transparent', color: C.sub }
  const btnDisabled = { ...btnBase, background: 'transparent', color: C.dim, cursor: 'not-allowed', opacity: .5 }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 14, flexWrap: 'wrap', gap: 10,
    }}>

      {/* Row range info */}
      <div style={{ fontSize: 11, color: C.sub }}>
        Showing rows{' '}
        <strong style={{ color: C.cyan }}>{start.toLocaleString()}</strong>
        {' '}–{' '}
        <strong style={{ color: C.cyan }}>{end.toLocaleString()}</strong>
        {' '}of{' '}
        <strong style={{ color: C.text }}>{filtered.length.toLocaleString()}</strong>
        {' '}filtered rows
        {' · '}
        Page <strong style={{ color: C.cyan }}>{page}</strong> of{' '}
        <strong style={{ color: C.text }}>{totalPages}</strong>
      </div>

      {/* Page buttons */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>

        {/* First */}
        <button
          onClick={() => setPage(1)}
          disabled={page === 1}
          style={page === 1 ? btnDisabled : btnNormal}
        >«</button>

        {/* Prev */}
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={page === 1}
          style={page === 1 ? btnDisabled : btnNormal}
        >‹ Prev</button>

        {/* Page numbers */}
        {from > 1 && (
          <>
            <button onClick={() => setPage(1)} style={btnNormal}>1</button>
            {from > 2 && <span style={{ color: C.dim, padding: '0 4px' }}>…</span>}
          </>
        )}

        {pages.map(p => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={p === page ? btnActive : btnNormal}
          >{p}</button>
        ))}

        {to < totalPages && (
          <>
            {to < totalPages - 1 && <span style={{ color: C.dim, padding: '0 4px' }}>…</span>}
            <button onClick={() => setPage(totalPages)} style={btnNormal}>{totalPages}</button>
          </>
        )}

        {/* Next */}
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page === totalPages}
          style={page === totalPages ? btnDisabled : btnNormal}
        >Next ›</button>

        {/* Last */}
        <button
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          style={page === totalPages ? btnDisabled : btnNormal}
        >»</button>
      </div>
    </div>
  )
}

// ── Main DataTable ────────────────────────────────────────
export default function DataTable({ rows }) {
  const {
    processed, filtered,
    search, setSearch,
    sortCol, sortDir, handleSort,
    colFilter, setFilter,
    uniqueValues, clearFilters,
    page, setPage,
    totalPages, pageSize,
  } = useTableData(rows)

  const cols = rows.length ? Object.keys(rows[0]) : []
  const hasFilters = search || Object.values(colFilter).some(v => v && v !== 'All')

  return (
    <div>

      {/* ── Toolbar ─────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 12, flexWrap: 'wrap',
      }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)',
            color: C.dim, fontSize: 13, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search across all columns…"
            style={{
              width: '100%', background: C.bg2,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '8px 12px 8px 32px',
              color: C.text, fontSize: 12,
              fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Row count */}
        <div style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>
          <strong style={{ color: C.cyan }}>{filtered.length.toLocaleString()}</strong>
          {' '}of{' '}
          <strong style={{ color: C.text }}>{rows.length.toLocaleString()}</strong>
          {' '}rows
        </div>

        {/* Page size info */}
        <div style={{
          background: C.cyan + '10', border: `1px solid ${C.cyan}30`,
          borderRadius: 6, padding: '4px 10px',
          fontSize: 11, color: C.cyan, whiteSpace: 'nowrap',
        }}>
          {pageSize.toLocaleString()} rows / page
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button onClick={clearFilters} style={{
            background: C.red + '18', border: `1px solid ${C.red}50`,
            color: C.red, borderRadius: 7, padding: '6px 12px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>✕ Clear</button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>

              {/* Row 1 — column names + sort */}
              <tr style={{ background: C.bg2 }}>
                {cols.map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    style={{
                      padding: '10px 14px', textAlign: 'left',
                      color: C.cyan, fontWeight: 700, fontSize: 10,
                      letterSpacing: 1.4, textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer', userSelect: 'none',
                      position: 'sticky', top: 0, background: C.bg2,
                    }}
                  >
                    {col.replace(/_/g, ' ')}
                    <span style={{
                      marginLeft: 4,
                      color: sortCol === col ? C.cyan : C.dim,
                    }}>
                      {sortCol === col
                        ? (sortDir === 'asc' ? '↑' : '↓')
                        : '⇅'}
                    </span>
                  </th>
                ))}
              </tr>

              {/* Row 2 — per-column filter dropdowns */}
              <tr style={{ background: C.bg2 }}>
                {cols.map(col => {
                  const opts = uniqueValues[col]
                  return (
                    <th key={col} style={{
                      padding: '4px 8px',
                      borderBottom: `1px solid ${C.border}`,
                      position: 'sticky', top: 38, background: C.bg2,
                    }}>
                      {opts ? (
                        <select
                          value={colFilter[col] || 'All'}
                          onChange={e => setFilter(col, e.target.value)}
                          style={{
                            background: C.panel,
                            border: `1px solid ${C.border}`,
                            borderRadius: 5,
                            color: colFilter[col] && colFilter[col] !== 'All'
                              ? C.cyan : C.dim,
                            fontSize: 10, padding: '3px 6px',
                            fontFamily: 'inherit', cursor: 'pointer',
                            width: '100%', outline: 'none',
                          }}
                        >
                          <option value="All">All</option>
                          {opts.sort().map(v => (
                            <option key={v} value={v}>{v || '(empty)'}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ height: 24 }} />
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {processed.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: `1px solid ${C.border}22`,
                    background: ri % 2 ? '#ffffff04' : 'transparent',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.cyan + '0a')}
                  onMouseLeave={e => (e.currentTarget.style.background = ri % 2 ? '#ffffff04' : 'transparent')}
                >
                  {cols.map(col => (
                    <td key={col} style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                      {BADGE_COLS.has(col) ? (
                        <Badge v={String(row[col])} />
                      ) : EMAIL_COLS.has(col) ? (
                        <span style={{ color: C.violet, fontSize: 11 }}>{row[col]}</span>
                      ) : (
                        <span style={{ color: C.text }}>
                          {String(row[col]).length > 48
                            ? String(row[col]).slice(0, 48) + '…'
                            : row[col]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {!processed.length && (
                <tr>
                  <td
                    colSpan={cols.length}
                    style={{ padding: 48, textAlign: 'center', color: C.dim }}
                  >
                    No records match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination bar ───────────────────────────── */}
      <Pagination
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        filtered={filtered}
        pageSize={pageSize}
      />

      <style>{`
        select option { background: ${C.bg2}; color: ${C.text}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #07090f; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
    </div>
  )
}