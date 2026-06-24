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
          width:`${Math.min(parseFloat(value)||0, 100)}%`,
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
      background:C.panel,
      border:`1px solid ${toast.color}`,
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
      height,
      display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column',
      gap:8, background:C.bg2+'80', borderRadius:8,
      border:`1px dashed ${C.border}`,
    }}>
      <div style={{ fontSize:32, opacity:0.3 }}>📊</div>
      <div style={{
        fontSize:10, color:C.dim,
        fontWeight:600, letterSpacing:1,
      }}>IMPORT DATA TO SEE CHART</div>
    </div>
  )
}

export default function Dashboard({
  user, rows, setRows, onLogout
}) {
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

  const ROLE_COLOR = {
    Admin:C.red, Manager:C.amber, Developer:C.cyan
  }
  const roleColor = ROLE_COLOR[user?.role] || C.violet

  // ── Chart data ────────────────────────────────────────
  const sentBarData = useMemo(() =>
    !metrics ? [] : [
      { name:'Positive', value:metrics.pos_n||0,    pct:metrics.csat_pct||0    },
      { name:'Negative', value:metrics.neg_n||0,    pct:metrics.dsat_pct||0    },
      { name:'Neutral',  value:metrics.neutral_n||0,pct:metrics.neutral_pct||0 },
    ], [metrics])

  const csatDsatBar = useMemo(() =>
    !metrics ? [] : [
      { name:'CSAT', value:metrics.csat_pct||0, fill:C.green },
      { name:'DSAT', value:metrics.dsat_pct||0, fill:C.red   },
    ], [metrics])

  const teamData = useMemo(() => {
    if (!metrics?.team_breakdown) return []
    return Object.entries(metrics.team_breakdown)
      .map(([name,v]) => ({ name, 'CSAT%':v.csat_pct, 'DSAT%':v.dsat_pct }))
      .sort((a,b) => b['CSAT%'] - a['CSAT%'])
      .slice(0, 8)
  }, [metrics])

  const regionData = useMemo(() => {
    if (!metrics?.region_breakdown) return []
    return Object.entries(metrics.region_breakdown)
      .map(([name,v]) => ({ name, 'CSAT%':v.csat_pct, 'DSAT%':v.dsat_pct }))
      .sort((a,b) => b['CSAT%'] - a['CSAT%'])
      .slice(0, 8)
  }, [metrics])

  const repBarData = useMemo(() =>
    repIssues.slice(0, 10).map(i => ({
      name    : i.issue.length > 15 ? i.issue.slice(0,13)+'…' : i.issue,
      fullName: i.issue,
      Count   : i.count,
    }))
  , [repIssues])

  function notify(msg, color, icon='✓') {
    setToast({ msg, color, icon })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Export CSV ────────────────────────────────────────
  function exportCSV(data, filename) {
    if (!data || data.length === 0) {
      notify('No data to export!', C.red, '⚠')
      return
    }
    const headers = Object.keys(data[0]).join(',')
    const body    = data.map(r =>
      Object.values(r)
        .map(v => `"${String(v??'').replace(/"/g,'""')}"`)
        .join(',')
    ).join('\n')
    const blob = new Blob(
      [headers + '\n' + body],
      { type:'text/csv' }
    )
    const a       = document.createElement('a')
    a.href        = URL.createObjectURL(blob)
    a.download    = `${filename}_${Date.now()}.csv`
    a.click()
    notify(`Exported ${data.length.toLocaleString()} rows!`, C.green)
  }

  // ── Fetch analysis ────────────────────────────────────
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

  // ── Upload ────────────────────────────────────────────
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

      const uploadRes = await fetch(
        `${API}/data/upload?username=${username}`,
        {
          method : 'POST',
          headers: { 'Authorization':`Bearer ${token}` },
          body   : formData,
        }
      )

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.detail || 'Upload failed')
      }

      const uploadData = await uploadRes.json()

      setFileMeta({
        name: uploadData.filename,
        rows: uploadData.rows,
      })

      if (uploadData.data?.length > 0) {
        setRows(uploadData.data)
      }

      const metricsRes = await fetch(
        `${API}/data/metrics`,
        { headers:{ 'Authorization':`Bearer ${token}` } }
      )
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData)
      }

      setLoading(false)
      setPage('charts')
      notify(
        `Imported ${uploadData.rows.toLocaleString()} rows`,
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
    { id:'charts',   icon:'📊', label:'Charts',       sub:'Analytics & KPIs'  },
    { id:'data',     icon:'📋', label:'Data',          sub:'Import & Export'   },
    { id:'analysis', icon:'🔍', label:'Data Analysis', sub:'Insights & Issues' },
  ]

  // ── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight:'100vh', background:C.bg0,
        display:'flex', alignItems:'center',
        justifyContent:'center', flexDirection:'column',
        fontFamily:'monospace', color:C.text, gap:16,
      }}>
        <div style={{ fontSize:48 }}>⏳</div>
        <div style={{
          fontSize:16, fontWeight:700, color:C.amber
        }}>Importing file, please wait…</div>
        <div style={{ fontSize:11, color:C.dim }}>
          Processing large files may take a moment
        </div>
      </div>
    )
  }

  // ── Sidebar ───────────────────────────────────────────
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
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:18, flexShrink:0,
          }}>⚡</div>
          <div>
            <div style={{
              fontSize:13, fontWeight:900,
              color:C.cyan, letterSpacing:2,
            }}>SENTIMENTIQ</div>
            <div style={{
              fontSize:9, color:C.dim, letterSpacing:1.5,
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
            fontSize:10, color:C.violet, fontWeight:700,
            whiteSpace:'nowrap', overflow:'hidden',
            textOverflow:'ellipsis',
          }}>
            📁 {fileMeta.name.length > 22
              ? fileMeta.name.slice(0,20)+'…'
              : fileMeta.name}
          </div>
          <div style={{ fontSize:9, color:C.dim, marginTop:3 }}>
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
      <div style={{
        margin:'0 10px 12px',
        background:C.bg2,
        border:`1px solid ${C.border}`,
        borderRadius:9, padding:'10px 12px',
      }}>
        <div style={{
          fontSize:9, color:C.dim, letterSpacing:1.5,
          fontWeight:700, marginBottom:8,
        }}>QUICK STATS</div>
        {[
          ['CSAT',    `${metrics?.csat_pct||0}%`,    C.green],
          ['DSAT',    `${metrics?.dsat_pct||0}%`,    C.red  ],
          ['Neutral', `${metrics?.neutral_pct||0}%`, C.amber],
        ].map(([label,value,color]) => (
          <div key={label} style={{
            display:'flex', justifyContent:'space-between',
            marginBottom:5, alignItems:'center',
          }}>
            <span style={{ fontSize:10, color:C.sub }}>{label}</span>
            <span style={{
              fontSize:12, fontWeight:900,
              color, fontFamily:'monospace',
            }}>{value}</span>
          </div>
        ))}
      </div>

      {/* User + logout */}
      <div style={{
        borderTop:`1px solid ${C.border}`, padding:'12px',
      }}>
        <div style={{
          display:'flex', alignItems:'center',
          justifyContent:'space-between', gap:8,
        }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:11, fontWeight:700, color:roleColor,
              whiteSpace:'nowrap', overflow:'hidden',
              textOverflow:'ellipsis',
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

  // ── Main Dashboard ────────────────────────────────────
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

        {/* ══════════════════════════════════════
            CHARTS PAGE
        ══════════════════════════════════════ */}
        {page === 'charts' && (
          <div style={{ padding:'24px' }}>

            {/* Header */}
            <div style={{ marginBottom:20 }}>
              <h1 style={{
                fontSize:20, fontWeight:900,
                color:C.cyan, margin:0, letterSpacing:1,
              }}>Charts & Analytics</h1>
              <p style={{
                fontSize:11, color:C.sub, margin:'4px 0 0',
              }}>
                {metrics
                  ? `${metrics.total?.toLocaleString()} records analysed`
                  : 'Import data from Data section to see analytics'}
              </p>
            </div>

            {/* KPI Cards — always visible */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(4,1fr)',
              gap:12, marginBottom:20,
            }}>
              <KPI
                label="Total Records"
                value={(metrics?.total||0).toLocaleString()}
                sub={metrics ? "records loaded" : "no data yet"}
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

            {/* Charts Row 1 — always visible */}
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
                  fontSize:10, color:C.sub, marginBottom:14,
                }}>
                  {metrics
                    ? `Pos: ${metrics.pos_n||0} · Neg: ${metrics.neg_n||0} · Neu: ${metrics.neutral_n||0}`
                    : 'No data imported yet'}
                </div>
                {sentBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={sentBarData} barSize={55}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={11}/>
                      <YAxis stroke={C.dim} fontSize={10}/>
                      <Tooltip contentStyle={TT}
                        formatter={(v,n,p) => [
                          `${v} (${p.payload.pct}%)`, 'Count'
                        ]}/>
                      <Bar dataKey="value" radius={[6,6,0,0]}>
                        <Cell fill={C.green}/>
                        <Cell fill={C.red}/>
                        <Cell fill={C.amber}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart height={210}/>
                )}
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
                  fontSize:10, color:C.sub, marginBottom:14,
                }}>
                  {metrics
                    ? `CSAT: ${metrics.csat_pct||0}% · DSAT: ${metrics.dsat_pct||0}%`
                    : 'No data imported yet'}
                </div>
                {csatDsatBar.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={csatDsatBar} barSize={90}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={12}/>
                      <YAxis stroke={C.dim} fontSize={10} domain={[0,100]} unit="%"/>
                      <Tooltip contentStyle={TT} formatter={v => [`${v}%`]}/>
                      <Bar dataKey="value" radius={[6,6,0,0]}>
                        {csatDsatBar.map((d,i) => (
                          <Cell key={i} fill={d.fill}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart height={210}/>
                )}
              </div>
            </div>

            {/* Charts Row 2 — always visible */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'1fr 1fr',
              gap:14, marginBottom:14,
            }}>
              {/* Team */}
              <div style={{
                background:C.panel,
                border:`1px solid ${C.border}`,
                borderRadius:12, padding:'18px 20px',
              }}>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:C.text, marginBottom:2,
                }}>CSAT% and DSAT% by Team</div>
                <div style={{
                  fontSize:10, color:C.sub, marginBottom:14,
                }}>Team performance</div>
                {teamData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={teamData} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={9}
                        interval={0} angle={-20} textAnchor="end" height={50}/>
                      <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                      <Tooltip contentStyle={TT} formatter={v=>[`${v}%`]}/>
                      <Legend iconType="circle" iconSize={8}
                        wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="CSAT%" fill={C.green} radius={[4,4,0,0]}/>
                      <Bar dataKey="DSAT%" fill={C.red}   radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart height={220}/>
                )}
              </div>

              {/* Region */}
              <div style={{
                background:C.panel,
                border:`1px solid ${C.border}`,
                borderRadius:12, padding:'18px 20px',
              }}>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:C.text, marginBottom:2,
                }}>CSAT% and DSAT% by Region</div>
                <div style={{
                  fontSize:10, color:C.sub, marginBottom:14,
                }}>Regional performance</div>
                {regionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={regionData} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={9}
                        interval={0} angle={-20} textAnchor="end" height={60}/>
                      <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                      <Tooltip contentStyle={TT} formatter={v=>[`${v}%`]}/>
                      <Legend iconType="circle" iconSize={8}
                        wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="CSAT%" fill={C.cyan}   radius={[4,4,0,0]}/>
                      <Bar dataKey="DSAT%" fill={C.violet} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart height={220}/>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            DATA PAGE
        ══════════════════════════════════════ */}
        {page === 'data' && (
          <div style={{
            padding:'24px',
            display:'flex', flexDirection:'column',
            minHeight:'100vh',
          }}>

            {/* Header — Import top right */}
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
                  fontSize:11, color:C.sub, margin:'4px 0 0',
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
                      uploadToBackend(e.dataTransfer.files[0])
                  }}
                  style={{
                    background:dragging
                      ? C.cyan+'30'
                      : `linear-gradient(135deg,${C.cyan},${C.violet})`,
                    border:'none', borderRadius:10,
                    padding:'10px 20px', color:'#000',
                    fontSize:12, fontWeight:900,
                    cursor:'pointer', fontFamily:'inherit',
                    letterSpacing:1,
                    display:'flex', alignItems:'center', gap:8,
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
                borderRadius:12, padding:'60px 20px',
                textAlign:'center',
              }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
                <div style={{
                  fontSize:16, fontWeight:700,
                  color:C.sub, marginBottom:8,
                }}>No Data Imported Yet</div>
                <div style={{
                  fontSize:12, color:C.dim, marginBottom:20,
                }}>
                  Click "Import File" button above
                  to upload CSV or Excel file
                </div>
                <div style={{
                  display:'flex', justifyContent:'center',
                  gap:8, flexWrap:'wrap',
                }}>
                  {['CSV','Excel','JSON','TXT'].map(f => (
                    <div key={f} style={{
                      background:C.bg2,
                      border:`1px solid ${C.border}`,
                      borderRadius:6, padding:'4px 12px',
                      fontSize:10, color:C.sub, fontWeight:700,
                    }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Table */}
            {rows.length > 0 && (
              <div style={{ flex:1 }}>
                <DataTable rows={rows} onNotify={notify}/>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                marginTop:14, background:C.red+'10',
                border:`1px solid ${C.red}40`,
                borderRadius:8, padding:'10px 14px',
                fontSize:11, color:C.red, fontWeight:600,
              }}>⚠ {error}</div>
            )}

            {/* Export — bottom right */}
            {rows.length > 0 && (
              <div style={{
                display:'flex', justifyContent:'flex-end',
                marginTop:16,
              }}>
                <button
                  onClick={() => exportCSV(rows, 'sentimentiq_data')}
                  style={{
                    background:C.green+'18',
                    border:`1px solid ${C.green}50`,
                    color:C.green, borderRadius:10,
                    padding:'10px 20px', fontSize:12,
                    fontWeight:900, cursor:'pointer',
                    fontFamily:'inherit', letterSpacing:1,
                    display:'flex', alignItems:'center', gap:8,
                  }}
                >
                  ⬇ Export CSV
                  <span style={{
                    fontSize:10, fontWeight:400,
                    color:C.dim,
                  }}>
                    ({rows.length.toLocaleString()} rows)
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            DATA ANALYSIS PAGE
        ══════════════════════════════════════ */}
        {page === 'analysis' && (
          <div style={{
            padding:'24px',
            display:'flex', flexDirection:'column',
            minHeight:'100vh',
          }}>

            {/* Header */}
            <div style={{
              display:'flex', alignItems:'center',
              justifyContent:'space-between',
              marginBottom:20, flexWrap:'wrap', gap:12,
            }}>
              <div>
                <h1 style={{
                  fontSize:20, fontWeight:900,
                  color:C.cyan, margin:0, letterSpacing:1,
                }}>Data Analysis</h1>
                <p style={{
                  fontSize:11, color:C.sub, margin:'4px 0 0',
                }}>
                  Effective data and repetitive issues
                </p>
              </div>

              {/* Refresh button */}
              {rows.length > 0 && (
                <button
                  onClick={fetchAnalysis}
                  disabled={analysisLoading}
                  style={{
                    background:C.cyan+'18',
                    border:`1px solid ${C.cyan}50`,
                    color:C.cyan, borderRadius:8,
                    padding:'8px 16px', fontSize:11,
                    fontWeight:700, cursor:'pointer',
                    fontFamily:'inherit',
                    opacity:analysisLoading ? 0.5 : 1,
                  }}
                >
                  {analysisLoading ? '⏳ Loading…' : '↺ Refresh Analysis'}
                </button>
              )}
            </div>

            {/* No data state */}
            {rows.length === 0 && (
              <div style={{
                background:C.panel,
                border:`1px solid ${C.border}`,
                borderRadius:12, padding:'60px 20px',
                textAlign:'center',
              }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
                <div style={{
                  fontSize:16, fontWeight:700,
                  color:C.sub, marginBottom:8,
                }}>No Data to Analyse</div>
                <div style={{
                  fontSize:12, color:C.dim, marginBottom:20,
                }}>
                  Import data first from the Data section
                </div>
                <button
                  onClick={() => setPage('data')}
                  style={{
                    background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
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
                {/* ── Effective Data ─────────────────── */}
                <div style={{
                  background:C.panel,
                  border:`1px solid ${C.border}`,
                  borderRadius:12, padding:'20px',
                  marginBottom:20,
                }}>
                  <div style={{
                    display:'flex', alignItems:'center',
                    justifyContent:'space-between',
                    marginBottom:4,
                  }}>
                    <div style={{
                      fontSize:14, fontWeight:700, color:C.cyan,
                    }}>📋 Effective Data</div>
                    {effData.length > 0 && (
                      <span style={{
                        fontSize:10, color:C.dim,
                      }}>
                        {effData.length.toLocaleString()} records
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize:10, color:C.sub, marginBottom:16,
                  }}>
                    Name · Email · Comments · Type of Data · Type of Issue · Sentiment
                  </div>

                  {/* Empty */}
                  {effData.length === 0 && !analysisLoading && (
                    <div style={{
                      textAlign:'center', padding:'30px',
                      color:C.dim, fontSize:11,
                    }}>
                      Click "Refresh Analysis" to load effective data
                    </div>
                  )}

                  {/* Loading */}
                  {analysisLoading && (
                    <div style={{
                      textAlign:'center', padding:'30px',
                      color:C.amber, fontSize:11, fontWeight:700,
                    }}>⏳ Loading...</div>
                  )}

                  {/* Table — ALL rows */}
                  {effData.length > 0 && !analysisLoading && (
                    <>
                      <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:500 }}>
                        <table style={{
                          width:'100%', borderCollapse:'collapse', fontSize:11,
                        }}>
                          <thead style={{ position:'sticky', top:0, zIndex:10 }}>
                            <tr>
                              {['#','Name','Email','Comments',
                                'Type of Data','Type of Issue','Sentiment']
                                .map(h => (
                                <th key={h} style={{
                                  padding:'10px 12px',
                                  background:C.bg1,
                                  border:`1px solid ${C.border}`,
                                  color:C.sub, fontWeight:700,
                                  textAlign: h==='#' ? 'center' : 'left',
                                  whiteSpace:'nowrap', letterSpacing:0.5,
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {effData.map((row, i) => (
                              <tr
                                key={i}
                                style={{
                                  background: i%2===0
                                    ? 'transparent'
                                    : C.bg2+'50',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = C.cyan+'08'
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = i%2===0
                                    ? 'transparent'
                                    : C.bg2+'50'
                                }}
                              >
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.dim, textAlign:'center',
                                  fontSize:10,
                                }}>{i+1}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.text, whiteSpace:'nowrap',
                                  fontWeight:600,
                                }}>{row.Name}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.sky, whiteSpace:'nowrap',
                                  fontSize:10,
                                }}>{row.Email}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.sub, maxWidth:280,
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
                                  color:C.amber, whiteSpace:'nowrap',
                                }}>{row.Type_of_Data}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.violet, whiteSpace:'nowrap',
                                }}>{row.Type_of_Issue}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  textAlign:'center',
                                }}>
                                  <span style={{
                                    background: row.Sentiment==='Negative'
                                      ? C.red+'20' : C.green+'20',
                                    color: row.Sentiment==='Negative'
                                      ? C.red : C.green,
                                    borderRadius:20, padding:'2px 10px',
                                    fontSize:10, fontWeight:700,
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
                      </div>

                      {/* Export effective data — bottom right */}
                      <div style={{
                        display:'flex', justifyContent:'flex-end',
                        marginTop:14,
                      }}>
                        <button
                          onClick={() => exportCSV(effData, 'effective_data')}
                          style={{
                            background:C.green+'18',
                            border:`1px solid ${C.green}50`,
                            color:C.green, borderRadius:10,
                            padding:'10px 20px', fontSize:12,
                            fontWeight:900, cursor:'pointer',
                            fontFamily:'inherit', letterSpacing:1,
                            display:'flex', alignItems:'center', gap:8,
                          }}
                        >
                          ⬇ Export Effective Data
                          <span style={{
                            fontSize:10, fontWeight:400, color:C.dim,
                          }}>
                            ({effData.length.toLocaleString()} rows)
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Repetitive Issues ──────────────── */}
                <div style={{
                  background:C.panel,
                  border:`1px solid ${C.border}`,
                  borderRadius:12, padding:'20px',
                  marginBottom:20,
                }}>
                  <div style={{
                    fontSize:14, fontWeight:700,
                    color:C.cyan, marginBottom:4,
                  }}>🔁 Repetitive Issues</div>
                  <div style={{
                    fontSize:10, color:C.sub, marginBottom:16,
                  }}>
                    Most frequently occurring issue types
                    {repIssues.length > 0 &&
                      ` · ${repIssues.length} unique issues found`}
                  </div>

                  {repIssues.length === 0 && !analysisLoading && (
                    <div style={{
                      textAlign:'center', padding:'30px',
                      color:C.dim, fontSize:11,
                    }}>
                      Click "Refresh Analysis" to load repetitive issues
                    </div>
                  )}

                  {analysisLoading && (
                    <div style={{
                      textAlign:'center', padding:'30px',
                      color:C.amber, fontSize:11, fontWeight:700,
                    }}>⏳ Loading...</div>
                  )}

                  {repIssues.length > 0 && !analysisLoading && (
                    <>
                      {/* Bar chart */}
                      <div style={{ marginBottom:20 }}>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            data={repBarData} layout="vertical"
                            margin={{ left:10, right:40, top:5, bottom:5 }}>
                            <CartesianGrid
                              strokeDasharray="3 3" stroke={C.border}
                              horizontal={false}/>
                            <XAxis type="number" stroke={C.dim} fontSize={10}/>
                            <YAxis type="category" dataKey="name"
                              stroke={C.dim} fontSize={10} width={120}/>
                            <Tooltip contentStyle={TT}
                              formatter={(v,n,p) => [
                                `${v.toLocaleString()} tickets`,
                                p.payload.fullName
                              ]}/>
                            <Bar dataKey="Count" fill={C.red} radius={[0,6,6,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Table */}
                      <div style={{ overflowX:'auto' }}>
                        <table style={{
                          width:'100%', borderCollapse:'collapse', fontSize:11,
                        }}>
                          <thead>
                            <tr>
                              {['Rank','Issue Type','Count',
                                '% of Total','Negative','Neg%']
                                .map(h => (
                                <th key={h} style={{
                                  padding:'10px 12px', background:C.bg2,
                                  border:`1px solid ${C.border}`,
                                  color:C.sub, fontWeight:700,
                                  textAlign: h==='Issue Type' ? 'left' : 'center',
                                  whiteSpace:'nowrap',
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {repIssues.map((issue, i) => (
                              <tr key={i}
                                style={{
                                  background: i%2===0
                                    ? 'transparent'
                                    : C.bg2+'50',
                                }}
                              >
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.dim, textAlign:'center',
                                  fontWeight:700,
                                }}>#{i+1}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.text, fontWeight:600,
                                }}>{issue.issue}</td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.cyan, textAlign:'center',
                                  fontWeight:700, fontFamily:'monospace',
                                }}>
                                  {issue.count.toLocaleString()}
                                </td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  textAlign:'center',
                                }}>
                                  <div style={{
                                    display:'flex', alignItems:'center',
                                    gap:6, justifyContent:'center',
                                  }}>
                                    <div style={{
                                      width:60, height:6,
                                      background:C.border, borderRadius:3,
                                    }}>
                                      <div style={{
                                        width:`${Math.min(issue.percentage*2,100)}%`,
                                        height:'100%', background:C.violet,
                                        borderRadius:3,
                                      }}/>
                                    </div>
                                    <span style={{
                                      color:C.violet, fontWeight:700,
                                      fontFamily:'monospace', fontSize:10,
                                    }}>
                                      {issue.percentage}%
                                    </span>
                                  </div>
                                </td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  color:C.red, textAlign:'center',
                                  fontFamily:'monospace',
                                }}>
                                  {issue.negative.toLocaleString()}
                                </td>
                                <td style={{
                                  padding:'8px 12px',
                                  border:`1px solid ${C.border}`,
                                  textAlign:'center',
                                }}>
                                  <span style={{
                                    background: issue.neg_pct > 70
                                      ? C.red+'20'
                                      : issue.neg_pct > 40
                                        ? C.amber+'20'
                                        : C.green+'20',
                                    color: issue.neg_pct > 70
                                      ? C.red
                                      : issue.neg_pct > 40
                                        ? C.amber
                                        : C.green,
                                    borderRadius:20, padding:'2px 8px',
                                    fontSize:10, fontWeight:700,
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

                      {/* Export repetitive issues — bottom right */}
                      <div style={{
                        display:'flex', justifyContent:'flex-end',
                        marginTop:14,
                      }}>
                        <button
                          onClick={() => exportCSV(
                            repIssues.map(i => ({
                              'Issue Type'  : i.issue,
                              'Count'       : i.count,
                              '% of Total'  : i.percentage + '%',
                              'Negative'    : i.negative,
                              'Negative %'  : i.neg_pct + '%',
                              'Positive'    : i.positive,
                            })),
                            'repetitive_issues'
                          )}
                          style={{
                            background:C.green+'18',
                            border:`1px solid ${C.green}50`,
                            color:C.green, borderRadius:10,
                            padding:'10px 20px', fontSize:12,
                            fontWeight:900, cursor:'pointer',
                            fontFamily:'inherit', letterSpacing:1,
                            display:'flex', alignItems:'center', gap:8,
                          }}
                        >
                          ⬇ Export Issues
                          <span style={{
                            fontSize:10, fontWeight:400, color:C.dim,
                          }}>
                            ({repIssues.length} issues)
                          </span>
                        </button>
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
        ::-webkit-scrollbar-thumb:hover{background:${C.dim}}
      `}</style>
    </div>
  )
}
