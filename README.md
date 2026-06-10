import { useState } from 'react'
import Login     from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Charts    from './pages/Charts.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [rows, setRows] = useState([])

  if (!user) return <Login onLogin={setUser} />

  if (page === 'charts') {
    return (
      <Charts
        rows={rows}
        user={user}
        onBack={() => setPage('dashboard')}
        onLogout={() => {
          setUser(null)
          setPage('dashboard')
          setRows([])
        }}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      rows={rows}
      setRows={setRows}
      onLogout={() => {
        setUser(null)
        setPage('dashboard')
        setRows([])
      }}
      onGoCharts={() => setPage('charts')}
    />
  )
}





import * as XLSX from 'xlsx'

export function parseCSV(text) {
  try {
    const lines = text.trim().split('\n').filter(Boolean)
    if (!lines.length) return []
    const headers = lines[0]
      .split(',')
      .map(h => h.trim().replace(/^"|"$/g, ''))

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
  } catch (err) {
    throw new Error('CSV parse failed: ' + err.message)
  }
}

export function parseExcel(buffer) {
  try {
    const wb   = XLSX.read(buffer, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
    return { rows, sheet: wb.SheetNames[0] }
  } catch (err) {
    throw new Error('Excel parse failed: ' + err.message)
  }
}

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

    } else {
      reject(new Error(`File type .${ext} not supported. Use CSV or Excel.`))
    }
  })
}





import { useState, useMemo } from 'react'

const PAGE_SIZE = 5000

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
  'assigned toemail','UserEmail','AssignedToEmail',
])

function Badge({ v }) {
  const s = BADGE_MAP[String(v)]
  if (!s) return <span style={{ color: C.text, fontSize: 11 }}>{v}</span>
  return (
    <span style={{
      background: s.bg, color: s.c,
      border: `1px solid ${s.bd}`,
      borderRadius: 5, padding: '2px 9px',
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{v}</span>
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
          border: `1px solid ${active ? C.cyan : C.border}`,
          color: active ? '#000' : disabled ? C.dim : C.text,
          borderRadius: 7, padding: '6px 12px',
          fontSize: 12, fontWeight: 700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          opacity: disabled ? 0.4 : 1,
          minWidth: 36,
        }}
      >{label}</button>
    )
  }

  const from     = Math.max(1, page - 2)
  const to       = Math.min(totalPages, page + 2)
  const pageNums = []
  for (let i = from; i <= to; i++) pageNums.push(i)

  const info = (
    <div style={{ fontSize: 11, color: C.sub }}>
      Rows{' '}
      <strong style={{ color: C.cyan }}>{start.toLocaleString()}</strong>
      {' – '}
      <strong style={{ color: C.cyan }}>{end.toLocaleString()}</strong>
      {' of '}
      <strong style={{ color: C.text }}>{totalFiltered.toLocaleString()}</strong>
      {' · Page '}
      <strong style={{ color: C.cyan }}>{page}</strong>
      {' of '}
      <strong style={{ color: C.text }}>{totalPages}</strong>
    </div>
  )

  const buttons = (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {pgBtn('« First', () => setPage(1),           page === 1,          false)}
      {pgBtn('‹ Prev',  () => setPage(p => p - 1),  page === 1,          false)}

      {from > 1 && <>
        {pgBtn('1', () => setPage(1), false, false)}
        {from > 2 && <span style={{ color: C.dim, padding: '0 2px' }}>…</span>}
      </>}

      {pageNums.map(p =>
        pgBtn(String(p), () => setPage(p), false, p === page)
      )}

      {to < totalPages && <>
        {to < totalPages - 1 &&
          <span style={{ color: C.dim, padding: '0 2px' }}>…</span>}
        {pgBtn(String(totalPages), () => setPage(totalPages), false, false)}
      </>}

      {pgBtn('Next ›', () => setPage(p => p + 1),  page === totalPages, false)}
      {pgBtn('Last »', () => setPage(totalPages),   page === totalPages, false)}
    </div>
  )

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10,
    }}>
      {info}
      {buttons}
    </div>
  )
}

