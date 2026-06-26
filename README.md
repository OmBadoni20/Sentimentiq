Datatable.jsx:-

import { useState, useMemo } from 'react'

const PAGE_SIZE = 200

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

function EmptyTable() {
  const cols = ['A','B','C','D','E','F','G','H','I','J']
  return (
    <div style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:12, overflow:'hidden', position:'relative',
      minHeight:300,
    }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.bg2 }}>
              <th style={{
                width:40, padding:'9px 8px',
                borderBottom:`1px solid ${C.border}`,
                borderRight:`1px solid ${C.border}`,
                color:C.dim, fontSize:10,
              }}>#</th>
              {cols.map(c=>(
                <th key={c} style={{
                  padding:'9px 40px',
                  borderBottom:`1px solid ${C.border}`,
                  borderRight:`1px solid ${C.border}22`,
                  color:C.dim, fontSize:11, fontWeight:700,
                  textAlign:'center', minWidth:120,
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({length:12},(_,ri)=>(
              <tr key={ri} style={{
                borderBottom:`1px solid ${C.border}22`,
                background:ri%2?'#ffffff03':'transparent',
              }}>
                <td style={{
                  padding:'8px', textAlign:'center',
                  color:C.dim, fontSize:10,
                  borderRight:`1px solid ${C.border}`,
                  background:'#161b2288',
                }}>{ri+1}</td>
                {cols.map(c=>(
                  <td key={c} style={{
                    padding:'8px 12px', minWidth:120,
                    height:34, borderRight:`1px solid ${C.border}22`,
                  }}/>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        textAlign:'center', pointerEvents:'none',
      }}>
        <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
        <div style={{ fontSize:13, fontWeight:700, color:C.sub }}>
          No data to display
        </div>
      </div>
    </div>
  )
}

function PaginationBar({ page, totalPages, setPage, totalFiltered }) {
  if (totalPages <= 1) return null
  const start = (page-1)*PAGE_SIZE+1
  const end   = Math.min(page*PAGE_SIZE, totalFiltered)

  function pgBtn(label, onClick, disabled, active) {
    return (
      <button
        key={label+String(active)}
        onClick={onClick}
        disabled={disabled}
        style={{
          background: active?C.cyan:disabled?'transparent':C.bg2,
          border:`1px solid ${active?C.cyan:C.border}`,
          color: active?'#000':disabled?C.dim:C.text,
          borderRadius:7, padding:'5px 11px',
          fontSize:11, fontWeight:700,
          cursor:disabled?'not-allowed':'pointer',
          fontFamily:'inherit', opacity:disabled?0.4:1, minWidth:34,
        }}
      >{label}</button>
    )
  }

  const from = Math.max(1,page-2)
  const to   = Math.min(totalPages,page+2)
  const nums = []
  for (let i=from;i<=to;i++) nums.push(i)

  return (
    <div style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:10, padding:'10px 16px',
      display:'flex', alignItems:'center',
      justifyContent:'space-between', flexWrap:'wrap', gap:10,
    }}>
      <div style={{ fontSize:11, color:C.sub }}>
        Rows{' '}
        <strong style={{color:C.cyan}}>{start.toLocaleString()}</strong>
        {' – '}
        <strong style={{color:C.cyan}}>{end.toLocaleString()}</strong>
        {' of '}
        <strong style={{color:C.text}}>{totalFiltered.toLocaleString()}</strong>
        {' · Page '}
        <strong style={{color:C.cyan}}>{page}</strong>
        {' of '}
        <strong style={{color:C.text}}>{totalPages}</strong>
        <span style={{color:C.dim}}> · {PAGE_SIZE}/page</span>
      </div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {pgBtn('«',()=>setPage(1),page===1,false)}
        {pgBtn('‹',()=>setPage(p=>p-1),page===1,false)}
        {from>1 && <>
          {pgBtn('1',()=>setPage(1),false,false)}
          {from>2 &&
            <span style={{color:C.dim,padding:'0 4px'}}>…</span>}
        </>}
        {nums.map(p=>pgBtn(String(p),()=>setPage(p),false,p===page))}
        {to<totalPages && <>
          {to<totalPages-1 &&
            <span style={{color:C.dim,padding:'0 4px'}}>…</span>}
          {pgBtn(String(totalPages),()=>setPage(totalPages),false,false)}
        </>}
        {pgBtn('›',()=>setPage(p=>p+1),page===totalPages,false)}
        {pgBtn('»',()=>setPage(totalPages),page===totalPages,false)}
      </div>
    </div>
  )
}

export default function DataTable({ rows, onNotify }) {

  // ── ALL HOOKS FIRST — NEVER MOVE THESE ───────────────
  const [search,    setSearch]    = useState('')
  const [sortCol,   setSortCol]   = useState(null)
  const [sortDir,   setSortDir]   = useState('asc')
  const [colFilter, setColFilter] = useState({})
  const [page,      setPage]      = useState(1)

  const safeRows = rows || []

  const cols = useMemo(()=>{
    if (!safeRows.length) return []
    return Object.keys(safeRows[0])
  },[safeRows])

  const uniqueValues = useMemo(()=>{
    if (!safeRows.length) return {}
    const map = {}
    cols.forEach(col=>{
      const vals = [...new Set(safeRows.map(r=>String(r[col]??'')))]
      if (vals.length<=30) map[col]=vals
    })
    return map
  },[safeRows,cols])

  const filtered = useMemo(()=>{
    if (!safeRows.length) return []
    let data = safeRows

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(row=>
        Object.values(row).some(v=>
          String(v).toLowerCase().includes(q)
        )
      )
    }

    Object.entries(colFilter).forEach(([col,val])=>{
      if (val && val!=='All') {
        data = data.filter(row=>
          String(row[col]??'').toLowerCase()===val.toLowerCase()
        )
      }
    })

    return data
  },[safeRows,search,colFilter])

  const sorted = useMemo(()=>{
    if (!filtered.length) return []
    if (!sortCol) return filtered
    return [...filtered].sort((a,b)=>{
      const av = String(a[sortCol]??'')
      const bv = String(b[sortCol]??'')
      const nA = parseFloat(av), nB = parseFloat(bv)
      const cmp = !isNaN(nA)&&!isNaN(nB)
        ? nA-nB : av.localeCompare(bv)
      return sortDir==='asc'?cmp:-cmp
    })
  },[filtered,sortCol,sortDir])

  const totalPages = useMemo(()=>
    Math.max(1,Math.ceil(sorted.length/PAGE_SIZE)),
  [sorted])

  const curPage = useMemo(()=>
    Math.min(page,totalPages),
  [page,totalPages])

  const sliced = useMemo(()=>
    sorted.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE),
  [sorted,curPage])

  // ── ALL HOOKS DONE — safe to return early now ─────────
  if (!safeRows.length) return <EmptyTable/>

  const isFiltered = search.trim() ||
    Object.values(colFilter).some(v=>v&&v!=='All')
  const isSorted   = sortCol !== null

  function doSort(col) {
    if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }
  function doFilter(col,val) {
    setColFilter(prev=>({...prev,[col]:val})); setPage(1)
  }
  function doSearch(val) { setSearch(val); setPage(1) }
  function clearAll() {
    setSearch(''); setColFilter({})
    setSortCol(null); setSortDir('asc'); setPage(1)
  }

  // ── EXPORT — exports filtered + sorted data ───────────
  function doExport() {
    const dataToExport = sorted   // filtered + sorted!
    if (!dataToExport.length) return

    const headers = Object.keys(dataToExport[0]).join(',')
    const body    = dataToExport.map(r=>
      Object.values(r)
        .map(v=>`"${String(v??'').replace(/"/g,'""')}"`)
        .join(',')
    ).join('\n')

    const blob = new Blob(
      [headers+'\n'+body],
      { type:'text/csv' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sentimentiq_export_${Date.now()}.csv`
    a.click()

    const msg = isFiltered || isSorted
      ? `Exported ${dataToExport.length.toLocaleString()} rows (filtered/sorted)`
      : `Exported all ${dataToExport.length.toLocaleString()} rows`

    if (onNotify) onNotify(msg, C.green)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {/* ── TOOLBAR ───────────────────────────────────── */}
      <div style={{
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:10, padding:'12px 14px',
        display:'flex', gap:10, alignItems:'center', flexWrap:'wrap',
      }}>

        {/* Search box */}
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{
            position:'absolute', left:11, top:'50%',
            transform:'translateY(-50%)',
            color:C.dim, fontSize:13, pointerEvents:'none',
          }}>🔍</span>
          <input
            value={search}
            onChange={e=>doSearch(e.target.value)}
            placeholder="Search across all columns…"
            style={{
              width:'100%', background:C.bg2,
              border:`1px solid ${C.border}`,
              borderRadius:8, padding:'8px 12px 8px 32px',
              color:C.text, fontSize:12,
              fontFamily:'inherit', outline:'none',
              boxSizing:'border-box',
            }}
          />
        </div>

        {/* Row count */}
        <div style={{
          fontSize:11, color:C.sub, whiteSpace:'nowrap',
        }}>
          <strong style={{color:C.cyan}}>
            {sorted.length.toLocaleString()}
          </strong>
          {' of '}
          <strong style={{color:C.text}}>
            {safeRows.length.toLocaleString()}
          </strong>
          {' rows'}
          {(isFiltered||isSorted) && (
            <span style={{
              color:C.amber, marginLeft:6, fontSize:10,
            }}>● filtered</span>
          )}
        </div>

        {/* Clear button */}
        {(isFiltered||isSorted) && (
          <button onClick={clearAll} style={{
            background:C.red+'18', border:`1px solid ${C.red}40`,
            color:C.red, borderRadius:7, padding:'7px 13px',
            fontSize:11, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>✕ Clear</button>
        )}

        {/* EXPORT BUTTON — always visible */}
        <button
          onClick={doExport}
          style={{
            background:C.green+'18',
            border:`1px solid ${C.green}50`,
            color:C.green, borderRadius:7,
            padding:'7px 16px',
            fontSize:11, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            whiteSpace:'nowrap',
          }}
        >
          ⬇ Export CSV
          {(isFiltered||isSorted)
            ? ` (${sorted.length.toLocaleString()} filtered)`
            : ` (${safeRows.length.toLocaleString()} rows)`}
        </button>
      </div>

      {/* Pagination top */}
      <PaginationBar
        page={curPage} totalPages={totalPages}
        setPage={setPage} totalFiltered={sorted.length}
      />

      {/* Table */}
      <div style={{
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:12, overflow:'hidden',
      }}>
        <div style={{
          overflowX:'auto', overflowY:'auto', maxHeight:'52vh',
        }}>
          <table style={{
            width:'100%', borderCollapse:'collapse', fontSize:12,
          }}>
            <thead>
              <tr style={{ background:C.bg0 }}>
                {cols.map(col=>(
                  <th
                    key={col}
                    onClick={()=>doSort(col)}
                    style={{
                      padding:'10px 14px', textAlign:'left',
                      color:C.cyan, fontWeight:700, fontSize:10,
                      letterSpacing:1.4, textTransform:'uppercase',
                      whiteSpace:'nowrap',
                      borderBottom:`1px solid ${C.border}`,
                      cursor:'pointer', userSelect:'none',
                      position:'sticky', top:0, background:C.bg0,
                    }}
                  >
                    {col.replace(/_/g,' ')}
                    <span style={{
                      marginLeft:4,
                      color:sortCol===col?C.cyan:C.dim,
                    }}>
                      {sortCol===col
                        ?(sortDir==='asc'?'↑':'↓'):'⇅'}
                    </span>
                  </th>
                ))}
              </tr>

              {/* Filter dropdowns */}
              <tr style={{ background:C.bg0 }}>
                {cols.map(col=>{
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
                          onChange={e=>doFilter(col,e.target.value)}
                          style={{
                            background:C.panel,
                            border:`1px solid ${
                              colFilter[col]&&colFilter[col]!=='All'
                                ?C.cyan:C.border}`,
                            borderRadius:5,
                            color:colFilter[col]&&colFilter[col]!=='All'
                              ?C.cyan:C.dim,
                            fontSize:10, padding:'3px 6px',
                            fontFamily:'inherit', cursor:'pointer',
                            width:'100%', outline:'none',
                          }}
                        >
                          <option value="All">All</option>
                          {opts.sort().map(v=>(
                            <option key={v} value={v}>
                              {v||'(empty)'}
                            </option>
                          ))}
                        </select>
                      ) : <div style={{height:24}}/>}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {sliced.map((row,ri)=>(
                <tr
                  key={ri}
                  style={{
                    borderBottom:`1px solid ${C.border}22`,
                    background:ri%2?'#ffffff04':'transparent',
                    transition:'background .1s',
                  }}
                  onMouseEnter={e=>
                    (e.currentTarget.style.background=C.cyan+'0a')}
                  onMouseLeave={e=>
                    (e.currentTarget.style.background=
                      ri%2?'#ffffff04':'transparent')}
                >
                  {cols.map(col=>(
                    <td key={col} style={{
                      padding:'9px 14px', whiteSpace:'nowrap',
                    }}>
                      {BADGE_COLS.has(col)
                        ?<Badge v={String(row[col]??'')}/>
                        :EMAIL_COLS.has(col)
                        ?<span style={{color:C.violet,fontSize:11}}>
                          {row[col]}
                        </span>
                        :<span style={{color:C.text}}>
                          {String(row[col]??'').length>48
                            ?String(row[col]).slice(0,48)+'…'
                            :row[col]}
                        </span>}
                    </td>
                  ))}
                </tr>
              ))}

              {!sliced.length && (
                <tr>
                  <td colSpan={cols.length} style={{
                    padding:40, textAlign:'center', color:C.dim,
                  }}>
                    No records match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination bottom */}
      <PaginationBar
        page={curPage} totalPages={totalPages}
        setPage={setPage} totalFiltered={sorted.length}
      />

      <style>{`
        select option{background:${C.bg2};color:${C.text}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#07090f}
        ::-webkit-scrollbar-thumb{
          background:${C.border};border-radius:3px}
      `}</style>
    </div>
  )
}




Charts.jsx:-


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
  background: C.panel, border: `1px solid ${C.border}`,
  borderRadius: 8, fontSize: 11, color: C.text,
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

// KEY FIX — handles number 1, string "1", true, "yes"
function isTrue(val) {
  if (val === null || val === undefined) return false
  return val === 1 || val === true ||
    String(val).trim().toLowerCase() === '1' ||
    String(val).trim().toLowerCase() === 'true' ||
    String(val).trim().toLowerCase() === 'yes'
}

function calcMetrics(rows) {
  if (!rows || !rows.length) return null

  const s = rows[0]

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
    'NPS_Score','nps_score','NPS Score','nps'
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
  console.log('All columns:', Object.keys(s))
  console.log('csatCol:', csatCol, '→', s[csatCol], typeof s[csatCol])
  console.log('dsatCol:', dsatCol, '→', s[dsatCol], typeof s[dsatCol])
  console.log('passiveCol:', passiveCol, '→', s[passiveCol])
  console.log('npsScoreCol:', npsScoreCol, '→', s[npsScoreCol])
  console.log('deptCol:', deptCol, '→', s[deptCol])
  console.log('indCol:', indCol, '→', s[indCol])

  let csatN=0, dsatN=0, slaY=0, slaN=0
  let posN=0,  negN=0,  neuN=0
  let promoter=0, passive=0, detractor=0

  const byDept={}, byInd={}, byPri={}, byProj={}
  const npsScores=[]

  rows.forEach(r => {
    const cv = r[csatCol]
    const dv = r[dsatCol]
    const pv = r[passiveCol]

    if (csatCol && isTrue(cv)) csatN++
    if (dsatCol && isTrue(dv)) dsatN++

    if (slaCol) {
      const sv = String(r[slaCol] ?? '').trim().toLowerCase()
      if (sv === 'yes' || sv === '1' || sv === 'true') slaY++
      else slaN++
    }

    // Sentiment
    if (sentCol) {
      const sv = String(r[sentCol] ?? '').trim().toLowerCase()
      if      (sv === 'positive') posN++
      else if (sv === 'negative') negN++
      else if (sv === 'neutral')  neuN++
    } else {
      if      (isTrue(cv)) posN++
      else if (isTrue(dv)) negN++
      else if (isTrue(pv)) neuN++
    }

    // NPS Category
    if (npsCatCol) {
      const v = String(r[npsCatCol] ?? '').trim()
      if      (v === 'Promoter')  promoter++
      else if (v === 'Passive')   passive++
      else if (v === 'Detractor') detractor++
    } else if (npsScoreCol) {
      const n = parseFloat(r[npsScoreCol])
      if (!isNaN(n)) {
        if      (n >= 9) promoter++
        else if (n >= 7) passive++
        else             detractor++
      }
    }

    // NPS Score
    if (npsScoreCol) {
      const n = parseFloat(r[npsScoreCol])
      if (!isNaN(n)) npsScores.push(Math.round(n))
    }

    // TEAM
    if (deptCol) {
      const k = String(r[deptCol] ?? '').trim()
      if (k) {
        if (!byDept[k]) byDept[k] = { name:k,csat:0,dsat:0,total:0 }
        byDept[k].total++
        if (isTrue(cv)) byDept[k].csat++
        if (isTrue(dv)) byDept[k].dsat++
      }
    }

    // REGION
    if (indCol) {
      const k = String(r[indCol] ?? '').trim()
      if (k) {
        if (!byInd[k]) byInd[k] = { name:k,csat:0,dsat:0,total:0 }
        byInd[k].total++
        if (isTrue(cv)) byInd[k].csat++
        if (isTrue(dv)) byInd[k].dsat++
      }
    }

    // Priority
    if (priCol) {
      const k = String(r[priCol] ?? '').trim()
      if (k) {
        if (!byPri[k]) byPri[k] = { name:k, breach:0, ok:0 }
        if (slaCol &&
          String(r[slaCol] ?? '').trim().toLowerCase() === 'yes')
          byPri[k].breach++
        else byPri[k].ok++
      }
    }

    // Assignment Group
    if (projCol) {
      const k = String(r[projCol] ?? '').trim()
      if (k) {
        if (!byProj[k]) byProj[k] = { name:k, count:0 }
        byProj[k].count++
      }
    }
  })

  console.log('=== RESULTS ===')
  console.log('csatN:', csatN, 'dsatN:', dsatN)
  console.log('posN:', posN, 'negN:', negN, 'neuN:', neuN)
  console.log('promoter:', promoter, 'passive:', passive, 'detractor:', detractor)

  const total = rows.length
  const pct   = n => total
    ? parseFloat((n / total * 100).toFixed(1)) : 0

  return {
    total, csatN, dsatN, slaY, slaN,
    posN, negN, neuN, promoter, passive, detractor,
    csatPct: pct(csatN), dsatPct: pct(dsatN), slaPct: pct(slaY),
    posPct: pct(posN),   negPct: pct(negN),   neuPct: pct(neuN),

    deptData: Object.values(byDept)
      .map(d => ({
        name: d.name,
        'CSAT%': d.total ? parseFloat((d.csat/d.total*100).toFixed(1)) : 0,
        'DSAT%': d.total ? parseFloat((d.dsat/d.total*100).toFixed(1)) : 0,
      }))
      .sort((a,b) => b['CSAT%'] - a['CSAT%']).slice(0,10),

    indData: Object.values(byInd)
      .map(d => ({
        name: d.name,
        'CSAT%': d.total ? parseFloat((d.csat/d.total*100).toFixed(1)) : 0,
        'DSAT%': d.total ? parseFloat((d.dsat/d.total*100).toFixed(1)) : 0,
      }))
      .sort((a,b) => b['CSAT%'] - a['CSAT%']).slice(0,10),

    priData: Object.values(byPri)
      .sort((a,b) => a.name.localeCompare(b.name))
      .map(d => ({
        name: d.name,
        'SLA Breach': d.breach,
        'Compliant':  d.ok,
      })),

    projData: Object.values(byProj)
      .sort((a,b) => b.count - a.count).slice(0,10),

    npsDistrib: Array.from({ length:11 }, (_,i) => ({
      score: String(i),
      count: npsScores.filter(s => s === i).length,
    })),
  }
}

function ChartBox({ title, sub, children }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2,
      }}>{title}</div>
      {sub && (
        <div style={{ fontSize: 10, color: C.sub, marginBottom: 14 }}>
          {sub}
        </div>
      )}
      {!sub && <div style={{ marginBottom: 14 }}/>}
      {children}
    </div>
  )
}

function KPI({ label, value, accent }) {
  return (
    <div style={{
      background: accent + '12', border: `1px solid ${accent}30`,
      borderRadius: 10, padding: '14px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: 26, fontWeight: 900,
        color: accent, fontFamily: 'monospace',
      }}>{value}</div>
      <div style={{
        fontSize: 10, color: C.sub, marginTop: 4,
        letterSpacing: 1, textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  )
}

const PIE_LABEL = ({ percent }) =>
  percent > 0.04 ? `${(percent*100).toFixed(0)}%` : ''

export default function Charts({ rows, user, onBack, onLogout }) {
  const m = useMemo(() => calcMetrics(rows), [rows])

  const ROLE_COLOR = { Admin:C.red, Manager:C.amber, Developer:C.cyan }
  const roleColor  = ROLE_COLOR[user?.role] || C.violet

  if (!m) {
    return (
      <div style={{
        minHeight:'100vh', background:C.bg0,
        display:'flex', alignItems:'center',
        justifyContent:'center', flexDirection:'column',
        gap:16, fontFamily:'monospace', color:C.text,
      }}>
        <div style={{ fontSize:48 }}>📊</div>
        <div style={{ fontSize:16, color:C.amber }}>No data to display</div>
        <button onClick={onBack} style={{
          background:C.cyan, border:'none', borderRadius:9,
          padding:'10px 24px', color:'#000',
          fontSize:12, fontWeight:900,
          cursor:'pointer', fontFamily:'inherit',
        }}>← Back to Data</button>
      </div>
    )
  }

  const sentPie = [
    { name:'Positive',  value: m.posN  },
    { name:'Negative',  value: m.negN  },
    { name:'Neutral',   value: m.neuN  },
  ]
  const csatPie = [
    { name:`Satisfied (${m.csatPct}%)`,
      value: m.csatN },
    { name:`Unsatisfied (${parseFloat((100-m.csatPct).toFixed(1))}%)`,
      value: m.total - m.csatN },
  ]
  const dsatPie = [
    { name:`Dissatisfied (${m.dsatPct}%)`,
      value: m.dsatN },
    { name:`OK (${parseFloat((100-m.dsatPct).toFixed(1))}%)`,
      value: m.total - m.dsatN },
  ]
  const npsPie = [
    { name:'Promoter',  value: m.promoter  },
    { name:'Passive',   value: m.passive   },
    { name:'Detractor', value: m.detractor },
  ]
  const slaPie = [
    { name:`Breached (${m.slaPct}%)`,    value: m.slaY  },
    { name:`Compliant (${parseFloat((100-m.slaPct).toFixed(1))}%)`,
      value: m.slaN },
  ]
  const overviewBar = [
    { name:'CSAT%',       value: m.csatPct },
    { name:'DSAT%',       value: m.dsatPct },
    { name:'SLA Breach%', value: m.slaPct  },
    { name:'Positive%',   value: m.posPct  },
    { name:'Negative%',   value: m.negPct  },
    { name:'Neutral%',    value: m.neuPct  },
  ]

  return (
    <div style={{
      minHeight:'100vh', background:C.bg0, color:C.text,
      fontFamily:"'IBM Plex Mono','Courier New',monospace",
    }}>

      {/* header */}
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
              NTT DATA · AI PLATFORM
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:4, marginLeft:16 }}>
          <button onClick={onBack} style={{
            background:'transparent',
            border:`1px solid ${C.border}`,
            color:C.sub, borderRadius:7, padding:'5px 14px',
            fontSize:11, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>📋 Data</button>
          <div style={{
            background:C.cyan+'18', border:`1px solid ${C.cyan}50`,
            color:C.cyan, borderRadius:7, padding:'5px 14px',
            fontSize:11, fontWeight:700,
          }}>📊 Charts</div>
        </div>

        <div style={{ flex:1 }}/>

        <div style={{
          background:C.dim+'18', border:`1px solid ${C.border}`,
          borderRadius:7, padding:'4px 12px',
          fontSize:10, color:C.sub,
        }}>
          {m.total.toLocaleString()} rows
        </div>

        <div style={{
          background:roleColor+'12', border:`1px solid ${roleColor}40`,
          borderRadius:7, padding:'4px 12px',
          fontSize:10, color:roleColor, fontWeight:700,
        }}>
          👤 {user?.name}
          <span style={{ color:C.dim, fontWeight:400 }}>
            {' '}· {user?.role}
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

        <div style={{ marginBottom:20 }}>
          <h1 style={{
            fontSize:18, fontWeight:900,
            color:C.cyan, margin:0, letterSpacing:1,
          }}>Charts & Analytics</h1>
          <p style={{ fontSize:12, color:C.sub, margin:'4px 0 0' }}>
            {m.total.toLocaleString()} records ·
            ISHAPPY=CSAT · ISSAD=DSAT ·
            TEAM=Department · REGION=Industry
          </p>
        </div>

        {/* KPI row */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(6,1fr)',
          gap:10, marginBottom:20,
        }}>
          <KPI label="Total"      value={m.total.toLocaleString()} accent={C.sky}   />
          <KPI label="CSAT"       value={`${m.csatPct}%`}         accent={C.green} />
          <KPI label="DSAT"       value={`${m.dsatPct}%`}         accent={C.red}   />
          <KPI label="SLA Breach" value={`${m.slaPct}%`}          accent={C.amber} />
          <KPI label="Positive"   value={`${m.posPct}%`}          accent={C.green} />
          <KPI label="Negative"   value={`${m.negPct}%`}          accent={C.red}   />
        </div>

        {/* Row 1 — 3 pies */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(3,1fr)',
          gap:14, marginBottom:14,
        }}>
          <ChartBox
            title="Sentiment Distribution"
            sub={`Positive: ${m.posN} · Negative: ${m.negN} · Neutral: ${m.neuN}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={sentPie} cx="50%" cy="50%"
                  outerRadius={78} innerRadius={32}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize:11 }}>
                  <Cell fill={C.green}/>
                  <Cell fill={C.red}/>
                  <Cell fill={C.amber}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize:11, color:C.sub }}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="CSAT Breakdown"
            sub={`${m.csatN.toLocaleString()} satisfied (ISHAPPY=1) of ${m.total.toLocaleString()}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={csatPie} cx="50%" cy="50%"
                  outerRadius={78} innerRadius={32}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize:11 }}>
                  <Cell fill={C.green}/>
                  <Cell fill={C.border}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize:11, color:C.sub }}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="DSAT Breakdown"
            sub={`${m.dsatN.toLocaleString()} dissatisfied (ISSAD=1) of ${m.total.toLocaleString()}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={dsatPie} cx="50%" cy="50%"
                  outerRadius={78} innerRadius={32}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize:11 }}>
                  <Cell fill={C.red}/>
                  <Cell fill={C.border}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize:11, color:C.sub }}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* Row 2 — NPS + SLA */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:14, marginBottom:14,
        }}>
          <ChartBox
            title="NPS Category Distribution"
            sub={`Promoters: ${m.promoter} · Passives: ${m.passive} · Detractors: ${m.detractor}`}
          >
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={npsPie} cx="50%" cy="50%"
                  outerRadius={88} innerRadius={36}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize:11 }}>
                  <Cell fill={C.cyan}/>
                  <Cell fill={C.violet}/>
                  <Cell fill={C.red}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize:11, color:C.sub }}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="SLA Breach Status"
            sub={`${m.slaY} breached · ${m.slaN} compliant · ${m.slaPct}% breach rate`}
          >
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={slaPie} cx="50%" cy="50%"
                  outerRadius={88} innerRadius={36}
                  dataKey="value" paddingAngle={3}
                  label={PIE_LABEL} labelLine={false}
                  style={{ fontSize:11 }}>
                  <Cell fill={C.red}/>
                  <Cell fill={C.green}/>
                </Pie>
                <Tooltip contentStyle={TT}/>
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize:11, color:C.sub }}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* Row 3 — Overview bar */}
        <div style={{ marginBottom:14 }}>
          <ChartBox
            title="All Metrics Overview"
            sub="CSAT · DSAT · SLA · Positive · Negative · Neutral percentage"
          >
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={overviewBar} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="name" stroke={C.dim} fontSize={10}/>
                <YAxis stroke={C.dim} fontSize={10}
                  domain={[0,100]} unit="%"/>
                <Tooltip contentStyle={TT}
                  formatter={v => [`${v}%`]}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {overviewBar.map((_,i) => (
                    <Cell key={i}
                      fill={[C.green,C.red,C.amber,C.green,C.red,C.amber][i]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* Row 4 — NPS Score Distribution */}
        {m.npsDistrib.some(d => d.count > 0) && (
          <div style={{ marginBottom:14 }}>
            <ChartBox
              title="NPS / Main Score Distribution (0–10)"
              sub="Green = Promoter (9-10) · Blue = Passive (7-8) · Red = Detractor (0-6)"
            >
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={m.npsDistrib} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="score" stroke={C.dim} fontSize={11}/>
                  <YAxis stroke={C.dim} fontSize={10}/>
                  <Tooltip contentStyle={TT}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {m.npsDistrib.map((d,i) => (
                      <Cell key={i} fill={
                        parseInt(d.score) >= 9 ? C.green :
                        parseInt(d.score) >= 7 ? C.cyan  : C.red
                      }/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 5 — TEAM */}
        {m.deptData.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <ChartBox
              title="CSAT% and DSAT% by Team"
              sub="Which teams have highest satisfaction and dissatisfaction"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={m.deptData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="name" stroke={C.dim} fontSize={10}
                    interval={0} angle={-20}
                    textAnchor="end" height={50}/>
                  <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                  <Tooltip contentStyle={TT}
                    formatter={v => [`${v}%`]}/>
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize:11 }}/>
                  <Bar dataKey="CSAT%" fill={C.green} radius={[4,4,0,0]}/>
                  <Bar dataKey="DSAT%" fill={C.red}   radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 6 — REGION */}
        {m.indData.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <ChartBox
              title="CSAT% and DSAT% by Region"
              sub="Which regions have highest satisfaction and dissatisfaction"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={m.indData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="name" stroke={C.dim} fontSize={10}
                    interval={0} angle={-20}
                    textAnchor="end" height={60}/>
                  <YAxis stroke={C.dim} fontSize={10} unit="%"/>
                  <Tooltip contentStyle={TT}
                    formatter={v => [`${v}%`]}/>
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize:11 }}/>
                  <Bar dataKey="CSAT%" fill={C.cyan}   radius={[4,4,0,0]}/>
                  <Bar dataKey="DSAT%" fill={C.violet} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 7 — Priority SLA */}
        {m.priData.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <ChartBox
              title="SLA Breach by Priority"
              sub="Breached vs Compliant per priority level"
            >
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={m.priData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11}/>
                  <YAxis stroke={C.dim} fontSize={10}/>
                  <Tooltip contentStyle={TT}/>
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize:11 }}/>
                  <Bar dataKey="SLA Breach" fill={C.red}   radius={[4,4,0,0]}/>
                  <Bar dataKey="Compliant"  fill={C.green} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 8 — Assignment Groups */}
        {m.projData.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <ChartBox
              title="Top Assignment Groups / Issue Categories"
              sub="Most frequent ticket groups"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={m.projData}
                  layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis type="number" stroke={C.dim} fontSize={10}/>
                  <YAxis type="category" dataKey="name"
                    stroke={C.dim} fontSize={10} width={160}/>
                  <Tooltip contentStyle={TT}/>
                  <Bar dataKey="count" fill={C.violet}
                    radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        <div style={{ textAlign:'center', paddingBottom:48, paddingTop:10 }}>
          <button onClick={onBack} style={{
            background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
            border:'none', borderRadius:9, padding:'11px 36px',
            color:'#000', fontSize:13, fontWeight:900,
            cursor:'pointer', fontFamily:'inherit',
          }}>← Back to Data Table</button>
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




Dashboard.jsx:-  


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
      Object.values(r).map(v =>
        `"${String(v??'').replace(/"/g,'""')}"`
      ).join(',')
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
        setEffData(d.rows || [])
      }
      if (repRes.ok) {
        const d = await repRes.json()
        setRepIssues(d.issues || [])
      }
    } catch(e) {
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
      const formData  = new FormData()
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

  const NAV = [
    { id:'charts',   icon:'📊', label:'Charts',       sub:'Analytics & KPIs'  },
    { id:'data',     icon:'📋', label:'Data',          sub:'Import & Export'   },
    { id:'analysis', icon:'🔍', label:'Data Analysis', sub:'Insights & Issues' },
  ]

  if (loading) {
    return (
      <div style={{
        minHeight:'100vh', background:C.bg0, display:'flex',
        alignItems:'center', justifyContent:'center',
        flexDirection:'column', fontFamily:'monospace', color:C.text, gap:16,
      }}>
        <div style={{ fontSize:48 }}>⏳</div>
        <div style={{ fontSize:16, fontWeight:700, color:C.amber }}>Importing file, please wait…</div>
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

      {/* Logo */}
      <div style={{ padding:'20px 18px 16px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:18, flexShrink:0,
          }}>⚡</div>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:C.cyan, letterSpacing:2 }}>SENTIMENTIQ</div>
            <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5 }}>NTT DATA · AI</div>
          </div>
        </div>
      </div>

      {/* File info */}
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

      {/* Navigation */}
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

      {/* User + logout */}
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

            {/* KPI Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              <KPI label="Total Records"
                value={(metrics?.total||0).toLocaleString()}
                sub={metrics ? "records loaded" : "no data yet"}
                accent={C.sky}/>
              <KPI label="CSAT"
                value={`${metrics?.csat_pct||0}%`}
                sub={metrics ? `${metrics.csat_n||0} satisfied` : "no data yet"}
                accent={C.green}/>
              <KPI label="DSAT"
                value={`${metrics?.dsat_pct||0}%`}
                sub={metrics ? `${metrics.dsat_n||0} dissatisfied` : "no data yet"}
                accent={C.red}/>
              <KPI label="Neutral"
                value={`${metrics?.neutral_pct||0}%`}
                sub={metrics ? `${metrics.neutral_n||0} neutral` : "no data yet"}
                accent={C.amber}/>
            </div>

            {/* Charts Row 1 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>Sentiment Distribution</div>
                <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>
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
                        formatter={(v,n,p) => [`${v} (${p.payload.pct}%)`, 'Count']}/>
                      <Bar dataKey="value" radius={[6,6,0,0]}>
                        <Cell fill={C.green}/>
                        <Cell fill={C.red}/>
                        <Cell fill={C.amber}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={210}/>}
              </div>

              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>CSAT vs DSAT</div>
                <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>
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
                        {csatDsatBar.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart height={210}/>}
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>CSAT% and DSAT% by Team</div>
                <div style={{ fontSize:10, color:C.sub, marginBottom:14 }}>Team performance</div>
                {teamData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={teamData} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="name" stroke={C.dim} fontSize={9}
                        interval={0} angle={-20} textAnchor="end" height={50}/>
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
                      <XAxis dataKey="name" stroke={C.dim} fontSize={9}
                        interval={0} angle={-20} textAnchor="end" height={60}/>
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

            {/* Header with Import top right */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
              <div>
                <h1 style={{ fontSize:20, fontWeight:900, color:C.cyan, margin:0, letterSpacing:1 }}>Data</h1>
                <p style={{ fontSize:11, color:C.sub, margin:'4px 0 0' }}>
                  {rows.length > 0
                    ? `${rows.length.toLocaleString()} rows · Sort · Filter · Export`
                    : 'Import a file to get started'}
                </p>
              </div>

              {/* Import button top right */}
              <div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.txt"
                  style={{ display:'none' }}
                  onChange={e => {
                    if (e.target.files[0]) uploadToBackend(e.target.files[0])
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragging(false)
                    if (e.dataTransfer.files[0]) uploadToBackend(e.dataTransfer.files[0])
                  }}
                  style={{
                    background:dragging
                      ? C.cyan+'30'
                      : `linear-gradient(135deg,${C.cyan},${C.violet})`,
                    border:'none', borderRadius:10, padding:'10px 20px',
                    color:'#000', fontSize:12, fontWeight:900,
                    cursor:'pointer', fontFamily:'inherit', letterSpacing:1,
                  }}
                >⬆ Import File</button>
              </div>
            </div>

            {/* Empty state */}
            {rows.length === 0 && (
              <div style={{
                background:C.panel, border:`2px dashed ${C.border}`,
                borderRadius:12, padding:'60px 20px', textAlign:'center',
              }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.sub, marginBottom:8 }}>
                  No Data Imported Yet
                </div>
                <div style={{ fontSize:12, color:C.dim, marginBottom:20 }}>
                  Click Import File button above to upload CSV or Excel file
                </div>
                <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap' }}>
                  {['CSV','Excel','JSON','TXT'].map(f => (
                    <div key={f} style={{
                      background:C.bg2, border:`1px solid ${C.border}`,
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

            {error && (
              <div style={{
                marginTop:14, background:C.red+'10',
                border:`1px solid ${C.red}40`, borderRadius:8,
                padding:'10px 14px', fontSize:11, color:C.red, fontWeight:600,
              }}>⚠ {error}</div>
            )}

            {/* Export button bottom right */}
            {rows.length > 0 && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                <button
                  onClick={() => exportCSV(rows, 'sentimentiq_data')}
                  style={{
                    background:C.green+'18', border:`1px solid ${C.green}50`,
                    color:C.green, borderRadius:10, padding:'10px 20px',
                    fontSize:12, fontWeight:900, cursor:'pointer',
                    fontFamily:'inherit', letterSpacing:1,
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

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
              <div>
                <h1 style={{ fontSize:20, fontWeight:900, color:C.cyan, margin:0, letterSpacing:1 }}>Data Analysis</h1>
                <p style={{ fontSize:11, color:C.sub, margin:'4px 0 0' }}>Effective data and repetitive issues</p>
              </div>
              {rows.length > 0 && (
                <button
                  onClick={fetchAnalysis}
                  disabled={analysisLoading}
                  style={{
                    background:C.cyan+'18', border:`1px solid ${C.cyan}50`,
                    color:C.cyan, borderRadius:8, padding:'8px 16px',
                    fontSize:11, fontWeight:700, cursor:'pointer',
                    fontFamily:'inherit', opacity:analysisLoading ? 0.5 : 1,
                  }}
                >
                  {analysisLoading ? '⏳ Loading…' : '↺ Refresh Analysis'}
                </button>
              )}
            </div>

            {/* No data */}
            {rows.length === 0 && (
              <div style={{
                background:C.panel, border:`1px solid ${C.border}`,
                borderRadius:12, padding:'60px 20px', textAlign:'center',
              }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.sub, marginBottom:8 }}>No Data to Analyse</div>
                <div style={{ fontSize:12, color:C.dim, marginBottom:20 }}>Import data first from Data section</div>
                <button onClick={() => setPage('data')} style={{
                  background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
                  border:'none', borderRadius:10, padding:'12px 24px',
                  color:'#000', fontSize:13, fontWeight:900,
                  cursor:'pointer', fontFamily:'inherit',
                }}>Go to Data Section →</button>
              </div>
            )}

            {rows.length > 0 && (
              <>
                {/* ── Effective Data ── */}
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

                      {/* Export effective data bottom right */}
                      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
                        <button
                          onClick={() => exportCSV(effData, 'effective_data')}
                          style={{
                            background:C.green+'18', border:`1px solid ${C.green}50`,
                            color:C.green, borderRadius:10, padding:'10px 20px',
                            fontSize:12, fontWeight:900, cursor:'pointer',
                            fontFamily:'inherit', letterSpacing:1,
                            display:'flex', alignItems:'center', gap:8,
                          }}
                        >
                          ⬇ Export Effective Data
                          <span style={{ fontSize:10, fontWeight:400, color:C.dim }}>
                            ({effData.length.toLocaleString()} rows)
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Repetitive Issues ── */}
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
                      {/* Bar chart */}
                      <div style={{ marginBottom:20 }}>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={repBarData} layout="vertical"
                            margin={{ left:10, right:40, top:5, bottom:5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                            <XAxis type="number" stroke={C.dim} fontSize={10}/>
                            <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={10} width={120}/>
                            <Tooltip contentStyle={TT}
                              formatter={(v,n,p) => [`${v.toLocaleString()} tickets`, p.payload.fullName]}/>
                            <Bar dataKey="Count" fill={C.red} radius={[0,6,6,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Table */}
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
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.cyan, textAlign:'center', fontWeight:700, fontFamily:'monospace' }}>
                                  {issue.count.toLocaleString()}
                                </td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, textAlign:'center' }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                                    <div style={{ width:60, height:6, background:C.border, borderRadius:3 }}>
                                      <div style={{ width:`${Math.min(issue.percentage*2,100)}%`, height:'100%', background:C.violet, borderRadius:3 }}/>
                                    </div>
                                    <span style={{ color:C.violet, fontWeight:700, fontFamily:'monospace', fontSize:10 }}>
                                      {issue.percentage}%
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding:'8px 12px', border:`1px solid ${C.border}`, color:C.red, textAlign:'center', fontFamily:'monospace' }}>
                                  {issue.negative.toLocaleString()}
                                </td>
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

                      {/* Export issues bottom right */}
                      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
                        <button
                          onClick={() => exportCSV(
                            repIssues.map(i => ({
                              'Issue Type': i.issue,
                              'Count'     : i.count,
                              '% of Total': i.percentage+'%',
                              'Negative'  : i.negative,
                              'Negative %': i.neg_pct+'%',
                              'Positive'  : i.positive,
                            })),
                            'repetitive_issues'
                          )}
                          style={{
                            background:C.green+'18', border:`1px solid ${C.green}50`,
                            color:C.green, borderRadius:10, padding:'10px 20px',
                            fontSize:12, fontWeight:900, cursor:'pointer',
                            fontFamily:'inherit', letterSpacing:1,
                            display:'flex', alignItems:'center', gap:8,
                          }}
                        >
                          ⬇ Export Issues
                          <span style={{ fontSize:10, fontWeight:400, color:C.dim }}>
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
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:${C.dim}}
      `}</style>
    </div>
  )
}


Login.jsx:--


 import { useState } from 'react'

const C = {
  bg0:'#07090f', bg1:'#0d1117', bg2:'#161b22', panel:'#13181f',
  border:'#21262d', cyan:'#58a6ff', red:'#f85149', violet:'#bc8cff',
  text:'#e6edf3', sub:'#8b949e', dim:'#484f58',
}

const API = 'http://localhost:8000'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!username.trim()) {
      setError('Please enter your username')
      return
    }
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setLoading(true)

    try {
      // ── Call backend /auth/login API ─────────────────
      const response = await fetch(`${API}/auth/login`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Backend returned 401 — wrong credentials
        setError(data.detail || 'Invalid username or password')
        setLoading(false)
        return
      }

      // ── Login success ────────────────────────────────
      // Save token for future API calls
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Pass user to App.jsx
      onLogin(data.user)

    } catch (err) {
      // Backend not running
      setError(
        'Cannot connect to server. ' +
        'Make sure backend is running on port 8000.'
      )
      setLoading(false)
    }
  }

  const inp = {
    width:'100%', background:C.bg2,
    border:`1px solid ${C.border}`,
    borderRadius:9, padding:'12px 14px',
    color:C.text, fontSize:13,
    fontFamily:'inherit', outline:'none',
    boxSizing:'border-box', transition:'border-color .2s',
  }

  return (
    <div style={{
      minHeight:'100vh', background:C.bg0,
      display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column',
      fontFamily:"'IBM Plex Mono','Courier New',monospace",
      padding:20,
    }}>

      {/* Background grid */}
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage:`
          linear-gradient(${C.border}44 1px, transparent 1px),
          linear-gradient(90deg, ${C.border}44 1px, transparent 1px)
        `,
        backgroundSize:'40px 40px',
      }}/>
      <div style={{
        position:'fixed', top:'30%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:500, height:300,
        background:`radial-gradient(ellipse,${C.cyan}14 0%,transparent 70%)`,
        pointerEvents:'none', zIndex:0,
      }}/>

      {/* Login card */}
      <div style={{
        position:'relative', zIndex:1,
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:18, padding:'44px 44px 36px',
        width:'100%', maxWidth:420,
        boxShadow:`0 0 60px ${C.cyan}12`,
      }}>

        {/* Logo */}
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
          <div style={{
            fontSize:11, color:C.dim,
            marginTop:5, letterSpacing:1.5,
          }}>
           AI ANALYTICS PLATFORM
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display:'flex', flexDirection:'column', gap:18 }}
        >

          {/* Username */}
          <div>
            <label style={{
              display:'block', fontSize:11, color:C.sub,
              letterSpacing:1.5, fontWeight:700,
              marginBottom:8, textTransform:'uppercase',
            }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e=>setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              spellCheck={false}
              style={inp}
              onFocus={e=>(e.target.style.borderColor=C.cyan)}
              onBlur={e =>(e.target.style.borderColor=C.border)}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display:'block', fontSize:11, color:C.sub,
              letterSpacing:1.5, fontWeight:700,
              marginBottom:8, textTransform:'uppercase',
            }}>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPwd?'text':'password'}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...inp, paddingRight:44 }}
                onFocus={e=>(e.target.style.borderColor=C.cyan)}
                onBlur={e =>(e.target.style.borderColor=C.border)}
              />
              <button
                type="button"
                onClick={()=>setShowPwd(v=>!v)}
                style={{
                  position:'absolute', right:12, top:'50%',
                  transform:'translateY(-50%)',
                  background:'transparent', border:'none',
                  color:C.dim, cursor:'pointer', fontSize:16, padding:4,
                }}
              >{showPwd?'🙈':'👁️'}</button>
            </div>
          </div>

          {/* Error message from backend */}
          {error && (
            <div style={{
              background:C.red+'15',
              border:`1px solid ${C.red}40`,
              borderRadius:8, padding:'10px 13px',
              fontSize:12, color:C.red, fontWeight:600,
            }}>⚠ {error}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? C.dim
                : `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border:'none', borderRadius:10, padding:14,
              width:'100%',
              color: loading ? C.sub : '#000',
              fontSize:14, fontWeight:900,
              cursor: loading?'not-allowed':'pointer',
              fontFamily:'inherit', letterSpacing:1, marginTop:4,
            }}
          >
            {loading ? 'Signing in…' : 'SIGN IN →'}
          </button>
        </form>
      </div>

      <div style={{
            marginTop:8, fontSize:10,
            color:C.dim, letterSpacing:1,
          }}>
            v1.0.0 
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






Fileparser.jsx:-



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


App.css-:

.counter {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.hero {
  position: relative;

  .base,
  .framework,
  .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .framework,
  .vite {
    position: absolute;
  }

  .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
      scale(1.4);
  }

  .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
      scale(0.8);
  }
}

#center {
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
}

#next-steps {
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  & > div {
    flex: 1 1 0;
    padding: 32px;
    @media (max-width: 1024px) {
      padding: 24px 20px;
    }
  }

  .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
}

#docs {
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

#next-steps ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  .logo {
    height: 18px;
  }

  a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: var(--shadow);
    }
    .button-icon {
      height: 18px;
      width: 18px;
    }
  }

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }

    a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
}

