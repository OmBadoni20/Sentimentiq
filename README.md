import { useState, useRef, useMemo } from 'react'
import DataTable    from '../components/DataTable.jsx'
import { readFile } from '../utils/fileParser.js'

// ── safe recharts import ──────────────────────────────────
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'

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
  if (val === null || val === undefined) return false
  return val === 1 || val === true ||
    String(val).trim().toLowerCase() === '1' ||
    String(val).trim().toLowerCase() === 'true' ||
    String(val).trim().toLowerCase() === 'yes'
}

function calcMetrics(rows) {
  try {
    if (!rows || !rows.length) return null
    const s = rows[0]

    const csatCol    = findCol(s,'ISHAPPY','ishappy','CSAT','csat')
    const dsatCol    = findCol(s,'ISSAD','issad','DSAT','dsat')
    const passiveCol = findCol(s,'ISPASSIVE','ispassive')
    const sentCol    = findCol(s,'Predicted_Sentiment','Sentiment','sentiment')
    const teamCol    = findCol(s,'TEAM','Team','Department','department')
    const regionCol  = findCol(s,'REGION','Region','Industry','industry')

    let csatN=0, dsatN=0, posN=0, negN=0, neuN=0
    const byTeam={}, byRegion={}

    rows.forEach(r => {
      try {
        const cv = r[csatCol]
        const dv = r[dsatCol]
        const pv = r[passiveCol]

        if (csatCol && isTrue(cv)) csatN++
        if (dsatCol && isTrue(dv)) dsatN++

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

        if (teamCol) {
          const k = String(r[teamCol]??'').trim()
          if (k && k!=='nan') {
            if (!byTeam[k]) byTeam[k]={name:k,csat:0,dsat:0,total:0}
            byTeam[k].total++
            if (isTrue(cv)) byTeam[k].csat++
            if (isTrue(dv)) byTeam[k].dsat++
          }
        }

        if (regionCol) {
          const k = String(r[regionCol]??'').trim()
          if (k && k!=='nan') {
            if (!byRegion[k]) byRegion[k]={name:k,csat:0,dsat:0,total:0}
            byRegion[k].total++
            if (isTrue(cv)) byRegion[k].csat++
            if (isTrue(dv)) byRegion[k].dsat++
          }
        }
      } catch(e) { /* skip bad row */ }
    })

    const total = rows.length
    const pct   = n => total ? parseFloat((n/total*100).toFixed(1)) : 0

    return {
      total, csatN, dsatN, posN, negN, neuN,
      csatPct: pct(csatN), dsatPct: pct(dsatN),
      posPct:  pct(posN),  negPct:  pct(negN),
      neuPct:  pct(neuN),
      teamData: Object.values(byTeam)
        .map(d=>({
          name:    d.name,
          'CSAT%': d.total?parseFloat((d.csat/d.total*100).toFixed(1)):0,
          'DSAT%': d.total?parseFloat((d.dsat/d.total*100).toFixed(1)):0,
        }))
        .sort((a,b)=>b['CSAT%']-a['CSAT%']).slice(0,10),
      regionData: Object.values(byRegion)
        .map(d=>({
          name:    d.name,
          'CSAT%': d.total?parseFloat((d.csat/d.total*100).toFixed(1)):0,
          'DSAT%': d.total?parseFloat((d.dsat/d.total*100).toFixed(1)):0,
        }))
        .sort((a,b)=>b['CSAT%']-a['CSAT%']).slice(0,10),
    }
  } catch(e) {
    console.error('calcMetrics error:', e)
    return null
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
        textTransform:'uppercase', marginBottom:6,
        fontFamily:'monospace',
      }}>{label}</div>
      <div style={{
        fontSize:30, fontWeight:900, color:accent,
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
          width:`${Math.min(parseFloat(value)||0, 100)}%`,
          background:accent, borderRadius:2,
          transition:'width .5s',
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

export default function Dashboard({ user, rows, setRows, onLogout }) {
  const [fileMeta, setFileMeta] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [toast,    setToast]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  // ALL hooks must be at top — never inside conditions
  const m = useMemo(() => {
    try { return calcMetrics(rows) }
    catch(e) { return null }
  }, [rows])

  const sentBarData = useMemo(() => {
    if (!m) return []
    return [
      { name:'Positive', value:m.posN,  pct:m.posPct },
      { name:'Negative', value:m.negN,  pct:m.negPct },
      { name:'Neutral',  value:m.neuN,  pct:m.neuPct },
    ]
  }, [m])

  const csatDsatBar = useMemo(() => {
    if (!m) return []
    return [
      { name:'CSAT', value:m.csatPct, fill:C.green },
      { name:'DSAT', value:m.dsatPct, fill:C.red   },
    ]
  }, [m])

  function notify(msg, color, icon='✓') {
    setToast({ msg, color, icon })
    setTimeout(() => setToast(null), 3000)
  }

  async function processFile(file) {
    if (!file) return
    setError('')
    setLoading(true)
    setRows([])
    setFileMeta(null)
    try {
      const result = await readFile(file)
      if (!result.rows.length) throw new Error('No data rows found')
      setTimeout(() => {
        try {
          setRows(result.rows)
          setFileMeta({
            name:  result.fileName,
            type:  result.type,
            sheet: result.sheet,
          })
          setLoading(false)
          notify(
            `Imported ${result.rows.length.toLocaleString()} rows`,
            C.green
          )
        } catch(e) {
          setError('Failed to load data: ' + e.message)
          setLoading(false)
        }
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
    try {
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
      notify('Exported!', C.green)
    } catch(e) {
      notify('Export failed: '+e.message, C.red, '⚠')
    }
  }

  const ROLE_COLOR = { Admin:C.red, Manager:C.amber, Developer:C.cyan }
  const roleColor  = ROLE_COLOR[user.role] || C.violet

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
            <div style={{
              fontSize:13, fontWeight:900,
              color:C.cyan, letterSpacing:2,
            }}>SENTIMENTIQ</div>
            <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5 }}>
              NTT DATA · AI ANALYTICS PLATFORM
            </div>
          </div>
        </div>

        <div style={{ flex:1 }}/>

        {fileMeta && (
          <div style={{
            background:C.violet+'12',
            border:`1px solid ${C.violet}40`,
            borderRadius:7, padding:'4px 12px',
            fontSize:10, color:C.violet,
          }}>
            📁 {fileMeta.name}
            <span style={{ color:C.dim }}>
              {' '}· {m?.total?.toLocaleString()||0} rows
            </span>
          </div>
        )}

        <div style={{
          background:roleColor+'12',
          border:`1px solid ${roleColor}40`,
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

      <main style={{
        padding:'22px 24px', maxWidth:1400, margin:'0 auto',
      }}>

        {/* Import bar */}
        <div style={{
          background:C.panel, border:`1px solid ${C.border}`,
          borderRadius:12, padding:'14px 20px',
          display:'flex', alignItems:'center',
          justifyContent:'space-between',
          flexWrap:'wrap', gap:12, marginBottom:20,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:22 }}>
              {loading ? '⏳' : '📁'}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text }}>
                {loading
                  ? 'Parsing file…'
                  : fileMeta
                  ? `${fileMeta.name} — ${m?.total?.toLocaleString()||0} rows`
                  : 'Import Data'}
              </div>
              <div style={{ fontSize:10, color:C.sub, marginTop:2 }}>
                Supports: CSV · Excel (.xlsx) · JSON · TXT
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json,.txt"
              style={{ display:'none' }}
              onChange={e => {
                if (e.target.files[0]) processFile(e.target.files[0])
                e.target.value = ''
              }}
            />
            <div
              onDragOver={e  => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                style={{
                  background: loading
                    ? C.dim
                    : dragging ? C.violet+'40' : C.violet+'18',
                  border:`1px solid ${C.violet}50`,
                  color:C.violet, borderRadius:8, padding:'7px 18px',
                  fontSize:12, fontWeight:700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily:'inherit',
                }}
              >
                {loading ? '⏳ Loading…' : '⬆ Import File'}
              </button>
            </div>

            {rows.length > 0 && (
              <button onClick={exportCSV} style={{
                background:C.green+'18',
                border:`1px solid ${C.green}50`,
                color:C.green, borderRadius:8, padding:'7px 18px',
                fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}>⬇ Export CSV</button>
            )}
          </div>

          {error && (
            <div style={{
              width:'100%', background:C.red+'10',
              border:`1px solid ${C.red}40`,
              borderRadius:8, padding:'8px 13px',
              fontSize:11, color:C.red, fontWeight:600,
            }}>⚠ {error}</div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{
            background:C.panel, border:`1px solid ${C.border}`,
            borderRadius:14, padding:'48px 20px',
            textAlign:'center', marginBottom:20,
          }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>
            <div style={{ fontSize:14, color:C.amber, fontWeight:700 }}>
              Parsing file… please wait
            </div>
            <div style={{ fontSize:11, color:C.dim, marginTop:6 }}>
              Large files may take a few seconds
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {!loading && m && (
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

        {/* Charts */}
        {!loading && m && (
          <>
            {/* Row 1 — Sentiment Bar + CSAT vs DSAT */}
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr',
              gap:14, marginBottom:14,
            }}>

              {/* Sentiment Bar Chart */}
              <div style={{
                background:C.panel, border:`1px solid ${C.border}`,
                borderRadius:12, padding:'18px 20px',
              }}>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:C.text, marginBottom:2,
                }}>
                  Sentiment Distribution
                </div>
                <div style={{
                  fontSize:10, color:C.sub, marginBottom:14,
                }}>
                  {`Positive: ${m.posN} · Negative: ${m.negN} · Neutral: ${m.neuN}`}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sentBarData} barSize={60}>
                    <CartesianGrid
                      strokeDasharray="3 3" stroke={C.border}/>
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
              </div>

              {/* CSAT vs DSAT Bar */}
              <div style={{
                background:C.panel, border:`1px solid ${C.border}`,
                borderRadius:12, padding:'18px 20px',
              }}>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:C.text, marginBottom:2,
                }}>
                  CSAT vs DSAT Comparison
                </div>
                <div style={{
                  fontSize:10, color:C.sub, marginBottom:14,
                }}>
                  {`CSAT: ${m.csatPct}% · DSAT: ${m.dsatPct}%`}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={csatDsatBar} barSize={80}>
                    <CartesianGrid
                      strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="name" stroke={C.dim} fontSize={12}/>
                    <YAxis
                      stroke={C.dim} fontSize={10}
                      domain={[0,100]} unit="%"/>
                    <Tooltip
                      contentStyle={TT}
                      formatter={v => [`${v}%`]}
                    />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      {csatDsatBar.map((d,i) => (
                        <Cell key={i} fill={d.fill}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2 — Team + Region */}
            {(m.teamData.length>0 || m.regionData.length>0) && (
              <div style={{
                display:'grid',
                gridTemplateColumns:
                  m.teamData.length>0 && m.regionData.length>0
                    ? '1fr 1fr' : '1fr',
                gap:14, marginBottom:14,
              }}>
                {m.teamData.length>0 && (
                  <div style={{
                    background:C.panel, border:`1px solid ${C.border}`,
                    borderRadius:12, padding:'18px 20px',
                  }}>
                    <div style={{
                      fontSize:12, fontWeight:700,
                      color:C.text, marginBottom:2,
                    }}>CSAT% and DSAT% by Team</div>
                    <div style={{
                      fontSize:10, color:C.sub, marginBottom:14,
                    }}>Team performance comparison</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={m.teamData} barSize={12}>
                        <CartesianGrid
                          strokeDasharray="3 3" stroke={C.border}/>
                        <XAxis
                          dataKey="name" stroke={C.dim} fontSize={9}
                          interval={0} angle={-20}
                          textAnchor="end" height={50}/>
                        <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                        <Tooltip
                          contentStyle={TT}
                          formatter={v => [`${v}%`]}
                        />
                        <Legend
                          iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize:11 }}/>
                        <Bar
                          dataKey="CSAT%" fill={C.green}
                          radius={[4,4,0,0]}/>
                        <Bar
                          dataKey="DSAT%" fill={C.red}
                          radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {m.regionData.length>0 && (
                  <div style={{
                    background:C.panel, border:`1px solid ${C.border}`,
                    borderRadius:12, padding:'18px 20px',
                  }}>
                    <div style={{
                      fontSize:12, fontWeight:700,
                      color:C.text, marginBottom:2,
                    }}>CSAT% and DSAT% by Region</div>
                    <div style={{
                      fontSize:10, color:C.sub, marginBottom:14,
                    }}>Regional performance comparison</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={m.regionData} barSize={12}>
                        <CartesianGrid
                          strokeDasharray="3 3" stroke={C.border}/>
                        <XAxis
                          dataKey="name" stroke={C.dim} fontSize={9}
                          interval={0} angle={-20}
                          textAnchor="end" height={60}/>
                        <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                        <Tooltip
                          contentStyle={TT}
                          formatter={v => [`${v}%`]}
                        />
                        <Legend
                          iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize:11 }}/>
                        <Bar
                          dataKey="CSAT%" fill={C.cyan}
                          radius={[4,4,0,0]}/>
                        <Bar
                          dataKey="DSAT%" fill={C.violet}
                          radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
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
                {rows.length > 0
                  ? `${rows.length.toLocaleString()} records · Sort · Filter · 200 rows per page`
                  : 'Import a file above to view data'}
              </div>
            </div>
            {rows.length > 0 && (
              <button onClick={exportCSV} style={{
                background:C.green+'18',
                border:`1px solid ${C.green}50`,
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