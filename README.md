import * as XLSX from 'xlsx'

export function parseCSV(text) {
  try {
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
          if (!rows.length) throw new Error('File is empty or has no data rows')
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
          if (!rows.length) throw new Error('Excel file is empty or has no data')
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
      background: s.bg, color: s.c,
      border: `1px solid ${s.bd}`,
      borderRadius: 5, padding: '2px 9px',
      fontSize: 11, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{v}</span>
  )
}

function PaginationBar({ page, totalPages, setPage, totalFiltered }) {
  if (totalPages <= 1) return null

  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, totalFiltered)

  const btn = (label, onClick, disabled, active) => (
    <button
      key={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? C.cyan+'22' : 'transparent',
        border: `1px solid ${active ? C.cyan : disabled ? C.border : C.border}`,
        color: active ? C.cyan : disabled ? C.dim : C.sub,
        borderRadius: 7, padding: '5px 11px',
        fontSize: 12, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: disabled ? .4 : 1,
        minWidth: 36,
      }}
    >{label}</button>
  )

  // page numbers around current
  const pages = []
  const from  = Math.max(1, page - 2)
  const to    = Math.min(totalPages, page + 2)
  for (let i = from; i <= to; i++) pages.push(i)

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14, flexWrap: 'wrap', gap: 10,
    }}>
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

      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {btn('«', () => setPage(1),           page === 1,          false)}
        {btn('‹', () => setPage(p => p - 1),  page === 1,          false)}

        {from > 1 && <>
          {btn('1', () => setPage(1), false, false)}
          {from > 2 && <span style={{ color: C.dim }}>…</span>}
        </>}

        {pages.map(p =>
          btn(String(p), () => setPage(p), false, p === page)
        )}

        {to < totalPages && <>
          {to < totalPages - 1 && <span style={{ color: C.dim }}>…</span>}
          {btn(String(totalPages), () => setPage(totalPages), false, false)}
        </>}

        {btn('›', () => setPage(p => p + 1),  page === totalPages, false)}
        {btn('»', () => setPage(totalPages),   page === totalPages, false)}
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

  // guard — if rows is empty or broken
  if (!rows || !rows.length) {
    return (
      <div style={{
        padding: 40, textAlign: 'center',
        color: C.dim, background: C.panel,
        borderRadius: 12, border: `1px solid ${C.border}`,
      }}>
        No data to display
      </div>
    )
  }

  const cols = Object.keys(rows[0])

  // unique values for dropdowns (built from all rows once)
  const uniqueValues = useMemo(() => {
    const map = {}
    cols.forEach(col => {
      const vals = [...new Set(rows.map(r => String(r[col] ?? '')))]
      if (vals.length <= 30) map[col] = vals
    })
    return map
  }, [rows])

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  function handleFilter(col, val) {
    setColFilter(prev => ({ ...prev, [col]: val }))
    setPage(1)
  }

  function handleSearch(val) {
    setSearch(val)
    setPage(1)
  }

  function clearAll() {
    setSearch(''); setColFilter({})
    setSortCol(null); setSortDir('asc')
    setPage(1)
  }

  // apply filters + sort to ALL rows
  const filtered = useMemo(() => {
    let data = rows

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
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

  // slice for current page ONLY — this is what renders
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const sliced     = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

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
            transform: 'translateY(-50%)',
            color: C.dim, fontSize: 13, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search across all columns…"
            style={{
              width: '100%', background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '8px 12px 8px 32px',
              color: C.text, fontSize: 12,
              fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>
          <strong style={{ color: C.cyan }}>{filtered.length.toLocaleString()}</strong>
          {' of '}
          <strong style={{ color: C.text }}>{rows.length.toLocaleString()}</strong>
          {' rows'}
        </div>

        <div style={{
          background: C.cyan + '10', border: `1px solid ${C.cyan}30`,
          borderRadius: 6, padding: '4px 10px',
          fontSize: 11, color: C.cyan, whiteSpace: 'nowrap',
        }}>
          {PAGE_SIZE.toLocaleString()} per page
        </div>

        {hasFilters && (
          <button onClick={clearAll} style={{
            background: C.red + '18', border: `1px solid ${C.red}50`,
            color: C.red, borderRadius: 7, padding: '6px 12px',
            fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>✕ Clear</button>
        )}
      </div>

      {/* table */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>

              {/* col headers + sort */}
              <tr style={{ background: C.bg2 }}>
                {cols.map(col => (
                  <th key={col} onClick={() => handleSort(col)} style={{
                    padding: '10px 14px', textAlign: 'left',
                    color: C.cyan, fontWeight: 700, fontSize: 10,
                    letterSpacing: 1.4, textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer', userSelect: 'none',
                    position: 'sticky', top: 0, background: C.bg2,
                  }}>
                    {col.replace(/_/g, ' ')}
                    <span style={{ marginLeft: 4, color: sortCol === col ? C.cyan : C.dim }}>
                      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                    </span>
                  </th>
                ))}
              </tr>

              {/* filter dropdowns */}
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
                          onChange={e => handleFilter(col, e.target.value)}
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
              {sliced.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: `1px solid ${C.border}22`,
                    background: ri % 2 ? '#ffffff04' : 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.cyan + '0a')}
                  onMouseLeave={e => (e.currentTarget.style.background = ri % 2 ? '#ffffff04' : 'transparent')}
                >
                  {cols.map(col => (
                    <td key={col} style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
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
                  <td colSpan={cols.length} style={{
                    padding: 48, textAlign: 'center', color: C.dim,
                  }}>
                    No records match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* pagination */}
      <PaginationBar
        page={safePage}
        totalPages={totalPages}
        setPage={setPage}
        totalFiltered={filtered.length}
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
    setTimeout(() => setToast(null), 3000)
  }

  async function processFile(file) {
    if (!file) return
    setError('')
    setLoading(true)
    setRows([])           // clear old data first
    setFileMeta(null)

    try {
      const result = await readFile(file)
      // small delay so React clears old rows before setting new ones
      setTimeout(() => {
        setRows(result.rows)
        setFileMeta({
          name: result.fileName,
          type: result.type,
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
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function exportCSV() {
    if (!rows.length) return
    const headers = Object.keys(rows[0]).join(',')
    const body    = rows
      .map(r =>
        Object.values(r)
          .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(new Blob([headers + '\n' + body], { type: 'text/csv' }))
    a.download = `sentimentiq_export_${Date.now()}.csv`
    a.click()
    notify('CSV exported!', C.green)
  }

  const total = rows.length
  const csatN = rows.filter(r => r.CSAT === '1' || r.CSAT === 1).length
  const dsatN = rows.filter(r => r.DSAT === '1' || r.DSAT === 1).length
  const slaY  = rows.filter(r => r.SLA_Breached === 'Yes').length
  const pct   = n => total ? Math.round(n / total * 100) : 0

  const ROLE_COLOR = { Admin: C.red, Manager: C.amber, Developer: C.cyan }
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
          fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Sign Out</button>
      </header>

      {/* main */}
      <main style={{ padding: '22px 24px', maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontSize: 18, fontWeight: 900,
            color: C.cyan, margin: 0, letterSpacing: 1,
          }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>
            Import Excel or CSV · Filter · Sort · Paginate · Export
          </p>
        </div>

        {/* stat cards */}
        {total > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: 12, marginBottom: 20,
          }}>
            <StatCard label="Total Rows"  value={total.toLocaleString()} sub="records loaded"         accent={C.sky}   />
            <StatCard label="CSAT"        value={`${pct(csatN)}%`}       sub={`${csatN} satisfied`}   accent={C.green} />
            <StatCard label="DSAT"        value={`${pct(dsatN)}%`}       sub={`${dsatN} dissatisfied`} accent={C.red}  />
            <StatCard label="SLA Breach"  value={`${pct(slaY)}%`}        sub={`${slaY} breached`}     accent={C.amber} />
          </div>
        )}

        {/* import panel */}
        <div style={{
          background: C.panel, border: `1px solid ${C.border}`,
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
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>⬆ Browse File</button>

              {rows.length > 0 && (
                <button onClick={exportCSV} style={{
                  background: C.green + '18', border: `1px solid ${C.green}50`,
                  color: C.green, borderRadius: 8, padding: '7px 18px',
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>⬇ Export CSV</button>
              )}
            </div>
          </div>

          {/* drag drop */}
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
                <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>
                  Large files may take a few seconds
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
                  {dragging ? 'Drop to import!' : 'Drag & drop your file here'}
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  or click Browse File above · CSV and Excel accepted
                </div>
                {fileMeta && (
                  <div style={{
                    marginTop: 10, fontSize: 11,
                    color: C.green, fontWeight: 700,
                  }}>
                    ✓ {fileMeta.name} — {total.toLocaleString()} rows loaded
                  </div>
                )}
              </>
            )}
          </div>

          {/* format badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[
              { label: 'CSV',        icon: '📄', color: C.green },
              { label: 'Excel XLSX', icon: '📊', color: C.cyan  },
              { label: 'Excel XLS',  icon: '📊', color: C.cyan  },
            ].map(f => (
              <div key={f.label} style={{
                background: f.color + '10',
                border: `1px solid ${f.color}30`,
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
              border: `1px solid ${C.red}40`,
              borderRadius: 8, padding: '9px 13px',
              fontSize: 12, color: C.red, fontWeight: 600,
            }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* table or empty state */}
        {loading ? (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '60px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14, color: C.amber, fontWeight: 700 }}>
              Loading your data…
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
              Please wait while we process your file
            </div>
          </div>

        ) : rows.length > 0 ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                Data Table
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                Click column headers to sort ·
                Use dropdowns to filter ·
                Search box for global search ·
                5,000 rows per page
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
            }}>
              No data imported yet
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 20 }}>
              Import a CSV or Excel file above to view your data
            </div>
            <button onClick={() => fileRef.current?.click()} style={{
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border: 'none', borderRadius: 9, padding: '10px 28px',
              color: '#000', fontSize: 12, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ⬆ Import File Now
            </button>
          </div>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg0}; }
        select option { background: ${C.bg2}; color: ${C.text}; }
        input::placeholder { color: ${C.dim}; }
        button:active { transform: scale(.97); }
      `}</style>
    </div>
  )
}