export default function DataTable({ rows }) {
  const [search,    setSearch]    = useState('')
  const [sortCol,   setSortCol]   = useState(null)
  const [sortDir,   setSortDir]   = useState('asc')
  const [colFilter, setColFilter] = useState({})
  const [page,      setPage]      = useState(1)

  if (!rows || rows.length === 0) {
    return (
      <div style={{
        padding: 40, textAlign: 'center', color: C.dim,
        background: C.panel, borderRadius: 12,
        border: `1px solid ${C.border}`,
      }}>No data to display</div>
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
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  function doFilter(col, val) {
    setColFilter(prev => ({ ...prev, [col]: val }))
    setPage(1)
  }

  function doSearch(val) {
    setSearch(val)
    setPage(1)
  }

  function clearAll() {
    setSearch(''); setColFilter({})
    setSortCol(null); setSortDir('asc')
    setPage(1)
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
          String(row[col] ?? '').toLowerCase() === val.toLowerCase()
        )
      }
    })

    if (sortCol) {
      data = [...data].sort((a, b) => {
        const av = String(a[sortCol] ?? '')
        const bv = String(b[sortCol] ?? '')
        const nA = parseFloat(av), nB = parseFloat(bv)
        const cmp = !isNaN(nA) && !isNaN(nB)
          ? nA - nB
          : av.localeCompare(bv)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return data
  }, [rows, search, colFilter, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage    = Math.min(page, totalPages)
  const sliced     = filtered.slice(
    (curPage - 1) * PAGE_SIZE,
    curPage * PAGE_SIZE
  )

  const hasFilters = search ||
    Object.values(colFilter).some(v => v && v !== 'All')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* toolbar */}
      <div style={{
        display: 'flex', gap: 10,
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)',
            color: C.dim, fontSize: 13, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Search across all columns…"
            style={{
              width: '100%', background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '8px 12px 8px 32px',
              color: C.text, fontSize: 12,
              fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>
          <strong style={{ color: C.cyan }}>
            {filtered.length.toLocaleString()}
          </strong>
          {' of '}
          <strong style={{ color: C.text }}>
            {rows.length.toLocaleString()}
          </strong>
          {' rows'}
        </div>

        <div style={{
          background: C.cyan + '10',
          border: `1px solid ${C.cyan}30`,
          borderRadius: 6, padding: '4px 10px',
          fontSize: 11, color: C.cyan, whiteSpace: 'nowrap',
        }}>
          {PAGE_SIZE.toLocaleString()} per page
        </div>

        {hasFilters && (
          <button onClick={clearAll} style={{
            background: C.red + '18',
            border: `1px solid ${C.red}50`,
            color: C.red, borderRadius: 7, padding: '6px 12px',
            fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>✕ Clear Filters</button>
        )}
      </div>

      {/* pagination top */}
      <PaginationBar
        page={curPage}
        totalPages={totalPages}
        setPage={setPage}
        totalFiltered={filtered.length}
      />

      {/* table */}
      <div style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          overflowX: 'auto', overflowY: 'auto',
          maxHeight: '55vh',
        }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse', fontSize: 12,
          }}>
            <thead>

              {/* column headers + sort */}
              <tr style={{ background: C.bg0 }}>
                {cols.map(col => (
                  <th
                    key={col}
                    onClick={() => doSort(col)}
                    style={{
                      padding: '10px 14px', textAlign: 'left',
                      color: C.cyan, fontWeight: 700,
                      fontSize: 10, letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer', userSelect: 'none',
                      position: 'sticky', top: 0, background: C.bg0,
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

              {/* filter dropdowns */}
              <tr style={{ background: C.bg0 }}>
                {cols.map(col => {
                  const opts = uniqueValues[col]
                  return (
                    <th key={col} style={{
                      padding: '4px 8px',
                      borderBottom: `2px solid ${C.cyan}33`,
                      position: 'sticky', top: 37, background: C.bg0,
                    }}>
                      {opts ? (
                        <select
                          value={colFilter[col] || 'All'}
                          onChange={e => doFilter(col, e.target.value)}
                          style={{
                            background: C.panel,
                            border: `1px solid ${
                              colFilter[col] && colFilter[col] !== 'All'
                                ? C.cyan : C.border
                            }`,
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
                            <option key={v} value={v}>
                              {v || '(empty)'}
                            </option>
                          ))}
                        </select>
                      ) : <div style={{ height: 24 }} />}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {sliced.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: `1px solid ${C.border}22`,
                    background: ri % 2 ? '#ffffff04' : 'transparent',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.background = C.cyan + '0a')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.background =
                      ri % 2 ? '#ffffff04' : 'transparent')
                  }
                >
                  {cols.map(col => (
                    <td key={col} style={{
                      padding: '9px 14px', whiteSpace: 'nowrap',
                    }}>
                      {BADGE_COLS.has(col) ? (
                        <Badge v={String(row[col] ?? '')} />
                      ) : EMAIL_COLS.has(col) ? (
                        <span style={{ color: C.violet, fontSize: 11 }}>
                          {row[col]}
                        </span>
                      ) : (
                        <span style={{ color: C.text }}>
                          {String(row[col] ?? '').length > 48
                            ? String(row[col]).slice(0, 48) + '…'
                            : row[col]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {!sliced.length && (
                <tr>
                  <td
                    colSpan={cols.length}
                    style={{
                      padding: 48, textAlign: 'center', color: C.dim,
                    }}
                  >
                    No records match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* pagination bottom */}
      <PaginationBar
        page={curPage}
        totalPages={totalPages}
        setPage={setPage}
        totalFiltered={filtered.length}
      />

      <style>{`
        select option { background: ${C.bg2}; color: ${C.text}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #07090f; }
        ::-webkit-scrollbar-thumb {
          background: ${C.border}; border-radius: 3px;
        }
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

// ── find column ignoring case and spaces ──────────────────
function findCol(row, ...names) {
  const keys = Object.keys(row)
  for (const name of names) {
    const f = keys.find(
      k => k.trim().toLowerCase().replace(/\s+/g, '')
        === name.toLowerCase().replace(/\s+/g, '')
    )
    if (f) return f
  }
  return null
}

// ── accurate metrics ──────────────────────────────────────
function calcMetrics(rows) {
  if (!rows || !rows.length) {
    return {
      total:0, csatN:0, dsatN:0, slaY:0,
      posN:0, negN:0, neuN:0,
      csatPct:0, dsatPct:0, slaPct:0,
      posPct:0, negPct:0, neuPct:0,
      csatCol:null, dsatCol:null,
    }
  }

  const sample = rows[0]

  const csatCol    = findCol(sample,
    'ISHAPPY','IsHappy','ishappy','is_happy',
    'CSAT','csat','Csat'
  )
  const dsatCol    = findCol(sample,
    'ISSAD','IsSad','issad','is_sad',
    'DSAT','dsat','Dsat'
  )
  const passiveCol = findCol(sample,
    'ISPASSIVE','IsPassive','ispassive'
  )
  const slaCol     = findCol(sample,
    'SLA_Breached','SLABreached','sla_breached','SLA Breached'
  )
  const sentCol    = findCol(sample,
    'Predicted_Sentiment','predicted_sentiment',
    'Sentiment','sentiment'
  )

  console.log('=== DASHBOARD COLUMNS ===')
  console.log('All columns:', Object.keys(sample))
  console.log('CSAT col:', csatCol)
  console.log('DSAT col:', dsatCol)
  console.log('Passive col:', passiveCol)
  console.log('SLA col:', slaCol)
  console.log('Sentiment col:', sentCol)

  let csatN=0, dsatN=0, slaY=0
  let posN=0, negN=0, neuN=0

  rows.forEach(r => {
    const cv = String(r[csatCol]    ?? '').trim().toLowerCase()
    const dv = String(r[dsatCol]    ?? '').trim().toLowerCase()
    const pv = String(r[passiveCol] ?? '').trim().toLowerCase()

    if (csatCol && (cv === '1' || cv === 'true' || cv === 'yes')) csatN++
    if (dsatCol && (dv === '1' || dv === 'true' || dv === 'yes')) dsatN++

    if (slaCol) {
      const sv = String(r[slaCol] ?? '').trim().toLowerCase()
      if (sv === 'yes' || sv === '1' || sv === 'true') slaY++
    }

    if (sentCol) {
      const sv = String(r[sentCol] ?? '').trim().toLowerCase()
      if      (sv === 'positive') posN++
      else if (sv === 'negative') negN++
      else if (sv === 'neutral')  neuN++
    } else {
      if      (cv === '1') posN++
      else if (dv === '1') negN++
      else if (pv === '1') neuN++
    }
  })

  const total = rows.length
  const pct   = n => total
    ? parseFloat((n / total * 100).toFixed(1))
    : 0

  return {
    total, csatN, dsatN, slaY,
    posN, negN, neuN,
    csatPct: pct(csatN),
    dsatPct: pct(dsatN),
    slaPct:  pct(slaY),
    posPct:  pct(posN),
    negPct:  pct(negN),
    neuPct:  pct(neuN),
    csatCol, dsatCol,
  }
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${accent}33`,
      borderRadius: 12, padding: '16px 20px',
    }}>
      <div style={{
        fontSize: 10, color: C.sub, letterSpacing: 1.5,
        textTransform: 'uppercase', marginBottom: 6,
        fontFamily: 'monospace',
      }}>{label}</div>
      <div style={{
        fontSize: 30, fontWeight: 900, color: accent,
        fontFamily: 'monospace', lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: C.dim, marginTop: 5 }}>{sub}</div>
      )}
      <div style={{
        marginTop: 10, height: 3,
        background: accent + '20', borderRadius: 2,
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(parseFloat(value) || 0, 100)}%`,
          background: accent, borderRadius: 2,
          transition: 'width .5s',
        }}/>
      </div>
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
      fontFamily: 'monospace',
    }}>
      {toast.icon} {toast.msg}
    </div>
  )
}

function ColWarning({ m }) {
  if (!m.total) return null
  const missing = []
  if (!m.csatCol) missing.push('ISHAPPY / CSAT')
  if (!m.dsatCol) missing.push('ISSAD / DSAT')
  if (!missing.length) return null
  return (
    <div style={{
      background: C.amber + '10',
      border: `1px solid ${C.amber}40`,
      borderRadius: 9, padding: '10px 14px',
      marginBottom: 16, fontSize: 11, color: C.amber,
    }}>
      ⚠ Columns not detected: <strong>{missing.join(', ')}</strong>
      <br/>
      <span style={{ color: C.dim }}>
        Press F12 → Console to see all column names in your file.
      </span>
    </div>
  )
}

export default function Dashboard({
  user, rows, setRows, onLogout, onGoCharts
}) {
  const [fileMeta, setFileMeta] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [toast,    setToast]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  function notify(msg, color, icon = '✓') {
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
        setFileMeta({
          name:  result.fileName,
          type:  result.type,
          sheet: result.sheet,
        })
        setLoading(false)
        notify(
          `Imported ${result.rows.length.toLocaleString()} rows from "${result.fileName}"`,
          C.green
        )
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
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob([h + '\n' + b], { type: 'text/csv' })
    )
    a.download = `sentimentiq_${Date.now()}.csv`
    a.click()
    notify('Exported!', C.green)
  }

  const m = calcMetrics(rows)
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
        padding: '0 24px', gap: 14,
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
            <div style={{
              fontSize: 13, fontWeight: 900,
              color: C.cyan, letterSpacing: 2,
            }}>SENTIMENTIQ</div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1.5 }}>
              NTT DATA · AI PLATFORM
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          <div style={{
            background: C.cyan + '18',
            border: `1px solid ${C.cyan}50`,
            color: C.cyan, borderRadius: 7, padding: '5px 14px',
            fontSize: 11, fontWeight: 700,
          }}>📋 Data</div>

          <button
            onClick={() => rows.length
              ? onGoCharts()
              : notify('Import a file first!', C.amber, '⚠')
            }
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              color: rows.length ? C.sub : C.dim,
              borderRadius: 7, padding: '5px 14px',
              fontSize: 11, fontWeight: 700,
              cursor: rows.length ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >📊 Charts</button>
        </div>

        <div style={{ flex: 1 }} />

        {fileMeta && (
          <div style={{
            background: C.violet + '12',
            border: `1px solid ${C.violet}40`,
            borderRadius: 7, padding: '4px 12px',
            fontSize: 10, color: C.violet,
          }}>
            📁 {fileMeta.name}
            <span style={{ color: C.dim }}>
              {' '}· {m.total.toLocaleString()} rows
            </span>
          </div>
        )}

        <div style={{
          background: roleColor + '12',
          border: `1px solid ${roleColor}40`,
          borderRadius: 7, padding: '4px 12px',
          fontSize: 10, color: roleColor, fontWeight: 700,
        }}>
          👤 {user.name}
          <span style={{ color: C.dim, fontWeight: 400 }}>
            {' '}· {user.role}
          </span>
        </div>

        <button onClick={onLogout} style={{
          background: C.red + '15',
          border: `1px solid ${C.red}40`,
          color: C.red, borderRadius: 7, padding: '5px 14px',
          fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Sign Out</button>
      </header>

      <main style={{ padding: '22px 24px', maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontSize: 18, fontWeight: 900,
            color: C.cyan, margin: 0, letterSpacing: 1,
          }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>
            ISHAPPY = CSAT · ISSAD = DSAT ·
            TEAM = Department · REGION = Industry
          </p>
        </div>

        <ColWarning m={m} />

        {/* stat cards */}
        {m.total > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 12, marginBottom: 12,
            }}>
              <StatCard
                label="Total Rows"
                value={m.total.toLocaleString()}
                sub="records loaded"
                accent={C.sky}
              />
              <StatCard
                label="CSAT (ISHAPPY = 1)"
                value={`${m.csatPct}%`}
                sub={`${m.csatN.toLocaleString()} satisfied of ${m.total.toLocaleString()}`}
                accent={C.green}
              />
              <StatCard
                label="DSAT (ISSAD = 1)"
                value={`${m.dsatPct}%`}
                sub={`${m.dsatN.toLocaleString()} dissatisfied of ${m.total.toLocaleString()}`}
                accent={C.red}
              />
              <StatCard
                label="SLA Breach"
                value={`${m.slaPct}%`}
                sub={`${m.slaY.toLocaleString()} breached`}
                accent={C.amber}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 12, marginBottom: 20,
            }}>
              <StatCard
                label="Positive (Happy)"
                value={`${m.posPct}%`}
                sub={`${m.posN.toLocaleString()} rows`}
                accent={C.green}
              />
              <StatCard
                label="Negative (Sad)"
                value={`${m.negPct}%`}
                sub={`${m.negN.toLocaleString()} rows`}
                accent={C.red}
              />
              <StatCard
                label="Neutral (Passive)"
                value={`${m.neuPct}%`}
                sub={`${m.neuN.toLocaleString()} rows`}
                accent={C.amber}
              />
            </div>

            {/* open charts button */}
            <div style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '14px 20px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 20,
            }}>
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: C.text,
                }}>📊 View Charts and Visualizations</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                  Pie charts · Bar charts · NPS · Team · Region analysis
                </div>
              </div>
              <button onClick={onGoCharts} style={{
                background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
                border: 'none', borderRadius: 9, padding: '10px 24px',
                color: '#000', fontSize: 12, fontWeight: 900,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Open Charts →</button>
            </div>
          </>
        )}

        {/* import panel */}
        <div style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 20, marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16, flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                Import Data
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                CSV (.csv) and Excel (.xlsx, .xls)
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
                background: C.violet + '18',
                border: `1px solid ${C.violet}50`,
                color: C.violet, borderRadius: 8, padding: '7px 18px',
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>⬆ Browse File</button>

              {rows.length > 0 && (
                <button onClick={exportCSV} style={{
                  background: C.green + '18',
                  border: `1px solid ${C.green}50`,
                  color: C.green, borderRadius: 8, padding: '7px 18px',
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>⬇ Export CSV</button>
              )}
            </div>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? C.cyan : C.border}`,
              borderRadius: 10, padding: '24px 20px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? C.cyan + '08' : C.bg2,
              transition: 'all .2s',
            }}
          >
            {loading ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ color: C.amber, fontSize: 13, fontWeight: 700 }}>
                  Parsing file… please wait
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {dragging ? '📂' : '📁'}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: dragging ? C.cyan : C.text, marginBottom: 4,
                }}>
                  {dragging
                    ? 'Drop to import!'
                    : 'Drag & drop or click Browse File'}
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  CSV and Excel accepted
                </div>
                {fileMeta && (
                  <div style={{
                    marginTop: 10, fontSize: 11,
                    color: C.green, fontWeight: 700,
                  }}>
                    ✓ {fileMeta.name} — {m.total.toLocaleString()} rows
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div style={{
              marginTop: 12, background: C.red + '10',
              border: `1px solid ${C.red}40`,
              borderRadius: 8, padding: '9px 13px',
              fontSize: 12, color: C.red, fontWeight: 600,
            }}>⚠ {error}</div>
          )}
        </div>

        {/* table */}
        {loading ? (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '60px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14, color: C.amber, fontWeight: 700 }}>
              Loading data…
            </div>
          </div>

        ) : rows.length > 0 ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                Data Table
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                Click headers to sort · Dropdowns to filter ·
                Search for global search · 5,000 rows per page
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
            <div style={{
              fontSize: 15, fontWeight: 700,
              color: C.text, marginBottom: 8,
            }}>No data imported yet</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 20 }}>
              Import a CSV or Excel file to view your data
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
