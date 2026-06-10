import { useState, useRef } from 'react'
import DataTable    from '../components/DataTable.jsx'
import { readFile } from '../utils/fileParser.js'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', green:'#3fb950', red:'#f85149',
  amber:'#d29922', violet:'#bc8cff', sky:'#79c0ff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

// finds column regardless of case/spaces
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

function calcMetrics(rows) {
  if (!rows || !rows.length) {
    return {
      total:0,csatN:0,dsatN:0,slaY:0,
      posN:0,negN:0,neuN:0,
      csatPct:0,dsatPct:0,slaPct:0,
      posPct:0,negPct:0,neuPct:0,
      csatCol:null,dsatCol:null,slaCol:null,sentCol:null,
    }
  }

  const sample = rows[0]

  // ── find columns — supports YOUR file AND standard names ──
  const csatCol = findCol(sample,
    'ISHAPPY','IsHappy','ishappy','is_happy',    // your file
    'CSAT','csat','Csat','customer_satisfaction' // standard
  )
  const dsatCol = findCol(sample,
    'ISSAD','IsSad','issad','is_sad',            // your file
    'DSAT','dsat','Dsat','customer_dissatisfaction'
  )
  const passiveCol = findCol(sample,
    'ISPASSIVE','IsPassive','ispassive','is_passive'
  )
  const slaCol = findCol(sample,
    'SLA_Breached','sla_breached','SLA Breached',
    'SLABreached','sla breached',
    'ISSLA','IsSLA','issla'
  )
  const sentCol = findCol(sample,
    'Predicted_Sentiment','predicted_sentiment',
    'Sentiment','sentiment','SENTIMENT'
  )
  const npsCol = findCol(sample,
    'MAIN SCORE','MainScore','main_score','mainscore', // your file
    'NPS_Score','nps_score','NPS Score','nps'
  )

  console.log('=== COLUMN DETECTION ===')
  console.log('All columns:', Object.keys(sample))
  console.log('CSAT col (ISHAPPY):', csatCol)
  console.log('DSAT col (ISSAD):', dsatCol)
  console.log('Passive col:', passiveCol)
  console.log('SLA col:', slaCol)
  console.log('Sentiment col:', sentCol)
  console.log('NPS col:', npsCol)

  let csatN=0, dsatN=0, slaY=0, posN=0, negN=0, neuN=0

  rows.forEach(r => {
    // CSAT — ISHAPPY = 1 means happy/satisfied
    if (csatCol) {
      const v = String(r[csatCol] ?? '').trim().toLowerCase()
      if (v === '1' || v === 'true' || v === 'yes') csatN++
    }

    // DSAT — ISSAD = 1 means sad/dissatisfied
    if (dsatCol) {
      const v = String(r[dsatCol] ?? '').trim().toLowerCase()
      if (v === '1' || v === 'true' || v === 'yes') dsatN++
    }

    // SLA
    if (slaCol) {
      const v = String(r[slaCol] ?? '').trim().toLowerCase()
      if (v === 'yes' || v === '1' || v === 'true') slaY++
    }

    // Sentiment — from Predicted_Sentiment column if exists
    if (sentCol) {
      const v = String(r[sentCol] ?? '').trim().toLowerCase()
      if (v === 'positive') posN++
      else if (v === 'negative') negN++
      else if (v === 'neutral') neuN++
    }
    // Derive sentiment from ISHAPPY/ISSAD/ISPASSIVE
    else if (csatCol || dsatCol || passiveCol) {
      const happy   = String(r[csatCol]    ?? '0').trim()
      const sad     = String(r[dsatCol]    ?? '0').trim()
      const passive = String(r[passiveCol] ?? '0').trim()
      if (happy   === '1') posN++
      else if (sad === '1') negN++
      else if (passive==='1') neuN++
    }
  })

  const total = rows.length
  const pct   = n => total ? parseFloat((n / total * 100).toFixed(1)) : 0

  return {
    total, csatN, dsatN, slaY,
    posN, negN, neuN,
    csatPct: pct(csatN),
    dsatPct: pct(dsatN),
    slaPct:  pct(slaY),
    posPct:  pct(posN),
    negPct:  pct(negN),
    neuPct:  pct(neuN),
    csatCol, dsatCol, slaCol, sentCol, npsCol,
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
        <div style={{ fontSize: 11, color: C.dim, marginTop: 5 }}>
          {sub}
        </div>
      )}
      <div style={{
        marginTop: 10, height: 3,
        background: accent + '20', borderRadius: 2,
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(parseFloat(value)||0, 100)}%`,
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
  if (!m.csatCol) missing.push('ISHAPPY or CSAT')
  if (!m.dsatCol) missing.push('ISSAD or DSAT')
  if (missing.length === 0) return null
  return (
    <div style={{
      background: C.amber + '10',
      border: `1px solid ${C.amber}40`,
      borderRadius: 9, padding: '10px 14px',
      marginBottom: 16, fontSize: 11, color: C.amber,
    }}>
      ⚠ Could not find columns: <strong>{missing.join(', ')}</strong>
      <br/>
      <span style={{ color: C.dim }}>
        Open browser console (F12) to see all detected columns.
      </span>
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
          name: result.fileName,
          type: result.type,
          sheet: result.sheet,
        })
        setLoading(false)
        notify(
          `Imported ${result.rows.length.toLocaleString()} rows`,
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
            <div style={{ fontSize: 13, fontWeight: 900, color: C.cyan, letterSpacing: 2 }}>
              SENTIMENTIQ
            </div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1.5 }}>
              NTT DATA · AI PLATFORM
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          <div style={{
            background: C.cyan + '18', border: `1px solid ${C.cyan}50`,
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
          background: C.red + '15', border: `1px solid ${C.red}40`,
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
            ISHAPPY = CSAT · ISSAD = DSAT · MAIN SCORE = NPS
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
                label="CSAT (ISHAPPY=1)"
                value={`${m.csatPct}%`}
                sub={`${m.csatN.toLocaleString()} happy of ${m.total.toLocaleString()}`}
                accent={C.green}
              />
              <StatCard
                label="DSAT (ISSAD=1)"
                value={`${m.dsatPct}%`}
                sub={`${m.dsatN.toLocaleString()} sad of ${m.total.toLocaleString()}`}
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
                  Pie charts · Bar charts · NPS · Region · Team analysis
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

        {/* import */}
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
                CSV and Excel accepted
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
            }}
          >
            {loading ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ color: C.amber, fontSize: 13, fontWeight: 700 }}>
                  Parsing file…
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {dragging ? '📂' : '📁'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                  Drag & drop or click Browse File
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  CSV and Excel accepted
                </div>
                {fileMeta && (
                  <div style={{ marginTop: 10, fontSize: 11, color: C.green, fontWeight: 700 }}>
                    ✓ {fileMeta.name} — {m.total.toLocaleString()} rows
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div style={{
              marginTop: 12, background: C.red + '10',
              border: `1px solid ${C.red}40`, borderRadius: 8,
              padding: '9px 13px', fontSize: 12,
              color: C.red, fontWeight: 600,
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
              Loading…
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
                Search box for global search · 5,000 rows per page
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
              No data yet
            </div>
            <button onClick={() => fileRef.current?.click()} style={{
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border: 'none', borderRadius: 9, padding: '10px 28px',
              color: '#000', fontSize: 12, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>⬆ Import File</button>
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
        onLogout={() => { setUser(null); setPage('dashboard'); setRows([]) }}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      rows={rows}
      setRows={setRows}
      onLogout={() => { setUser(null); setPage('dashboard'); setRows([]) }}
      onGoCharts={() => setPage('charts')}
    />
  )
}





import { useMemo } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
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
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 11,
  color: C.text,
}

// ── finds column ignoring case and spaces ─────────────────
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

// ── calculate all metrics from your actual columns ────────
function calcMetrics(rows) {
  if (!rows || !rows.length) return null

  const s = rows[0]

  // detect columns — YOUR file columns first, then standard names
  const csatCol     = findCol(s,
    'ISHAPPY','IsHappy','ishappy','is_happy',
    'CSAT','csat','Csat'
  )
  const dsatCol     = findCol(s,
    'ISSAD','IsSad','issad','is_sad',
    'DSAT','dsat','Dsat'
  )
  const passiveCol  = findCol(s,
    'ISPASSIVE','IsPassive','ispassive','is_passive'
  )
  const slaCol      = findCol(s,
    'SLA_Breached','SLABreached','sla_breached','SLA Breached'
  )
  const sentCol     = findCol(s,
    'Predicted_Sentiment','predicted_sentiment',
    'Sentiment','sentiment'
  )
  const npsScoreCol = findCol(s,
    'MAIN SCORE','MainScore','main_score','mainscore',
    'NPS_Score','nps_score','NPS Score'
  )
  const npsCatCol   = findCol(s,
    'NPS_Category','nps_category','NPS Category'
  )
  const deptCol     = findCol(s,
    'TEAM','Team','team',
    'Department','department'
  )
  const indCol      = findCol(s,
    'REGION','Region','region',
    'Industry','industry'
  )
  const priCol      = findCol(s,
    'Priority','priority','PRIORITY'
  )
  const projCol     = findCol(s,
    'ASSIGNMENT GROUP','AssignmentGroup','assignment_group',
    'ASSIGNMENTGROUP','SurveyAssigneeGroup','surveyassigneegroup',
    'Project_Type','Issue_Category','issue_category'
  )

  console.log('=== CHARTS COLUMNS ===')
  console.log('All columns in file:', Object.keys(s))
  console.log('csatCol   (ISHAPPY) :', csatCol)
  console.log('dsatCol   (ISSAD)   :', dsatCol)
  console.log('passiveCol(ISPASSIVE):', passiveCol)
  console.log('npsScoreCol(MAIN SCORE):', npsScoreCol)
  console.log('deptCol   (TEAM)    :', deptCol)
  console.log('indCol    (REGION)  :', indCol)
  console.log('projCol             :', projCol)

  let csatN=0, dsatN=0, slaY=0, slaN=0
  let posN=0,  negN=0,  neuN=0
  let promoter=0, passive=0, detractor=0

  const byDept = {}
  const byInd  = {}
  const byPri  = {}
  const byProj = {}
  const npsScores = []

  rows.forEach(r => {
    const cv = String(r[csatCol]    ?? '').trim().toLowerCase()
    const dv = String(r[dsatCol]    ?? '').trim().toLowerCase()
    const pv = String(r[passiveCol] ?? '').trim().toLowerCase()

    // CSAT — ISHAPPY = 1
    if (csatCol && (cv === '1' || cv === 'true' || cv === 'yes')) csatN++

    // DSAT — ISSAD = 1
    if (dsatCol && (dv === '1' || dv === 'true' || dv === 'yes')) dsatN++

    // SLA
    if (slaCol) {
      const sv = String(r[slaCol] ?? '').trim().toLowerCase()
      if (sv === 'yes' || sv === '1' || sv === 'true') slaY++
      else slaN++
    }

    // Sentiment — from Predicted_Sentiment column if exists
    // else derive from ISHAPPY / ISSAD / ISPASSIVE
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

    // NPS Category
    if (npsCatCol) {
      const v = String(r[npsCatCol] ?? '').trim()
      if      (v === 'Promoter')  promoter++
      else if (v === 'Passive')   passive++
      else if (v === 'Detractor') detractor++
    }

    // NPS Score distribution
    if (npsScoreCol) {
      const n = parseFloat(r[npsScoreCol])
      if (!isNaN(n)) npsScores.push(Math.round(n))
    }

    // ── TEAM / Department grouping ─────────────────────
    if (deptCol) {
      const k = String(r[deptCol] ?? '').trim()
      if (k) {
        if (!byDept[k]) byDept[k] = { name:k, csat:0, dsat:0, total:0 }
        byDept[k].total++
        if (cv === '1') byDept[k].csat++
        if (dv === '1') byDept[k].dsat++
      }
    }

    // ── REGION / Industry grouping ─────────────────────
    if (indCol) {
      const k = String(r[indCol] ?? '').trim()
      if (k) {
        if (!byInd[k]) byInd[k] = { name:k, csat:0, dsat:0, total:0 }
        byInd[k].total++
        if (cv === '1') byInd[k].csat++
        if (dv === '1') byInd[k].dsat++
      }
    }

    // ── Priority grouping ──────────────────────────────
    if (priCol) {
      const k = String(r[priCol] ?? '').trim()
      if (k) {
        if (!byPri[k]) byPri[k] = { name:k, breach:0, ok:0 }
        if (slaCol && String(r[slaCol] ?? '').trim().toLowerCase() === 'yes')
          byPri[k].breach++
        else
          byPri[k].ok++
      }
    }

    // ── Assignment Group / Project grouping ────────────
    if (projCol) {
      const k = String(r[projCol] ?? '').trim()
      if (k) {
        if (!byProj[k]) byProj[k] = { name:k, count:0 }
        byProj[k].count++
      }
    }
  })

  const total = rows.length
  const pct   = n => total ? parseFloat((n / total * 100).toFixed(1)) : 0

  return {
    total, csatN, dsatN, slaY, slaN,
    posN, negN, neuN,
    promoter, passive, detractor,
    csatPct: pct(csatN),
    dsatPct: pct(dsatN),
    slaPct:  pct(slaY),
    posPct:  pct(posN),
    negPct:  pct(negN),
    neuPct:  pct(neuN),

    deptData: Object.values(byDept)
      .map(d => ({
        name:    d.name,
        'CSAT%': d.total ? parseFloat((d.csat/d.total*100).toFixed(1)) : 0,
        'DSAT%': d.total ? parseFloat((d.dsat/d.total*100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b['CSAT%'] - a['CSAT%'])
      .slice(0, 10),

    indData: Object.values(byInd)
      .map(d => ({
        name:    d.name,
        'CSAT%': d.total ? parseFloat((d.csat/d.total*100).toFixed(1)) : 0,
        'DSAT%': d.total ? parseFloat((d.dsat/d.total*100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b['CSAT%'] - a['CSAT%'])
      .slice(0, 10),

    priData: Object.values(byPri)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(d => ({
        name:        d.name,
        'SLA Breach': d.breach,
        'Compliant':  d.ok,
      })),

    projData: Object.values(byProj)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),

    npsDistrib: Array.from({ length: 11 }, (_, i) => ({
      score: String(i),
      count: npsScores.filter(s => s === i).length,
    })),
  }
}

// ── Chart card wrapper ────────────────────────────────────
function ChartBox({ title, sub, children }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: C.text, marginBottom: 2,
      }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: C.sub, marginBottom: 14 }}>
          {sub}
        </div>
      )}
      {!sub && <div style={{ marginBottom: 14 }} />}
      {children}
    </div>
  )
}

// ── KPI badge ─────────────────────────────────────────────
function KPI({ label, value, accent }) {
  return (
    <div style={{
      background: accent + '12',
      border: `1px solid ${accent}30`,
      borderRadius: 10, padding: '14px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 26, fontWeight: 900,
        color: accent, fontFamily: 'monospace',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, color: C.sub, marginTop: 4,
        letterSpacing: 1, textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  )
}

// ── short pie label ───────────────────────────────────────
const PIE_LABEL = ({ percent }) =>
  percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''

// ── Main Charts page ──────────────────────────────────────
export default function Charts({ rows, user, onBack, onLogout }) {
  const m = useMemo(() => calcMetrics(rows), [rows])

  const ROLE_COLOR = { Admin:C.red, Manager:C.amber, Developer:C.cyan }
  const roleColor  = ROLE_COLOR[user?.role] || C.violet

  // no data guard
  if (!m) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg0,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column',
        gap: 16, fontFamily: 'monospace', color: C.text,
      }}>
        <div style={{ fontSize: 48 }}>📊</div>
        <div style={{ fontSize: 16, color: C.amber }}>No data to display</div>
        <button onClick={onBack} style={{
          background: C.cyan, border: 'none', borderRadius: 9,
          padding: '10px 24px', color: '#000',
          fontSize: 12, fontWeight: 900,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>← Back to Data</button>
      </div>
    )
  }

  // ── chart data ────────────────────────────────────────
  const sentPie = [
    { name: 'Positive',  value: m.posN  },
    { name: 'Negative',  value: m.negN  },
    { name: 'Neutral',   value: m.neuN  },
  ]

  const csatPie = [
    { name: `Satisfied (${m.csatPct}%)`,    value: m.csatN },
    { name: `Unsatisfied (${parseFloat((100-m.csatPct).toFixed(1))}%)`,
      value: m.total - m.csatN },
  ]

  const dsatPie = [
    { name: `Dissatisfied (${m.dsatPct}%)`, value: m.dsatN },
    { name: `OK (${parseFloat((100-m.dsatPct).toFixed(1))}%)`,
      value: m.total - m.dsatN },
  ]

  const npsPie = [
    { name: 'Promoter',  value: m.promoter  },
    { name: 'Passive',   value: m.passive   },
    { name: 'Detractor', value: m.detractor },
  ]

  const slaPie = [
    { name: `Breached (${m.slaPct}%)`,     value: m.slaY  },
    { name: `Compliant (${parseFloat((100-m.slaPct).toFixed(1))}%)`,
      value: m.slaN },
  ]

  const overviewBar = [
    { name: 'CSAT%',        value: m.csatPct },
    { name: 'DSAT%',        value: m.dsatPct },
    { name: 'SLA Breach%',  value: m.slaPct  },
    { name: 'Positive%',    value: m.posPct  },
    { name: 'Negative%',    value: m.negPct  },
    { name: 'Neutral%',     value: m.neuPct  },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: C.bg0, color: C.text,
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>

      {/* ── Header ─────────────────────────────────────── */}
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
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.sub, borderRadius: 7, padding: '5px 14px',
            fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>📋 Data</button>

          <div style={{
            background: C.cyan + '18',
            border: `1px solid ${C.cyan}50`,
            color: C.cyan, borderRadius: 7, padding: '5px 14px',
            fontSize: 11, fontWeight: 700,
          }}>📊 Charts</div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          background: C.dim + '18',
          border: `1px solid ${C.border}`,
          borderRadius: 7, padding: '4px 12px',
          fontSize: 10, color: C.sub,
        }}>
          {m.total.toLocaleString()} rows
        </div>

        <div style={{
          background: roleColor + '12',
          border: `1px solid ${roleColor}40`,
          borderRadius: 7, padding: '4px 12px',
          fontSize: 10, color: roleColor, fontWeight: 700,
        }}>
          👤 {user?.name}
          <span style={{ color: C.dim, fontWeight: 400 }}>
            {' '}· {user?.role}
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

      {/* ── Main ───────────────────────────────────────── */}
      <main style={{ padding: '22px 24px', maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontSize: 18, fontWeight: 900,
            color: C.cyan, margin: 0, letterSpacing: 1,
          }}>Charts & Analytics</h1>
          <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>
            {m.total.toLocaleString()} records ·
            ISHAPPY = CSAT · ISSAD = DSAT ·
            TEAM = Department · REGION = Industry
          </p>
        </div>

        {/* ── KPI row ──────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6,1fr)',
          gap: 10, marginBottom: 20,
        }}>
          <KPI label="Total"      value={m.total.toLocaleString()} accent={C.sky}    />
          <KPI label="CSAT"       value={`${m.csatPct}%`}          accent={C.green}  />
          <KPI label="DSAT"       value={`${m.dsatPct}%`}          accent={C.red}    />
          <KPI label="SLA Breach" value={`${m.slaPct}%`}           accent={C.amber}  />
          <KPI label="Positive"   value={`${m.posPct}%`}           accent={C.green}  />
          <KPI label="Negative"   value={`${m.negPct}%`}           accent={C.red}    />
        </div>

        {/* ── Row 1 — Sentiment · CSAT · DSAT pies ─────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 14, marginBottom: 14,
        }}>

          <ChartBox
            title="Sentiment Distribution"
            sub={`Positive: ${m.posN} · Negative: ${m.negN} · Neutral: ${m.neuN}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={sentPie} cx="50%" cy="50%"
                  outerRadius={78} innerRadius={32}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.green}/>
                  <Cell fill={C.red}/>
                  <Cell fill={C.amber}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="CSAT — Customer Satisfaction"
            sub={`${m.csatN.toLocaleString()} satisfied (ISHAPPY=1) of ${m.total.toLocaleString()}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={csatPie} cx="50%" cy="50%"
                  outerRadius={78} innerRadius={32}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.green}/>
                  <Cell fill={C.border}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="DSAT — Customer Dissatisfaction"
            sub={`${m.dsatN.toLocaleString()} dissatisfied (ISSAD=1) of ${m.total.toLocaleString()}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={dsatPie} cx="50%" cy="50%"
                  outerRadius={78} innerRadius={32}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.red}/>
                  <Cell fill={C.border}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* ── Row 2 — NPS + SLA pies ───────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 14, marginBottom: 14,
        }}>

          <ChartBox
            title="NPS Category Distribution"
            sub={`Promoters: ${m.promoter} · Passives: ${m.passive} · Detractors: ${m.detractor}`}
          >
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={npsPie} cx="50%" cy="50%"
                  outerRadius={88} innerRadius={36}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.cyan}/>
                  <Cell fill={C.violet}/>
                  <Cell fill={C.red}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="SLA Breach Status"
            sub={`${m.slaY} breached · ${m.slaN} compliant · ${m.slaPct}% breach rate`}
          >
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={slaPie} cx="50%" cy="50%"
                  outerRadius={88} innerRadius={36}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.red}/>
                  <Cell fill={C.green}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* ── Row 3 — Overview bar ─────────────────────── */}
        <div style={{ marginBottom: 14 }}>
          <ChartBox
            title="All Metrics Overview"
            sub="CSAT · DSAT · SLA · Positive · Negative · Neutral percentage comparison"
          >
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={overviewBar} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="name" stroke={C.dim} fontSize={10}/>
                <YAxis stroke={C.dim} fontSize={10} domain={[0,100]} unit="%"/>
                <Tooltip
                  contentStyle={TT}
                  formatter={v => [`${v}%`]}
                />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {overviewBar.map((_, i) => (
                    <Cell
                      key={i}
                      fill={[C.green,C.red,C.amber,C.green,C.red,C.amber][i]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* ── Row 4 — NPS Score Distribution ──────────── */}
        {m.npsDistrib.some(d => d.count > 0) && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="NPS / Main Score Distribution (0–10)"
              sub="Number of customers per score — Green=Promoter · Blue=Passive · Red=Detractor"
            >
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={m.npsDistrib} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="score" stroke={C.dim} fontSize={11}/>
                  <YAxis stroke={C.dim} fontSize={10}/>
                  <Tooltip contentStyle={TT}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {m.npsDistrib.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          parseInt(d.score) >= 9 ? C.green :
                          parseInt(d.score) >= 7 ? C.cyan  :
                          C.red
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* ── Row 5 — CSAT/DSAT by TEAM ────────────────── */}
        {m.deptData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="CSAT% and DSAT% by Team"
              sub="Which teams have highest satisfaction and dissatisfaction"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={m.deptData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis
                    dataKey="name" stroke={C.dim} fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                  <Tooltip contentStyle={TT} formatter={v => [`${v}%`]}/>
                  <Legend
                    iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="CSAT%" fill={C.green} radius={[4,4,0,0]}/>
                  <Bar dataKey="DSAT%" fill={C.red}   radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* ── Row 6 — CSAT/DSAT by REGION ─────────────── */}
        {m.indData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="CSAT% and DSAT% by Region"
              sub="Which regions have highest satisfaction and dissatisfaction"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={m.indData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis
                    dataKey="name" stroke={C.dim} fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                  <Tooltip contentStyle={TT} formatter={v => [`${v}%`]}/>
                  <Legend
                    iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="CSAT%" fill={C.cyan}   radius={[4,4,0,0]}/>
                  <Bar dataKey="DSAT%" fill={C.violet} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* ── Row 7 — SLA by Priority ──────────────────── */}
        {m.priData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="SLA Breach by Priority"
              sub="Breached vs Compliant tickets per priority level"
            >
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={m.priData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11}/>
                  <YAxis stroke={C.dim} fontSize={10}/>
                  <Tooltip contentStyle={TT}/>
                  <Legend
                    iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="SLA Breach" fill={C.red}   radius={[4,4,0,0]}/>
                  <Bar dataKey="Compliant"  fill={C.green} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* ── Row 8 — Assignment Group / Issue Types ────── */}
        {m.projData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="Top Assignment Groups / Issue Categories"
              sub="Most frequent ticket groups or issue types"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={m.projData}
                  layout="vertical"
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis type="number" stroke={C.dim} fontSize={10}/>
                  <YAxis
                    type="category" dataKey="name"
                    stroke={C.dim} fontSize={10}
                    width={160}
                  />
                  <Tooltip contentStyle={TT}/>
                  <Bar dataKey="count" fill={C.violet} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* back button */}
        <div style={{ textAlign: 'center', paddingBottom: 48, paddingTop: 10 }}>
          <button onClick={onBack} style={{
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
            border: 'none', borderRadius: 9, padding: '11px 36px',
            color: '#000', fontSize: 13, fontWeight: 900,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Back to Data Table
          </button>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg0}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg0}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
    </div>
  )
}
