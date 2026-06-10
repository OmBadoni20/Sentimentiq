import { useState } from 'react'
import Login     from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Charts    from './pages/Charts.jsx'

export default function App() {
  const [user, setUser]   = useState(null)
  const [page, setPage]   = useState('dashboard')
  const [rows, setRows]   = useState([])

  if (!user) return <Login onLogin={setUser} />

  if (page === 'charts') {
    return (
      <Charts
        rows={rows}
        user={user}
        onBack={() => setPage('dashboard')}
        onLogout={() => { setUser(null); setPage('dashboard') }}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      rows={rows}
      setRows={setRows}
      onLogout={() => { setUser(null); setPage('dashboard') }}
      onGoCharts={() => setPage('charts')}
    />
  )
}   







import { useRef } from 'react'
import DataTable    from '../components/DataTable.jsx'
import { readFile } from '../utils/fileParser.js'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff', sky:'#79c0ff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

// ── accurate CSAT / DSAT calc ─────────────────────────────
function calcMetrics(rows) {
  const total = rows.length
  if (!total) return { total:0, csatN:0, dsatN:0, slaY:0, posN:0, negN:0, neuN:0 }

  let csatN=0, dsatN=0, slaY=0, posN=0, negN=0, neuN=0

  rows.forEach(r => {
    // CSAT — handle "1", 1, "true", true
    const cv = String(r.CSAT ?? r.csat ?? '').trim()
    if (cv === '1' || cv.toLowerCase() === 'true') csatN++

    // DSAT
    const dv = String(r.DSAT ?? r.dsat ?? '').trim()
    if (dv === '1' || dv.toLowerCase() === 'true') dsatN++

    // SLA
    const sv = String(r.SLA_Breached ?? r.sla_breached ?? '').trim().toLowerCase()
    if (sv === 'yes' || sv === '1' || sv === 'true') slaY++

    // Sentiment
    const sent = String(r.Predicted_Sentiment ?? r.sentiment ?? r.Sentiment ?? '').trim().toLowerCase()
    if (sent === 'positive') posN++
    else if (sent === 'negative') negN++
    else if (sent === 'neutral') neuN++
  })

  const pct = n => total ? parseFloat((n / total * 100).toFixed(1)) : 0

  return {
    total, csatN, dsatN, slaY, posN, negN, neuN,
    csatPct: pct(csatN),
    dsatPct: pct(dsatN),
    slaPct:  pct(slaY),
    posPct:  pct(posN),
    negPct:  pct(negN),
    neuPct:  pct(neuN),
  }
}

function StatCard({ label, value, sub, accent, extra }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${accent}33`,
      borderRadius: 12, padding: '16px 20px', position: 'relative',
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
      {extra && (
        <div style={{
          marginTop: 10, height: 3,
          background: accent + '20', borderRadius: 2,
        }}>
          <div style={{
            height: '100%', width: extra + '%',
            background: accent, borderRadius: 2,
            transition: 'width .5s',
          }} />
        </div>
      )}
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

export default function Dashboard({ user, rows, setRows, onLogout, onGoCharts }) {
  const [fileMeta, setFileMeta] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [toast,    setToast]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  // import useState
  const [, forceUpdate] = useState(0)

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
        setFileMeta({ name: result.fileName, type: result.type, sheet: result.sheet })
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
      Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([h + '\n' + b], { type: 'text/csv' }))
    a.download = `sentimentiq_${Date.now()}.csv`
    a.click()
    notify('CSV exported!', C.green)
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
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

        {/* nav tabs */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          <div style={{
            background: C.cyan + '18', border: `1px solid ${C.cyan}50`,
            color: C.cyan, borderRadius: 7, padding: '5px 14px',
            fontSize: 11, fontWeight: 700,
          }}>📋 Data</div>

          <button
            onClick={() => rows.length ? onGoCharts() : notify('Import data first!', C.amber, '⚠')}
            style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              color: rows.length ? C.sub : C.dim,
              borderRadius: 7, padding: '5px 14px',
              fontSize: 11, fontWeight: 700,
              cursor: rows.length ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            📊 Charts {!rows.length && '(import first)'}
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {fileMeta && (
          <div style={{
            background: C.violet + '12', border: `1px solid ${C.violet}40`,
            borderRadius: 7, padding: '4px 12px',
            fontSize: 10, color: C.violet,
          }}>
            📁 {fileMeta.name}
            <span style={{ color: C.dim }}> · {m.total.toLocaleString()} rows</span>
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

      <main style={{ padding: '22px 24px', maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: C.cyan, margin: 0, letterSpacing: 1 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>
            Import data · View metrics · Filter · Sort · Paginate
          </p>
        </div>

        {/* ── STAT CARDS ─────────────────────────────── */}
        {m.total > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: 12, marginBottom: 20,
          }}>
            <StatCard
              label="Total Rows"
              value={m.total.toLocaleString()}
              sub="records loaded"
              accent={C.sky}
            />
            <StatCard
              label="CSAT Score"
              value={`${m.csatPct}%`}
              sub={`${m.csatN.toLocaleString()} satisfied out of ${m.total.toLocaleString()}`}
              accent={C.green}
              extra={m.csatPct}
            />
            <StatCard
              label="DSAT Score"
              value={`${m.dsatPct}%`}
              sub={`${m.dsatN.toLocaleString()} dissatisfied out of ${m.total.toLocaleString()}`}
              accent={C.red}
              extra={m.dsatPct}
            />
            <StatCard
              label="SLA Breach"
              value={`${m.slaPct}%`}
              sub={`${m.slaY.toLocaleString()} breached out of ${m.total.toLocaleString()}`}
              accent={C.amber}
              extra={m.slaPct}
            />
          </div>
        )}

        {/* sentiment row */}
        {m.total > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 12, marginBottom: 20,
          }}>
            <StatCard
              label="Positive Feedback"
              value={`${m.posPct}%`}
              sub={`${m.posN.toLocaleString()} positive rows`}
              accent={C.green}
              extra={m.posPct}
            />
            <StatCard
              label="Negative Feedback"
              value={`${m.negPct}%`}
              sub={`${m.negN.toLocaleString()} negative rows`}
              accent={C.red}
              extra={m.negPct}
            />
            <StatCard
              label="Neutral Feedback"
              value={`${m.neuPct}%`}
              sub={`${m.neuN.toLocaleString()} neutral rows`}
              accent={C.amber}
              extra={m.neuPct}
            />
          </div>
        )}

        {/* go to charts button */}
        {m.total > 0 && (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '14px 20px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                📊 View Charts and Visualizations
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                Pie charts · Bar charts · Trend charts · NPS breakdown
              </div>
            </div>
            <button onClick={onGoCharts} style={{
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border: 'none', borderRadius: 9, padding: '10px 24px',
              color: '#000', fontSize: 12, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Open Charts →
            </button>
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
                CSV (.csv) and Excel (.xlsx, .xls)
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = '' }}
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
                <div style={{ fontSize: 32, marginBottom: 8 }}>{dragging ? '📂' : '📁'}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: dragging ? C.cyan : C.text, marginBottom: 4 }}>
                  {dragging ? 'Drop to import!' : 'Drag & drop or click Browse File'}
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>CSV and Excel accepted</div>
                {fileMeta && (
                  <div style={{ marginTop: 10, fontSize: 11, color: C.green, fontWeight: 700 }}>
                    ✓ {fileMeta.name} — {m.total.toLocaleString()} rows loaded
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div style={{
              marginTop: 12, background: C.red + '10',
              border: `1px solid ${C.red}40`, borderRadius: 8,
              padding: '9px 13px', fontSize: 12, color: C.red, fontWeight: 600,
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
            <div style={{ fontSize: 14, color: C.amber, fontWeight: 700 }}>Loading data…</div>
          </div>
        ) : rows.length > 0 ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Data Table</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                Click headers to sort · Dropdowns to filter · Search box for global search · 5,000 rows per page
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

// need useState import
import { useState } from 'react'



import { useMemo } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff', sky:'#79c0ff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

const TT = {
  background: C.panel, border: `1px solid ${C.border}`,
  borderRadius: 8, fontSize: 11, color: C.text,
}

// ── accurate metrics ──────────────────────────────────────
function calcMetrics(rows) {
  const total = rows.length
  if (!total) return {}

  let csatN=0, dsatN=0, slaY=0, slaN=0
  let posN=0,  negN=0,  neuN=0
  let promoter=0, passive=0, detractor=0

  // group by columns
  const byDept    = {}
  const byIndustry = {}
  const byPriority = {}
  const byProject  = {}
  const npsScores  = []

  rows.forEach(r => {
    const cv = String(r.CSAT ?? r.csat ?? '').trim()
    if (cv === '1' || cv.toLowerCase() === 'true') csatN++

    const dv = String(r.DSAT ?? r.dsat ?? '').trim()
    if (dv === '1' || dv.toLowerCase() === 'true') dsatN++

    const sv = String(r.SLA_Breached ?? '').trim().toLowerCase()
    if (sv === 'yes' || sv === '1') slaY++
    else slaN++

    const sent = String(r.Predicted_Sentiment ?? r.Sentiment ?? '').trim().toLowerCase()
    if (sent === 'positive') posN++
    else if (sent === 'negative') negN++
    else if (sent === 'neutral') neuN++

    const nps = String(r.NPS_Category ?? '').trim()
    if (nps === 'Promoter') promoter++
    else if (nps === 'Passive') passive++
    else if (nps === 'Detractor') detractor++

    // NPS scores for distribution
    const score = parseFloat(r.NPS_Score ?? r.nps_score ?? '')
    if (!isNaN(score)) npsScores.push(score)

    // department grouping
    const dept = String(r.Department ?? r.department ?? '').trim()
    if (dept) {
      if (!byDept[dept]) byDept[dept] = { name:dept, CSAT:0, DSAT:0, total:0 }
      byDept[dept].total++
      if (cv === '1') byDept[dept].CSAT++
      if (dv === '1') byDept[dept].DSAT++
    }

    // industry grouping
    const ind = String(r.Industry ?? r.industry ?? '').trim()
    if (ind) {
      if (!byIndustry[ind]) byIndustry[ind] = { name:ind, CSAT:0, DSAT:0, total:0 }
      byIndustry[ind].total++
      if (cv === '1') byIndustry[ind].CSAT++
      if (dv === '1') byIndustry[ind].DSAT++
    }

    // priority
    const pri = String(r.Priority ?? r.priority ?? '').trim()
    if (pri) {
      if (!byPriority[pri]) byPriority[pri] = { name:pri, SLA_Breach:0, total:0 }
      byPriority[pri].total++
      if (sv === 'yes') byPriority[pri].SLA_Breach++
    }

    // project type
    const proj = String(r.Project_Type ?? r.Issue_Category ?? '').trim()
    if (proj) {
      if (!byProject[proj]) byProject[proj] = { name:proj, count:0 }
      byProject[proj].count++
    }
  })

  const pct = n => total ? parseFloat((n / total * 100).toFixed(1)) : 0

  // dept CSAT pct
  const deptData = Object.values(byDept).map(d => ({
    name: d.name,
    'CSAT %': d.total ? parseFloat((d.CSAT / d.total * 100).toFixed(1)) : 0,
    'DSAT %': d.total ? parseFloat((d.DSAT / d.total * 100).toFixed(1)) : 0,
  })).sort((a, b) => b['CSAT %'] - a['CSAT %']).slice(0, 8)

  const industryData = Object.values(byIndustry).map(d => ({
    name: d.name,
    'CSAT %': d.total ? parseFloat((d.CSAT / d.total * 100).toFixed(1)) : 0,
    'DSAT %': d.total ? parseFloat((d.DSAT / d.total * 100).toFixed(1)) : 0,
  })).sort((a, b) => b['CSAT %'] - a['CSAT %']).slice(0, 8)

  const priorityData = Object.values(byPriority)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => ({
      name: d.name,
      'SLA Breach': d.SLA_Breach,
      'Compliant':  d.total - d.SLA_Breach,
    }))

  const projectData = Object.values(byProject)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // NPS score distribution 0-10
  const npsDistrib = Array.from({ length: 11 }, (_, i) => ({
    score: String(i),
    count: npsScores.filter(s => s === i).length,
  }))

  return {
    total, csatN, dsatN, slaY, slaN,
    posN, negN, neuN,
    promoter, passive, detractor,
    csatPct: pct(csatN), dsatPct: pct(dsatN), slaPct: pct(slaY),
    posPct: pct(posN), negPct: pct(negN), neuPct: pct(neuN),
    deptData, industryData, priorityData, projectData, npsDistrib,
  }
}

function ChartCard({ title, subtitle, children, span }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '18px 20px',
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10, color: C.sub, marginBottom: 14 }}>{subtitle}</div>
      )}
      {!subtitle && <div style={{ marginBottom: 14 }} />}
      {children}
    </div>
  )
}

function MetricBadge({ label, value, accent }) {
  return (
    <div style={{
      background: accent + '12', border: `1px solid ${accent}30`,
      borderRadius: 10, padding: '14px 18px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: accent, fontFamily: 'monospace' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: C.sub, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

export default function Charts({ rows, user, onBack, onLogout }) {
  const m = useMemo(() => calcMetrics(rows), [rows])

  const ROLE_COLOR = { Admin:C.red, Manager:C.amber, Developer:C.cyan }
  const roleColor  = ROLE_COLOR[user.role] || C.violet

  const sentPie  = [
    { name:'Positive',  value: m.posN  || 0 },
    { name:'Negative',  value: m.negN  || 0 },
    { name:'Neutral',   value: m.neuN  || 0 },
  ]
  const csatPie  = [
    { name:'Satisfied',     value: m.csatN || 0 },
    { name:'Unsatisfied',   value: (m.total - m.csatN) || 0 },
  ]
  const dsatPie  = [
    { name:'Dissatisfied',  value: m.dsatN || 0 },
    { name:'Satisfied',     value: (m.total - m.dsatN) || 0 },
  ]
  const npsPie   = [
    { name:'Promoter',   value: m.promoter   || 0 },
    { name:'Passive',    value: m.passive    || 0 },
    { name:'Detractor',  value: m.detractor  || 0 },
  ]
  const slaPie   = [
    { name:'Breached',   value: m.slaY  || 0 },
    { name:'Compliant',  value: m.slaN  || 0 },
  ]

  const SENT_COLORS  = [C.green,  C.red,    C.amber]
  const CSAT_COLORS  = [C.green,  C.border]
  const DSAT_COLORS  = [C.red,    C.border]
  const NPS_COLORS   = [C.cyan,   C.violet, C.red]
  const SLA_COLORS   = [C.red,    C.green]

  const hasDept    = m.deptData    && m.deptData.length    > 0
  const hasIndustry= m.industryData&& m.industryData.length> 0
  const hasPriority= m.priorityData&& m.priorityData.length> 0
  const hasProject = m.projectData && m.projectData.length > 0

  return (
    <div style={{
      minHeight: '100vh', background: C.bg0, color: C.text,
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>

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
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
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

        {/* nav */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          <button onClick={onBack} style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.sub, borderRadius: 7, padding: '5px 14px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>📋 Data</button>

          <div style={{
            background: C.cyan + '18', border: `1px solid ${C.cyan}50`,
            color: C.cyan, borderRadius: 7, padding: '5px 14px',
            fontSize: 11, fontWeight: 700,
          }}>📊 Charts</div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          background: C.dim + '18', border: `1px solid ${C.border}`,
          borderRadius: 7, padding: '4px 12px',
          fontSize: 10, color: C.sub,
        }}>
          {m.total?.toLocaleString()} rows loaded
        </div>

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

      <main style={{ padding: '22px 24px', maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: C.cyan, margin: 0, letterSpacing: 1 }}>
            Charts & Analytics
          </h1>
          <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>
            Visual breakdown of your sentiment data · {m.total?.toLocaleString()} records
          </p>
        </div>

        {/* ── KEY METRIC BADGES ───────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
          gap: 12, marginBottom: 20,
        }}>
          <MetricBadge label="Total Rows"  value={m.total?.toLocaleString()}  accent={C.sky}    />
          <MetricBadge label="CSAT"        value={`${m.csatPct}%`}            accent={C.green}  />
          <MetricBadge label="DSAT"        value={`${m.dsatPct}%`}            accent={C.red}    />
          <MetricBadge label="SLA Breach"  value={`${m.slaPct}%`}             accent={C.amber}  />
          <MetricBadge label="Promoters"   value={m.promoter?.toLocaleString()} accent={C.cyan} />
        </div>

        {/* ── ROW 1 — 3 Pie Charts ────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 14, marginBottom: 14,
        }}>

          {/* Sentiment Pie */}
          <ChartCard title="Sentiment Distribution" subtitle="Positive / Negative / Neutral breakdown">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sentPie} cx="50%" cy="50%"
                  outerRadius={75} innerRadius={30}
                  dataKey="value" paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {sentPie.map((_, i) => <Cell key={i} fill={SENT_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* CSAT Pie */}
          <ChartCard title="CSAT Breakdown" subtitle={`${m.csatPct}% customers satisfied`}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={csatPie} cx="50%" cy="50%"
                  outerRadius={75} innerRadius={30}
                  dataKey="value" paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {csatPie.map((_, i) => <Cell key={i} fill={CSAT_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* DSAT Pie */}
          <ChartCard title="DSAT Breakdown" subtitle={`${m.dsatPct}% customers dissatisfied`}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dsatPie} cx="50%" cy="50%"
                  outerRadius={75} innerRadius={30}
                  dataKey="value" paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {dsatPie.map((_, i) => <Cell key={i} fill={DSAT_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── ROW 2 — NPS + SLA ───────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 14, marginBottom: 14,
        }}>

          {/* NPS Pie */}
          <ChartCard
            title="NPS Category Distribution"
            subtitle={`Promoters: ${m.promoter} · Passives: ${m.passive} · Detractors: ${m.detractor}`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={npsPie} cx="50%" cy="50%"
                  outerRadius={85} innerRadius={35}
                  dataKey="value" paddingAngle={3}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent*100).toFixed(0)}%)`
                  }
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {npsPie.map((_, i) => <Cell key={i} fill={NPS_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* SLA Pie */}
          <ChartCard
            title="SLA Breach Status"
            subtitle={`${m.slaY} breached · ${m.slaN} compliant · ${m.slaPct}% breach rate`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={slaPie} cx="50%" cy="50%"
                  outerRadius={85} innerRadius={35}
                  dataKey="value" paddingAngle={3}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent*100).toFixed(0)}%)`
                  }
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {slaPie.map((_, i) => <Cell key={i} fill={SLA_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── ROW 3 — CSAT DSAT Summary Bar ───────────── */}
        <div style={{ marginBottom: 14 }}>
          <ChartCard title="CSAT vs DSAT vs SLA Breach Overview" subtitle="Percentage comparison">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: 'CSAT %',       value: m.csatPct, fill: C.green  },
                  { name: 'DSAT %',       value: m.dsatPct, fill: C.red    },
                  { name: 'SLA Breach %', value: m.slaPct,  fill: C.amber  },
                  { name: 'Positive %',   value: m.posPct,  fill: C.green  },
                  { name: 'Negative %',   value: m.negPct,  fill: C.red    },
                  { name: 'Neutral %',    value: m.neuPct,  fill: C.amber  },
                ]}
                barSize={50}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" stroke={C.dim} fontSize={10} />
                <YAxis stroke={C.dim} fontSize={10} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={TT}
                  formatter={v => [`${v}%`]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {[C.green,C.red,C.amber,C.green,C.red,C.amber].map((fill, i) => (
                    <Cell key={i} fill={fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── ROW 4 — NPS Score Distribution Bar ──────── */}
        <div style={{ marginBottom: 14 }}>
          <ChartCard
            title="NPS Score Distribution (0–10)"
            subtitle="How many customers gave each score"
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={m.npsDistrib} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="score" stroke={C.dim} fontSize={10} label={{ value: 'NPS Score', position: 'insideBottom', offset: -2, fill: C.dim, fontSize: 10 }} />
                <YAxis stroke={C.dim} fontSize={10} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {m.npsDistrib?.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        parseInt(d.score) >= 9 ? C.green  :
                        parseInt(d.score) >= 7 ? C.cyan   :
                        C.red
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── ROW 5 — Department CSAT/DSAT ────────────── */}
        {hasDept && (
          <div style={{ marginBottom: 14 }}>
            <ChartCard
              title="CSAT % and DSAT % by Department"
              subtitle="Internal employee feedback grouped by department"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={m.deptData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={10} />
                  <YAxis stroke={C.dim} fontSize={10} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TT} formatter={v => [`${v}%`]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CSAT %" fill={C.green} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="DSAT %" fill={C.red}   radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ── ROW 6 — Industry CSAT/DSAT ──────────────── */}
        {hasIndustry && (
          <div style={{ marginBottom: 14 }}>
            <ChartCard
              title="CSAT % and DSAT % by Industry"
              subtitle="External client feedback grouped by industry"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={m.industryData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={10} />
                  <YAxis stroke={C.dim} fontSize={10} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TT} formatter={v => [`${v}%`]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CSAT %" fill={C.cyan}   radius={[4, 4, 0, 0]} />
                  <Bar dataKey="DSAT %" fill={C.violet} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ── ROW 7 — SLA by Priority ─────────────────── */}
        {hasPriority && (
          <div style={{ marginBottom: 14 }}>
            <ChartCard
              title="SLA Breach by Priority"
              subtitle="P1 Critical · P2 Moderate · P3 Low"
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={m.priorityData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={10} />
                  <Tooltip contentStyle={TT} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="SLA Breach" fill={C.red}   radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Compliant"  fill={C.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ── ROW 8 — Top Issue/Project Types ─────────── */}
        {hasProject && (
          <div style={{ marginBottom: 14 }}>
            <ChartCard
              title="Top Issue / Project Categories"
              subtitle="Most frequent ticket or project types"
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={m.projectData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis type="number" stroke={C.dim} fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={10} width={130} />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="count" fill={C.violet} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* back button */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <button onClick={onBack} style={{
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
            border: 'none', borderRadius: 9, padding: '10px 32px',
            color: '#000', fontSize: 12, fontWeight: 900,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Back to Data Table
          </button>
        </div>

      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg0}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.bg0}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
      `}</style>
    </div>
  )
}
