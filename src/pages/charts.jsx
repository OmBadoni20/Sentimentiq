import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const C = {
  bg0: "#07090f",
  bg1: "#0d1117",
  bg2: "#161b22",
  panel: "#13181f",
  border: "#21262d",
  cyan: "#58a6ff",
  green: "#3fb950",
  red: "#f85149",
  amber: "#d29922",
  violet: "#bc8cff",
  sky: "#79c0ff",
  text: "#e6edf3",
  sub: "#8b949e",
  dim: "#484f58",
};

const TT = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 11,
  color: C.text,
};

function findCol(row, ...names) {
  const keys = Object.keys(row);
  for (const name of names) {
    const f = keys.find(
      (k) =>
        k.trim().toLowerCase().replace(/\s+/g, "") ===
        name.toLowerCase().replace(/\s+/g, ""),
    );
    if (f) return f;
  }
  return null;
}

// KEY FIX — handles number 1, string "1", true, "yes"
function isTrue(val) {
  if (val === null || val === undefined) return false;
  return (
    val === 1 ||
    val === true ||
    String(val).trim().toLowerCase() === "1" ||
    String(val).trim().toLowerCase() === "true" ||
    String(val).trim().toLowerCase() === "yes"
  );
}

function calcMetrics(rows) {
  if (!rows || !rows.length) return null;

  const s = rows[0];

  const csatCol = findCol(
    s,
    "ISHAPPY",
    "IsHappy",
    "ishappy",
    "is_happy",
    "CSAT",
    "csat",
    "Csat",
  );
  const dsatCol = findCol(
    s,
    "ISSAD",
    "IsSad",
    "issad",
    "is_sad",
    "DSAT",
    "dsat",
    "Dsat",
  );
  const passiveCol = findCol(
    s,
    "ISPASSIVE",
    "IsPassive",
    "ispassive",
    "is_passive",
  );
  const slaCol = findCol(
    s,
    "SLA_Breached",
    "SLABreached",
    "sla_breached",
    "SLA Breached",
  );
  const sentCol = findCol(
    s,
    "Predicted_Sentiment",
    "predicted_sentiment",
    "Sentiment",
    "sentiment",
  );
  const npsScoreCol = findCol(
    s,
    "MAIN SCORE",
    "MainScore",
    "main_score",
    "mainscore",
    "NPS_Score",
    "nps_score",
    "NPS Score",
    "nps",
  );
  const npsCatCol = findCol(s, "NPS_Category", "nps_category", "NPS Category");
  const deptCol = findCol(
    s,
    "TEAM",
    "Team",
    "team",
    "Department",
    "department",
  );
  const indCol = findCol(
    s,
    "REGION",
    "Region",
    "region",
    "Industry",
    "industry",
  );
  const priCol = findCol(s, "Priority", "priority", "PRIORITY");
  const projCol = findCol(
    s,
    "ASSIGNMENT GROUP",
    "AssignmentGroup",
    "assignment_group",
    "ASSIGNMENTGROUP",
    "SurveyAssigneeGroup",
    "surveyassigneegroup",
    "Project_Type",
    "Issue_Category",
    "issue_category",
  );

  console.log("=== CHARTS COLUMNS ===");
  console.log("All columns:", Object.keys(s));
  console.log("csatCol:", csatCol, "→", s[csatCol], typeof s[csatCol]);
  console.log("dsatCol:", dsatCol, "→", s[dsatCol], typeof s[dsatCol]);
  console.log("passiveCol:", passiveCol, "→", s[passiveCol]);
  console.log("npsScoreCol:", npsScoreCol, "→", s[npsScoreCol]);
  console.log("deptCol:", deptCol, "→", s[deptCol]);
  console.log("indCol:", indCol, "→", s[indCol]);

  let csatN = 0,
    dsatN = 0,
    slaY = 0,
    slaN = 0;
  let posN = 0,
    negN = 0,
    neuN = 0;
  let promoter = 0,
    passive = 0,
    detractor = 0;

  const byDept = {},
    byInd = {},
    byPri = {},
    byProj = {};
  const npsScores = [];

  rows.forEach((r) => {
    const cv = r[csatCol];
    const dv = r[dsatCol];
    const pv = r[passiveCol];

    if (csatCol && isTrue(cv)) csatN++;
    if (dsatCol && isTrue(dv)) dsatN++;

    if (slaCol) {
      const sv = String(r[slaCol] ?? "")
        .trim()
        .toLowerCase();
      if (sv === "yes" || sv === "1" || sv === "true") slaY++;
      else slaN++;
    }

    // Sentiment
    if (sentCol) {
      const sv = String(r[sentCol] ?? "")
        .trim()
        .toLowerCase();
      if (sv === "positive") posN++;
      else if (sv === "negative") negN++;
      else if (sv === "neutral") neuN++;
    } else {
      if (isTrue(cv)) posN++;
      else if (isTrue(dv)) negN++;
      else if (isTrue(pv)) neuN++;
    }

    // NPS Category
    if (npsCatCol) {
      const v = String(r[npsCatCol] ?? "").trim();
      if (v === "Promoter") promoter++;
      else if (v === "Passive") passive++;
      else if (v === "Detractor") detractor++;
    } else if (npsScoreCol) {
      const n = parseFloat(r[npsScoreCol]);
      if (!isNaN(n)) {
        if (n >= 9) promoter++;
        else if (n >= 7) passive++;
        else detractor++;
      }
    }

    // NPS Score
    if (npsScoreCol) {
      const n = parseFloat(r[npsScoreCol]);
      if (!isNaN(n)) npsScores.push(Math.round(n));
    }

    // TEAM
    if (deptCol) {
      const k = String(r[deptCol] ?? "").trim();
      if (k) {
        if (!byDept[k]) byDept[k] = { name: k, csat: 0, dsat: 0, total: 0 };
        byDept[k].total++;
        if (isTrue(cv)) byDept[k].csat++;
        if (isTrue(dv)) byDept[k].dsat++;
      }
    }

    // REGION
    if (indCol) {
      const k = String(r[indCol] ?? "").trim();
      if (k) {
        if (!byInd[k]) byInd[k] = { name: k, csat: 0, dsat: 0, total: 0 };
        byInd[k].total++;
        if (isTrue(cv)) byInd[k].csat++;
        if (isTrue(dv)) byInd[k].dsat++;
      }
    }

    // Priority
    if (priCol) {
      const k = String(r[priCol] ?? "").trim();
      if (k) {
        if (!byPri[k]) byPri[k] = { name: k, breach: 0, ok: 0 };
        if (
          slaCol &&
          String(r[slaCol] ?? "")
            .trim()
            .toLowerCase() === "yes"
        )
          byPri[k].breach++;
        else byPri[k].ok++;
      }
    }

    // Assignment Group
    if (projCol) {
      const k = String(r[projCol] ?? "").trim();
      if (k) {
        if (!byProj[k]) byProj[k] = { name: k, count: 0 };
        byProj[k].count++;
      }
    }
  });

  console.log("=== RESULTS ===");
  console.log("csatN:", csatN, "dsatN:", dsatN);
  console.log("posN:", posN, "negN:", negN, "neuN:", neuN);
  console.log(
    "promoter:",
    promoter,
    "passive:",
    passive,
    "detractor:",
    detractor,
  );

  const total = rows.length;
  const pct = (n) => (total ? parseFloat(((n / total) * 100).toFixed(1)) : 0);

  return {
    total,
    csatN,
    dsatN,
    slaY,
    slaN,
    posN,
    negN,
    neuN,
    promoter,
    passive,
    detractor,
    csatPct: pct(csatN),
    dsatPct: pct(dsatN),
    slaPct: pct(slaY),
    posPct: pct(posN),
    negPct: pct(negN),
    neuPct: pct(neuN),

    deptData: Object.values(byDept)
      .map((d) => ({
        name: d.name,
        "CSAT%": d.total
          ? parseFloat(((d.csat / d.total) * 100).toFixed(1))
          : 0,
        "DSAT%": d.total
          ? parseFloat(((d.dsat / d.total) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b["CSAT%"] - a["CSAT%"])
      .slice(0, 10),

    indData: Object.values(byInd)
      .map((d) => ({
        name: d.name,
        "CSAT%": d.total
          ? parseFloat(((d.csat / d.total) * 100).toFixed(1))
          : 0,
        "DSAT%": d.total
          ? parseFloat(((d.dsat / d.total) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b["CSAT%"] - a["CSAT%"])
      .slice(0, 10),

    priData: Object.values(byPri)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => ({
        name: d.name,
        "SLA Breach": d.breach,
        Compliant: d.ok,
      })),

    projData: Object.values(byProj)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),

    npsDistrib: Array.from({ length: 11 }, (_, i) => ({
      score: String(i),
      count: npsScores.filter((s) => s === i).length,
    })),
  };
}

function ChartBox({ title, sub, children }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.text,
          marginBottom: 2,
        }}
      >
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
  );
}

function KPI({ label, value, accent }) {
  return (
    <div
      style={{
        background: accent + "12",
        border: `1px solid ${accent}30`,
        borderRadius: 10,
        padding: "14px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: accent,
          fontFamily: "monospace",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: C.sub,
          marginTop: 4,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

const PIE_LABEL = ({ percent }) =>
  percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "";

export default function Charts({ rows, user, onBack, onLogout }) {
  const m = useMemo(() => calcMetrics(rows), [rows]);

  const ROLE_COLOR = { Admin: C.red, Manager: C.amber, Developer: C.cyan };
  const roleColor = ROLE_COLOR[user?.role] || C.violet;

  if (!m) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          fontFamily: "monospace",
          color: C.text,
        }}
      >
        <div style={{ fontSize: 48 }}>📊</div>
        <div style={{ fontSize: 16, color: C.amber }}>No data to display</div>
        <button
          onClick={onBack}
          style={{
            background: C.cyan,
            border: "none",
            borderRadius: 9,
            padding: "10px 24px",
            color: "#000",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Back to Data
        </button>
      </div>
    );
  }

  const sentPie = [
    { name: "Positive", value: m.posN },
    { name: "Negative", value: m.negN },
    { name: "Neutral", value: m.neuN },
  ];
  const csatPie = [
    { name: `Satisfied (${m.csatPct}%)`, value: m.csatN },
    {
      name: `Unsatisfied (${parseFloat((100 - m.csatPct).toFixed(1))}%)`,
      value: m.total - m.csatN,
    },
  ];
  const dsatPie = [
    { name: `Dissatisfied (${m.dsatPct}%)`, value: m.dsatN },
    {
      name: `OK (${parseFloat((100 - m.dsatPct).toFixed(1))}%)`,
      value: m.total - m.dsatN,
    },
  ];
  const npsPie = [
    { name: "Promoter", value: m.promoter },
    { name: "Passive", value: m.passive },
    { name: "Detractor", value: m.detractor },
  ];
  const slaPie = [
    { name: `Breached (${m.slaPct}%)`, value: m.slaY },
    {
      name: `Compliant (${parseFloat((100 - m.slaPct).toFixed(1))}%)`,
      value: m.slaN,
    },
  ];
  const overviewBar = [
    { name: "CSAT%", value: m.csatPct },
    { name: "DSAT%", value: m.dsatPct },
    { name: "SLA Breach%", value: m.slaPct },
    { name: "Positive%", value: m.posPct },
    { name: "Negative%", value: m.negPct },
    { name: "Neutral%", value: m.neuPct },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg0,
        color: C.text,
        fontFamily: "'IBM Plex Mono','Courier New',monospace",
      }}
    >
      {/* header */}
      <header
        style={{
          background: C.bg1,
          borderBottom: `1px solid ${C.border}`,
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 14,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
            }}
          >
            ⚡
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: C.cyan,
                letterSpacing: 2,
              }}
            >
              SENTIMENTIQ
            </div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1.5 }}>
              NTT DATA · AI PLATFORM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginLeft: 16 }}>
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.sub,
              borderRadius: 7,
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            📋 Data
          </button>
          <div
            style={{
              background: C.cyan + "18",
              border: `1px solid ${C.cyan}50`,
              color: C.cyan,
              borderRadius: 7,
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            📊 Charts
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            background: C.dim + "18",
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            padding: "4px 12px",
            fontSize: 10,
            color: C.sub,
          }}
        >
          {m.total.toLocaleString()} rows
        </div>

        <div
          style={{
            background: roleColor + "12",
            border: `1px solid ${roleColor}40`,
            borderRadius: 7,
            padding: "4px 12px",
            fontSize: 10,
            color: roleColor,
            fontWeight: 700,
          }}
        >
          👤 {user?.name}
          <span style={{ color: C.dim, fontWeight: 400 }}> · {user?.role}</span>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: C.red + "15",
            border: `1px solid ${C.red}40`,
            color: C.red,
            borderRadius: 7,
            padding: "5px 14px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sign Out
        </button>
      </header>

      <main style={{ padding: "22px 24px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: C.cyan,
              margin: 0,
              letterSpacing: 1,
            }}
          >
            Charts & Analytics
          </h1>
          <p style={{ fontSize: 12, color: C.sub, margin: "4px 0 0" }}>
            {m.total.toLocaleString()} records · ISHAPPY=CSAT · ISSAD=DSAT ·
            TEAM=Department · REGION=Industry
          </p>
        </div>

        {/* KPI row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6,1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <KPI label="Total" value={m.total.toLocaleString()} accent={C.sky} />
          <KPI label="CSAT" value={`${m.csatPct}%`} accent={C.green} />
          <KPI label="DSAT" value={`${m.dsatPct}%`} accent={C.red} />
          <KPI label="SLA Breach" value={`${m.slaPct}%`} accent={C.amber} />
          <KPI label="Positive" value={`${m.posPct}%`} accent={C.green} />
          <KPI label="Negative" value={`${m.negPct}%`} accent={C.red} />
        </div>

        {/* Row 1 — 3 pies */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <ChartBox
            title="Sentiment Distribution"
            sub={`Positive: ${m.posN} · Negative: ${m.negN} · Neutral: ${m.neuN}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={sentPie}
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                  innerRadius={32}
                  dataKey="value"
                  paddingAngle={3}
                  label={PIE_LABEL}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.green} />
                  <Cell fill={C.red} />
                  <Cell fill={C.amber} />
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="CSAT Breakdown"
            sub={`${m.csatN.toLocaleString()} satisfied (ISHAPPY=1) of ${m.total.toLocaleString()}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={csatPie}
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                  innerRadius={32}
                  dataKey="value"
                  paddingAngle={3}
                  label={PIE_LABEL}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.green} />
                  <Cell fill={C.border} />
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox
            title="DSAT Breakdown"
            sub={`${m.dsatN.toLocaleString()} dissatisfied (ISSAD=1) of ${m.total.toLocaleString()}`}
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={dsatPie}
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                  innerRadius={32}
                  dataKey="value"
                  paddingAngle={3}
                  label={PIE_LABEL}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.red} />
                  <Cell fill={C.border} />
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* Row 2 — NPS + SLA */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <ChartBox
            title="NPS Category Distribution"
            sub={`Promoters: ${m.promoter} · Passives: ${m.passive} · Detractors: ${m.detractor}`}
          >
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={npsPie}
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  innerRadius={36}
                  dataKey="value"
                  paddingAngle={3}
                  label={PIE_LABEL}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.cyan} />
                  <Cell fill={C.violet} />
                  <Cell fill={C.red} />
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend
                  iconType="circle"
                  iconSize={8}
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
                  data={slaPie}
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  innerRadius={36}
                  dataKey="value"
                  paddingAngle={3}
                  label={PIE_LABEL}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  <Cell fill={C.red} />
                  <Cell fill={C.green} />
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: C.sub }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* Row 3 — Overview bar */}
        <div style={{ marginBottom: 14 }}>
          <ChartBox
            title="All Metrics Overview"
            sub="CSAT · DSAT · SLA · Positive · Negative · Neutral percentage"
          >
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={overviewBar} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" stroke={C.dim} fontSize={10} />
                <YAxis
                  stroke={C.dim}
                  fontSize={10}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip contentStyle={TT} formatter={(v) => [`${v}%`]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {overviewBar.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        [C.green, C.red, C.amber, C.green, C.red, C.amber][i]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>

        {/* Row 4 — NPS Score Distribution */}
        {m.npsDistrib.some((d) => d.count > 0) && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="NPS / Main Score Distribution (0–10)"
              sub="Green = Promoter (9-10) · Blue = Passive (7-8) · Red = Detractor (0-6)"
            >
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={m.npsDistrib} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="score" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={10} />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {m.npsDistrib.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          parseInt(d.score) >= 9
                            ? C.green
                            : parseInt(d.score) >= 7
                              ? C.cyan
                              : C.red
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 5 — TEAM */}
        {m.deptData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="CSAT% and DSAT% by Team"
              sub="Which teams have highest satisfaction and dissatisfaction"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={m.deptData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="name"
                    stroke={C.dim}
                    fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis stroke={C.dim} fontSize={10} unit="%" />
                  <Tooltip contentStyle={TT} formatter={(v) => [`${v}%`]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="CSAT%" fill={C.green} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="DSAT%" fill={C.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 6 — REGION */}
        {m.indData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="CSAT% and DSAT% by Region"
              sub="Which regions have highest satisfaction and dissatisfaction"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={m.indData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="name"
                    stroke={C.dim}
                    fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke={C.dim} fontSize={10} unit="%" />
                  <Tooltip contentStyle={TT} formatter={(v) => [`${v}%`]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="CSAT%" fill={C.cyan} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="DSAT%" fill={C.violet} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 7 — Priority SLA */}
        {m.priData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="SLA Breach by Priority"
              sub="Breached vs Compliant per priority level"
            >
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={m.priData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={10} />
                  <Tooltip contentStyle={TT} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="SLA Breach"
                    fill={C.red}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Compliant"
                    fill={C.green}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        {/* Row 8 — Assignment Groups */}
        {m.projData.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ChartBox
              title="Top Assignment Groups / Issue Categories"
              sub="Most frequent ticket groups"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={m.projData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis type="number" stroke={C.dim} fontSize={10} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={C.dim}
                    fontSize={10}
                    width={160}
                  />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="count" fill={C.violet} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
        )}

        <div style={{ textAlign: "center", paddingBottom: 48, paddingTop: 10 }}>
          <button
            onClick={onBack}
            style={{
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border: "none",
              borderRadius: 9,
              padding: "11px 36px",
              color: "#000",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
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
  );
}
