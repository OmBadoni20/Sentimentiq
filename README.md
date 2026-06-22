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
        letterSpacing:1.5,
        textTransform:'uppercase',
        marginBottom:6, fontFamily:'monospace',
      }}>{label}</div>
      <div style={{
        fontSize:28, fontWeight:900,
        color:accent, fontFamily:'monospace',
        lineHeight:1,
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
          width:`${Math.min(
            parseFloat(value)||0, 100
          )}%`,
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
    }}>
      {toast.icon} {toast.msg}
    </div>
  )
}

export default function Dashboard({
  user, rows, setRows, onLogout
}) {
  const [page,     setPage]    = useState('charts')
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')
  const [dragging, setDragging]= useState(false)
  const [toast,    setToast]   = useState(null)
  const [metrics,  setMetrics] = useState(null)
  const [fileMeta, setFileMeta]= useState(null)
  const fileRef = useRef(null)
  const token   = localStorage.getItem('token')

  // ── Chart data from metrics ───────────────────
  const sentBarData = useMemo(() =>
    !metrics ? [] : [
      { name:'Positive',
        value:metrics.pos_n||0,
        pct:metrics.csat_pct||0 },
      { name:'Negative',
        value:metrics.neg_n||0,
        pct:metrics.dsat_pct||0 },
      { name:'Neutral',
        value:metrics.neutral_n||0,
        pct:metrics.neutral_pct||0 },
    ], [metrics])

  const csatDsatBar = useMemo(() =>
    !metrics ? [] : [
      { name:'CSAT',
        value:metrics.csat_pct||0,
        fill:C.green },
      { name:'DSAT',
        value:metrics.dsat_pct||0,
        fill:C.red },
    ], [metrics])

  const teamData = useMemo(() => {
    if (!metrics?.team_breakdown) return []
    return Object.entries(metrics.team_breakdown)
      .map(([name, v]) => ({
        name,
        'CSAT%': v.csat_pct,
        'DSAT%': v.dsat_pct,
      }))
      .sort((a,b) => b['CSAT%'] - a['CSAT%'])
      .slice(0, 8)
  }, [metrics])

  const regionData = useMemo(() => {
    if (!metrics?.region_breakdown) return []
    return Object.entries(metrics.region_breakdown)
      .map(([name, v]) => ({
        name,
        'CSAT%': v.csat_pct,
        'DSAT%': v.dsat_pct,
      }))
      .sort((a,b) => b['CSAT%'] - a['CSAT%'])
      .slice(0, 8)
  }, [metrics])

  const ROLE_COLOR = {
    Admin:C.red, Manager:C.amber, Developer:C.cyan
  }
  const roleColor = ROLE_COLOR[user?.role] || C.violet

  function notify(msg, color, icon='✓') {
    setToast({ msg, color, icon })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Main upload function ──────────────────────
  async function uploadToBackend(file) {
    setError('')
    setLoading(true)
    setMetrics(null)
    setRows([])

    try {
      // Get username from localStorage
      const savedUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      )
      const username = savedUser.username
                    || 'unknown'

      // ── Step 1: Upload file to backend ───────
      const formData = new FormData()
      formData.append('file', file)

      console.log('[Dashboard] Uploading:',
        file.name)

      const uploadRes = await fetch(
        `${API}/data/upload?username=${username}`,
        {
          method : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        }
      )

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(
          err.detail || 'Upload failed'
        )
      }

      const uploadData = await uploadRes.json()
      console.log('[Dashboard] Upload success:',
        uploadData.rows, 'rows received')

      setFileMeta({
        name: uploadData.filename,
        rows: uploadData.rows,
      })

      // ── Step 2: Use rows from upload ─────────
      // Rows come directly from upload response!
      // NO separate /data/rows call needed!
      if (uploadData.data &&
          uploadData.data.length > 0) {
        console.log('[Dashboard] Setting rows:',
          uploadData.data.length)
        setRows(uploadData.data)
      }

      // ── Step 3: Get metrics ───────────────────
      console.log('[Dashboard] Fetching metrics...')
      const metricsRes = await fetch(
        `${API}/data/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        console.log('[Dashboard] Metrics received:',
          'CSAT:', metricsData.csat_pct + '%',
          'DSAT:', metricsData.dsat_pct + '%')
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
    { id:'charts', icon:'📊',
      label:'Charts', sub:'Analytics & KPIs' },
    { id:'data',   icon:'📋',
      label:'Data',   sub:'Table & Export' },
  ]

  // ── Import screen ─────────────────────────────
  if (!rows.length && !loading) {
    return (
      <div style={{
        minHeight:'100vh', background:C.bg0,
        color:C.text,
        fontFamily:"'IBM Plex Mono',monospace",
        display:'flex', flexDirection:'column',
      }}>
        <Toast toast={toast}/>

        {/* Header */}
        <header style={{
          background:C.bg1,
          borderBottom:`1px solid ${C.border}`,
          height:56, display:'flex',
          alignItems:'center',
          padding:'0 24px', gap:14,
        }}>
          <div style={{
            display:'flex',
            alignItems:'center', gap:10
          }}>
            <div style={{
              width:30, height:30,
              borderRadius:8,
              background:`linear-gradient(
                135deg,${C.cyan},${C.violet})`,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:15,
            }}>⚡</div>
            <div>
              <div style={{
                fontSize:13, fontWeight:900,
                color:C.cyan, letterSpacing:2,
              }}>SENTIMENTIQ</div>
              <div style={{
                fontSize:9, color:C.dim,
                letterSpacing:1.5,
              }}>NTT DATA · AI ANALYTICS</div>
            </div>
          </div>
          <div style={{ flex:1 }}/>
          <div style={{
            background:roleColor+'12',
            border:`1px solid ${roleColor}40`,
            borderRadius:7, padding:'4px 12px',
            fontSize:10, color:roleColor,
            fontWeight:700,
          }}>
            👤 {user?.name}
            <span style={{
              color:C.dim, fontWeight:400
            }}> · {user?.role}</span>
          </div>
          <button onClick={onLogout} style={{
            background:C.red+'15',
            border:`1px solid ${C.red}40`,
            color:C.red, borderRadius:7,
            padding:'5px 14px', fontSize:11,
            fontWeight:700, cursor:'pointer',
            fontFamily:'inherit',
          }}>Sign Out</button>
        </header>

        {/* Import Card */}
        <div style={{
          flex:1, display:'flex',
          alignItems:'center',
          justifyContent:'center', padding:24,
        }}>
          <div style={{ width:'100%', maxWidth:520 }}>
            <div style={{
              textAlign:'center', marginBottom:28
            }}>
              <div style={{
                fontSize:48, marginBottom:12
              }}>📊</div>
              <h1 style={{
                fontSize:22, fontWeight:900,
                color:C.cyan, margin:0,
                letterSpacing:1,
              }}>Welcome, {user?.name}!</h1>
              <p style={{
                fontSize:12, color:C.sub,
                marginTop:8,
              }}>
                Import your data file to get started
              </p>
            </div>

            <div style={{
              background:C.panel,
              border:`1px solid ${C.border}`,
              borderRadius:14, padding:28,
            }}>
              <div style={{
                fontSize:12, fontWeight:700,
                color:C.text, marginBottom:4,
              }}>Import Data File</div>
              <div style={{
                fontSize:10, color:C.sub,
                marginBottom:20,
              }}>
                Supports: CSV · Excel (.xlsx)
                · JSON · TXT
              </div>

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

              <div
                onDragOver={e => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border:`2px dashed ${
                    dragging ? C.cyan : C.border}`,
                  borderRadius:12,
                  padding:'40px 20px',
                  textAlign:'center',
                  cursor:'pointer',
                  background:dragging
                    ? C.cyan+'08' : C.bg2,
                  transition:'all .2s',
                  marginBottom:16,
                }}
              >
                <div style={{
                  fontSize:40, marginBottom:10
                }}>
                  {dragging ? '📂' : '📁'}
                </div>
                <div style={{
                  fontSize:14, fontWeight:700,
                  color:dragging ? C.cyan : C.text,
                  marginBottom:6,
                }}>
                  {dragging
                    ? 'Drop file here!'
                    : 'Drag & drop your file here'}
                </div>
                <div style={{
                  fontSize:11, color:C.dim
                }}>
                  or click to browse
                </div>
              </div>

              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width:'100%',
                  background:`linear-gradient(
                    135deg,${C.cyan},${C.violet})`,
                  border:'none', borderRadius:10,
                  padding:'13px', color:'#000',
                  fontSize:13, fontWeight:900,
                  cursor:'pointer',
                  fontFamily:'inherit',
                  letterSpacing:1,
                }}
              >⬆ Browse & Import File</button>

              {error && (
                <div style={{
                  marginTop:14,
                  background:C.red+'10',
                  border:`1px solid ${C.red}40`,
                  borderRadius:8,
                  padding:'10px 14px',
                  fontSize:11, color:C.red,
                  fontWeight:600,
                }}>⚠ {error}</div>
              )}

              <div style={{
                marginTop:18, display:'flex',
                justifyContent:'center',
                gap:8, flexWrap:'wrap',
              }}>
                {['CSV','Excel','JSON','TXT']
                  .map(f => (
                  <div key={f} style={{
                    background:C.bg2,
                    border:`1px solid ${C.border}`,
                    borderRadius:6,
                    padding:'4px 12px',
                    fontSize:10, color:C.sub,
                    fontWeight:700,
                  }}>{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading screen ────────────────────────────
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
          fontSize:16, fontWeight:700,
          color:C.amber,
        }}>
          Importing file, please wait…
        </div>
        <div style={{
          fontSize:11, color:C.dim
        }}>
          This may take a few seconds
        </div>
      </div>
    )
  }

  // ── Main Dashboard ────────────────────────────
  return (
    <div style={{
      display:'flex', height:'100vh',
      background:C.bg0, color:C.text,
      fontFamily:"'IBM Plex Mono',monospace",
      overflow:'hidden',
    }}>
      <Toast toast={toast}/>

      {/* LEFT SIDEBAR */}
      <div style={{
        width:220, minWidth:220,
        background:C.bg1,
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
            display:'flex',
            alignItems:'center', gap:10
          }}>
            <div style={{
              width:34, height:34,
              borderRadius:9,
              background:`linear-gradient(
                135deg,${C.cyan},${C.violet})`,
              display:'flex',
              alignItems:'center',
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

        {/* Import new file button */}
        <div style={{ padding:'12px 10px 0' }}>
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
            onDrop={onDrop}
            style={{
              width:'100%',
              background:dragging
                ? C.cyan+'30' : C.cyan+'18',
              border:`1px solid ${C.cyan}50`,
              color:C.cyan, borderRadius:8,
              padding:'8px', fontSize:11,
              fontWeight:700, cursor:'pointer',
              fontFamily:'inherit',
            }}
          >⬆ Import New File</button>
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
              fontWeight:700,
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis',
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

        {/* Navigation */}
        <nav style={{
          flex:1, padding:'12px 10px',
          display:'flex', flexDirection:'column',
          gap:4,
        }}>
          <div style={{
            fontSize:9, color:C.dim,
            letterSpacing:1.5, fontWeight:700,
            padding:'4px 8px 8px',
          }}>NAVIGATION</div>

          {NAV.map(item => {
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  display:'flex',
                  alignItems:'center', gap:12,
                  background:active
                    ? C.cyan+'18' : 'transparent',
                  border:`1px solid ${active
                    ? C.cyan+'50' : 'transparent'}`,
                  borderRadius:9,
                  padding:'10px 12px',
                  cursor:'pointer',
                  fontFamily:'inherit',
                  textAlign:'left', width:'100%',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background
                      = C.bg2
                    e.currentTarget.style.borderColor
                      = C.border
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background
                      = 'transparent'
                    e.currentTarget.style.borderColor
                      = 'transparent'
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
                    fontSize:9, color:C.dim,
                    marginTop:1,
                  }}>{item.sub}</div>
                </div>
                {active && (
                  <div style={{
                    marginLeft:'auto',
                    width:3, height:26,
                    background:C.cyan,
                    borderRadius:2,
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
              ['CSAT',
               `${metrics.csat_pct||0}%`, C.green],
              ['DSAT',
               `${metrics.dsat_pct||0}%`, C.red],
              ['Neutral',
               `${metrics.neutral_pct||0}%`, C.amber],
            ].map(([label, value, color]) => (
              <div key={label} style={{
                display:'flex',
                justifyContent:'space-between',
                marginBottom:5,
                alignItems:'center',
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
                color:roleColor,
                whiteSpace:'nowrap',
                overflow:'hidden',
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

      {/* RIGHT CONTENT */}
      <div style={{
        marginLeft:220, flex:1,
        height:'100vh', overflowY:'auto',
        overflowX:'hidden',
      }}>

        {/* CHARTS PAGE */}
        {page === 'charts' && (
          <div style={{ padding:'24px' }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{
                fontSize:20, fontWeight:900,
                color:C.cyan, margin:0,
                letterSpacing:1,
              }}>Charts & Analytics</h1>
              <p style={{
                fontSize:11, color:C.sub,
                margin:'4px 0 0',
              }}>
                {metrics?.total?.toLocaleString()}
                {' '}records analysed
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
                sub="records loaded"
                accent={C.sky}
              />
              <KPI
                label="CSAT"
                value={`${metrics?.csat_pct||0}%`}
                sub={`${metrics?.csat_n||0} satisfied`}
                accent={C.green}
              />
              <KPI
                label="DSAT"
                value={`${metrics?.dsat_pct||0}%`}
                sub={`${metrics?.dsat_n||0} dissatisfied`}
                accent={C.red}
              />
              <KPI
                label="Neutral"
                value={`${metrics?.neutral_pct||0}%`}
                sub={`${metrics?.neutral_n||0} neutral`}
                accent={C.amber}
              />
            </div>

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
                borderRadius:12,
                padding:'18px 20px',
              }}>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:C.text, marginBottom:2,
                }}>Sentiment Distribution</div>
                <div style={{
                  fontSize:10, color:C.sub,
                  marginBottom:14,
                }}>
                  Pos: {metrics?.pos_n||0} ·
                  Neg: {metrics?.neg_n||0} ·
                  Neu: {metrics?.neutral_n||0}
                </div>
                <ResponsiveContainer
                  width="100%" height={210}>
                  <BarChart
                    data={sentBarData} barSize={55}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={C.border}/>
                    <XAxis
                      dataKey="name"
                      stroke={C.dim} fontSize={11}/>
                    <YAxis
                      stroke={C.dim} fontSize={10}/>
                    <Tooltip
                      contentStyle={TT}
                      formatter={(v,n,p) => [
                        `${v} (${p.payload.pct}%)`,
                        'Count'
                      ]}/>
                    <Bar
                      dataKey="value"
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
                borderRadius:12,
                padding:'18px 20px',
              }}>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:C.text, marginBottom:2,
                }}>CSAT vs DSAT</div>
                <div style={{
                  fontSize:10, color:C.sub,
                  marginBottom:14,
                }}>
                  CSAT: {metrics?.csat_pct||0}% ·
                  DSAT: {metrics?.dsat_pct||0}%
                </div>
                <ResponsiveContainer
                  width="100%" height={210}>
                  <BarChart
                    data={csatDsatBar} barSize={90}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={C.border}/>
                    <XAxis
                      dataKey="name"
                      stroke={C.dim} fontSize={12}/>
                    <YAxis
                      stroke={C.dim} fontSize={10}
                      domain={[0,100]} unit="%"/>
                    <Tooltip
                      contentStyle={TT}
                      formatter={v => [`${v}%`]}/>
                    <Bar
                      dataKey="value"
                      radius={[6,6,0,0]}>
                      {csatDsatBar.map((d,i) => (
                        <Cell key={i} fill={d.fill}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Team + Region Charts */}
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
                    }}>
                      CSAT% and DSAT% by Team
                    </div>
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
                        <XAxis
                          dataKey="name"
                          stroke={C.dim} fontSize={9}
                          interval={0} angle={-20}
                          textAnchor="end" height={50}/>
                        <YAxis
                          stroke={C.dim} fontSize={10}
                          unit="%"/>
                        <Tooltip
                          contentStyle={TT}
                          formatter={v => [`${v}%`]}/>
                        <Legend
                          iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize:11 }}/>
                        <Bar
                          dataKey="CSAT%"
                          fill={C.green}
                          radius={[4,4,0,0]}/>
                        <Bar
                          dataKey="DSAT%"
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
                        <XAxis
                          dataKey="name"
                          stroke={C.dim} fontSize={9}
                          interval={0} angle={-20}
                          textAnchor="end" height={60}/>
                        <YAxis
                          stroke={C.dim} fontSize={10}
                          unit="%"/>
                        <Tooltip
                          contentStyle={TT}
                          formatter={v => [`${v}%`]}/>
                        <Legend
                          iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize:11 }}/>
                        <Bar
                          dataKey="CSAT%"
                          fill={C.cyan}
                          radius={[4,4,0,0]}/>
                        <Bar
                          dataKey="DSAT%"
                          fill={C.violet}
                          radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DATA PAGE */}
        {page === 'data' && (
          <div style={{ padding:'24px' }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{
                fontSize:20, fontWeight:900,
                color:C.cyan, margin:0,
                letterSpacing:1,
              }}>Data</h1>
              <p style={{
                fontSize:11, color:C.sub,
                margin:'4px 0 0',
              }}>
                {rows.length.toLocaleString()} rows
                · Sort · Filter · Export
              </p>
            </div>
            <DataTable
              rows={rows}
              onNotify={notify}
            />
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing:border-box;
            margin:0; padding:0 }
        body { background:${C.bg0};
               overflow:hidden }
        select option { background:${C.bg2};
                        color:${C.text} }
        input::placeholder { color:${C.dim} }
        button:active { transform:scale(.97) }
        ::-webkit-scrollbar {
          width:8px; height:8px }
        ::-webkit-scrollbar-track {
          background:${C.bg1} }
        ::-webkit-scrollbar-thumb {
          background:${C.border};
          border-radius:4px }
        ::-webkit-scrollbar-thumb:hover {
          background:${C.dim} }
      `}</style>
    </div>
  )
}