#spacer {
  height: 88px;
  border-top: 1px solid var(--border);
  @media (max-width: 1024px) {
    height: 48px;
  }
}

.ticks {
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
}



App.jsx-"

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




Main.jsx:-

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)






Backend.py-:


# SENTIMENTIQ BACKEND — Complete Version
# ============================================================

import json
import os
import sqlite3

with open('config.json', 'r') as f:
    CONFIG = json.load(f)

print("\n" + "="*60)
print(f"   {CONFIG['app']['name']} BACKEND")
print(f"   {CONFIG['app']['company']} "
      f"· v{CONFIG['app']['version']}")
print("="*60 + "\n")

from fastapi import (
    FastAPI, UploadFile, File, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from services.db_service import (
    init_database,
    test_connection,
    get_latest_upload_id,
)
from services.auth_service import (
    authenticate_user,
    create_token,
    get_users_list,
    register_user,
)
from services.data_service import (
    process_upload,
    get_metrics,
    get_data,
    get_status,
    get_uploads_history,
    get_effective_data,
    get_repetitive_issues,
)

app = FastAPI(
    title   = CONFIG['app']['name'],
    version = CONFIG['app']['version'],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = CONFIG['cors']['allow_origins'],
    allow_methods = ["*"],
    allow_headers = ["*"],
)


@app.on_event("startup")
async def startup():
    print("[Backend] Starting up...")
    init_database()
    test_connection()
    print("[Backend] All systems ready!\n")


# ── Auth ──────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name    : str
    role    : str = 'Viewer'


@app.post("/auth/login")
def login(req: LoginRequest):
    user = authenticate_user(
        req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    token = create_token(user)
    return {
        "success": True,
        "token"  : token,
        "user"   : {
            "username": user['username'],
            "name"    : user['name'],
            "role"    : user['role'],
        },
        "message": f"Welcome {user['name']}!"
    }


@app.post("/auth/register")
def register(req: RegisterRequest):
    success = register_user(
        req.username, req.password,
        req.name, req.role
    )
    if not success:
        raise HTTPException(
            400, "User already exists!")
    return {
        "success": True,
        "message": f"User {req.username} created!"
    }


@app.get("/auth/users")
def list_users():
    return {"users": get_users_list()}


# ── Data ──────────────────────────────────────────────────
@app.post("/data/upload")
async def upload(
    file    : UploadFile = File(...),
    username: str = "unknown"
):
    try:
        contents = await file.read()
        result   = process_upload(
            contents    = contents,
            filename    = file.filename,
            uploaded_by = username,
        )
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        print(f"[Backend] Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))


@app.get("/data/metrics")
def metrics():
    try:
        return get_metrics()
    except Exception as e:
        print(f"[Backend] Metrics error: {e}")
        return {
            "total":0,"csat_pct":0,
            "dsat_pct":0,"neutral_pct":0
        }


@app.get("/data/rows")
def rows(limit: int = 5000,
         upload_id: Optional[str] = None):
    try:
        result = get_data(limit, upload_id)
        print(f"[Backend] Returning "
              f"{len(result.get('rows',[]))} rows")
        return result
    except Exception as e:
        print(f"[Backend] Rows error: {e}")
        return {"rows":[], "total":0}


@app.get("/data/uploads")
def uploads():
    try:
        history = get_uploads_history()
        return {"uploads":history,"total":len(history)}
    except Exception as e:
        return {"uploads":[],"total":0}


@app.get("/data/status")
def data_status():
    try:
        return get_status()
    except Exception as e:
        return {"data_loaded":False,"data_rows":0}


# ── NEW: Analysis Endpoints ───────────────────────────────
@app.get("/data/effective")
def effective_data(limit: int = 1000):
    """
    Returns Name, Email, Comments,
    Type_of_Data, Type_of_Issue columns
    """
    try:
        return get_effective_data(limit)
    except Exception as e:
        print(f"[Backend] Effective data error: {e}")
        return {"rows":[], "total":0}


@app.get("/data/repetitive")
def repetitive_issues():
    """
    Returns issues grouped by type
    with count and percentage
    """
    try:
        return get_repetitive_issues()
    except Exception as e:
        print(f"[Backend] Repetitive error: {e}")
        return {"issues":[], "total":0}


# ── System ────────────────────────────────────────────────
@app.get("/health")
def health():
    try:
        db_ok = test_connection()
        data  = get_status()
        return {
            "status"    : "running",
            "app"       : CONFIG['app']['name'],
            "version"   : CONFIG['app']['version'],
            "database"  : "SQLite sentimentiq.db",
            "db_ok"     : db_ok,
            "data_loaded": data['data_loaded'],
            "data_rows" : data['data_rows'],
        }
    except Exception as e:
        return {"status":"error","error":str(e)}


@app.get("/")
def root():
    return {
        "message": f"{CONFIG['app']['name']} running!",
        "docs"   : "http://localhost:8000/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend:app",
        host   = CONFIG['server']['host'],
        port   = CONFIG['server']['port'],
        reload = CONFIG['server']['reload'],
    )






config.js_;


{
  "app": {
    "name": "SentimentIQ",
    "version": "1.0.0",
    "company": "NTT Data"
  },

  "server": {
    "host": "0.0.0.0",
    "port": 8000,
    "reload": true
  },

  "cors": {
    "allow_origins": [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000"
    ]
  },

  "auth": {
    "secret_key": "sentimentiq_ntt_secret_2026",
    "token_expire_minutes": 480
  },

  "database": {
    "type": "sqlite",
    "path": "sentimentiq.db"
  }
}



auth_servis-:


# AUTH MICROSERVICE — Uses SQLite Database
# ============================================================

import hashlib
from datetime import datetime
from typing import Optional

from services.db_service import (
    get_user_by_username,
    get_all_users,
    add_user,
)

print("[AuthService] Auth microservice loaded")


def verify_password(plain: str,
                    stored: str) -> bool:
    return plain == stored


def authenticate_user(username: str,
                      password: str):
    """
    Authenticates user from SQLite database
    """
    print(f"[AuthService] Login attempt: {username}")

    user = get_user_by_username(username)

    if not user:
        print(f"[AuthService] Not found: {username}")
        return None

    if not verify_password(
        password, user['password']
    ):
        print(f"[AuthService] Wrong password!")
        return None

    print(f"[AuthService] Login success: "
          f"{username} ({user['role']})")
    return user


def create_token(user: dict) -> str:
    data  = (f"{user['username']}:"
             f"{user['role']}:"
             f"{datetime.now()}")
    token = hashlib.sha256(
        data.encode()
    ).hexdigest()
    return token


def get_users_list():
    return get_all_users()


def register_user(username, password,
                  name, role='Viewer'):
    return add_user(username, password,
                    name, role)






data_service.py;-




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





db_service.py:-


# ============================================================
# DATABASE SERVICE — SQLite
# ============================================================

import sqlite3
import json
import os
from datetime import datetime, date

# ── Load config ───────────────────────────────────────────
def load_config():
    config_path = os.path.join(
        os.path.dirname(__file__),
        '..', 'config.json'
    )
    with open(config_path, 'r') as f:
        return json.load(f)

CONFIG  = load_config()
DB_PATH = os.path.join(
    os.path.dirname(__file__),
    '..',
    CONFIG['database']['path']
)

print(f"[DBService] SQLite: {DB_PATH}")


# ── Make any value JSON safe ──────────────────────────────
def clean_row(row: dict) -> dict:
    """
    Converts all values to JSON
    serializable types
    Handles pandas Timestamp, numpy etc.
    """
    clean = {}
    for key, val in row.items():
        try:
            json.dumps(val)
            clean[str(key)] = val
        except (TypeError, ValueError):
            clean[str(key)] = str(val)
    return clean


# ── Get connection ─────────────────────────────────────────
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Create tables on startup ───────────────────────────────
def init_database():
    """
    Creates tables if not exist
    Adds default users if empty
    Runs on every startup!
    """
    conn   = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY
                       AUTOINCREMENT,
            username   TEXT UNIQUE NOT NULL,
            password   TEXT NOT NULL,
            name       TEXT NOT NULL,
            role       TEXT NOT NULL
                       DEFAULT 'Viewer',
            is_active  INTEGER DEFAULT 1,
            created_at TEXT DEFAULT
                       (datetime('now'))
        )
    """)

    # Feedback data table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback_data (
            id          INTEGER PRIMARY KEY
                        AUTOINCREMENT,
            upload_id   TEXT NOT NULL,
            filename    TEXT NOT NULL,
            uploaded_by TEXT NOT NULL,
            uploaded_at TEXT DEFAULT
                        (datetime('now')),
            row_data    TEXT NOT NULL
        )
    """)

    # Add default users if table empty
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]

    if count == 0:
        print("[DBService] Adding default users...")
        default_users = [
            ('om.badoni',  'NTT@2026',
             'Om Badoni',   'Developer'),
            ('manager',    'Manager@2026',
             'NTT Manager', 'Manager'),
            ('admin',      'Admin@2026',
             'Admin User',  'Admin'),
        ]
        cursor.executemany("""
            INSERT INTO users
                (username, password, name, role)
            VALUES (?, ?, ?, ?)
        """, default_users)
        print("[DBService] Default users added!")

    conn.commit()
    conn.close()
    print("[DBService] Database initialized!")


# ── Test connection ────────────────────────────────────────
def test_connection() -> bool:
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        print("[DBService] SQLite connected!")
        return True
    except Exception as e:
        print(f"[DBService] Error: {e}")
        return False


# ============================================================
# USER OPERATIONS
# ============================================================

def get_user_by_username(username: str):
    """Fetch user from DB by username"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, username, password,
                   name, role, is_active
            FROM   users
            WHERE  username  = ?
            AND    is_active = 1
        """, (username,))

        row = cursor.fetchone()
        conn.close()

        if row:
            print(f"[DBService] User found: "
                  f"{username}")
            return dict(row)

        print(f"[DBService] User not found: "
              f"{username}")
        return None

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return None


def get_all_users():
    """Returns all active users without passwords"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, username, name,
                   role, created_at
            FROM   users
            WHERE  is_active = 1
            ORDER  BY created_at ASC
        """)

        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def add_user(username, password,
             name, role='Viewer'):
    """Add new user to database"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO users
                (username, password, name, role)
            VALUES (?, ?, ?, ?)
        """, (username, password, name, role))

        conn.commit()
        conn.close()
        print(f"[DBService] User added: {username}")
        return True

    except sqlite3.IntegrityError:
        print(f"[DBService] User exists: {username}")
        return False
    except Exception as e:
        print(f"[DBService] Error: {e}")
        return False


def deactivate_user(username: str):
    """Disable user without deleting"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE users
            SET    is_active = 0
            WHERE  username  = ?
        """, (username,))

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return False


# ============================================================
# DATA OPERATIONS
# ============================================================

def save_upload(rows: list,
                filename: str,
                uploaded_by: str,
                upload_id: str):
    """
    Save uploaded rows to SQLite

    ── KEY FIX ──────────────────────────────
    Deletes ALL old data before saving new!
    DB always has only LATEST import!
    No duplicates ever!
    ─────────────────────────────────────────
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # ── DELETE OLD DATA FIRST! ────────
        cursor.execute(
            "DELETE FROM feedback_data"
        )
        deleted = cursor.rowcount
        if deleted > 0:
            print(f"[DBService] Cleared "
                  f"{deleted} old rows from DB")
        # ─────────────────────────────────

        # Clean and prepare batch
        batch = []
        for row in rows:
            try:
                cleaned = clean_row(row)
                batch.append((
                    upload_id,
                    filename,
                    uploaded_by,
                    json.dumps(cleaned)
                ))
            except Exception as e:
                print(f"[DBService] Row skip: {e}")
                continue

        # Insert all new rows at once
        cursor.executemany("""
            INSERT INTO feedback_data
                (upload_id, filename,
                 uploaded_by, row_data)
            VALUES (?, ?, ?, ?)
        """, batch)

        conn.commit()
        conn.close()

        print(f"[DBService] Saved {len(batch)} "
              f"rows → sentimentiq.db")
        return True

    except Exception as e:
        print(f"[DBService] Save error: {e}")
        return False


def get_upload_rows(upload_id: str,
                    limit: int = 10000):
    """Get rows for specific upload"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT row_data
            FROM   feedback_data
            WHERE  upload_id = ?
            LIMIT  ?
        """, (upload_id, limit))

        rows = cursor.fetchall()
        conn.close()

        return [
            json.loads(r['row_data'])
            for r in rows
        ]

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def get_all_uploads():
    """Get history of all uploaded files"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                upload_id,
                filename,
                uploaded_by,
                uploaded_at,
                COUNT(*) as row_count
            FROM  feedback_data
            GROUP BY
                upload_id,
                filename,
                uploaded_by,
                uploaded_at
            ORDER BY uploaded_at DESC
        """)

        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def get_latest_upload_id():
    """Get most recent upload_id"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT upload_id
            FROM   feedback_data
            ORDER  BY uploaded_at DESC
            LIMIT  1
        """)

        result = cursor.fetchone()
        conn.close()
        return result['upload_id'] if result else None

    except Exception as e:
        return None


def delete_upload(upload_id: str):
    """Delete rows for specific upload"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM feedback_data
            WHERE upload_id = ?
        """, (upload_id,))

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"[DBService] Delete error: {e}")
        return False

