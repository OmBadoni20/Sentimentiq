import { useState, useEffect } from "react";

const API = "http://localhost:8000";

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

const PRIORITY_COLOR = { P1: C.red, P2: C.amber, P3: C.sky, P4: C.dim };
const SEVERITY_COLOR = { High: C.red, Medium: C.amber, Low: C.sky };

export default function Operations({ token }) {
  const [tab, setTab] = useState("tickets");
  const [tickets, setTickets] = useState([]);
  const [tStats, setTStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReport, setViewReport] = useState(null);

  const H = { Authorization: `Bearer ${token}` };

  async function loadAll() {
    setLoading(true);
    try {
      const [t, a, r] = await Promise.all([
        fetch(`${API}/tickets`, { headers: H }).then((x) => x.json()),
        fetch(`${API}/alerts`, { headers: H }).then((x) => x.json()),
        fetch(`${API}/reports`, { headers: H }).then((x) => x.json()),
      ]);
      setTickets(t.tickets || []);
      setTStats(t.stats || null);
      setAlerts(a.alerts || []);
      setReports(r.reports || []);
    } catch (e) {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function setTicketStatus(ticket_id, status) {
    await fetch(`${API}/tickets/status`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id, status }),
    });
    loadAll();
  }

  async function resolveAlert(id) {
    await fetch(`${API}/alerts/resolve/${id}`, { method: "POST", headers: H });
    loadAll();
  }

  async function openReport(id) {
    const r = await fetch(`${API}/reports/${id}`, { headers: H }).then((x) =>
      x.json(),
    );
    setViewReport(r);
  }

  async function delReport(id) {
    await fetch(`${API}/reports/${id}`, { method: "DELETE", headers: H });
    loadAll();
  }

  const TABS = [
    {
      id: "tickets",
      icon: "🎫",
      label: "Tickets",
      count: tickets.length,
      color: C.cyan,
    },
    {
      id: "alerts",
      icon: "🚨",
      label: "Alerts",
      count: alerts.filter((a) => a.status === "Active").length,
      color: C.red,
    },
    {
      id: "reports",
      icon: "📄",
      label: "Reports",
      count: reports.length,
      color: C.violet,
    },
  ];

  const th = {
    padding: "10px 12px",
    background: C.bg1,
    border: `1px solid ${C.border}`,
    color: C.sub,
    fontWeight: 700,
    textAlign: "left",
    whiteSpace: "nowrap",
    fontSize: 10,
    letterSpacing: 0.5,
  };
  const td = {
    padding: "8px 12px",
    border: `1px solid ${C.border}`,
    fontSize: 11,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ padding: "24px", fontFamily: "'IBM Plex Mono',monospace" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: C.cyan,
              margin: 0,
              letterSpacing: 1,
            }}
          >
            Operations
          </h1>
          <p style={{ fontSize: 11, color: C.sub, margin: "4px 0 0" }}>
            Live records created by your AI agents
          </p>
        </div>
        <button
          onClick={loadAll}
          style={{
            background: C.cyan + "18",
            border: `1px solid ${C.cyan}50`,
            color: C.cyan,
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ↺ Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.cyan}33`,
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.sub,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Tickets Created
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.cyan }}>
            {tickets.length}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
            {tStats?.by_status?.Open || 0} open ·{" "}
            {tStats?.by_status?.Resolved || 0} resolved
          </div>
        </div>
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.red}33`,
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.sub,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Active Alerts
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.red }}>
            {alerts.filter((a) => a.status === "Active").length}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
            {alerts.length} total raised
          </div>
        </div>
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.violet}33`,
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.sub,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Reports Saved
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.violet }}>
            {reports.length}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
            by Research agent
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? `${t.color}18` : C.bg2,
              border: `1px solid ${tab === t.id ? t.color + "60" : C.border}`,
              borderRadius: 10,
              padding: "10px 18px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: tab === t.id ? t.color : C.sub,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {t.icon} {t.label}
            <span
              style={{
                background: t.color + "25",
                color: t.color,
                borderRadius: 10,
                padding: "1px 8px",
                fontSize: 10,
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: C.amber }}>
          ⏳ Loading...
        </div>
      )}

      {/* TICKETS TAB */}
      {!loading && tab === "tickets" && (
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          {tickets.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: C.dim,
                fontSize: 11,
              }}
            >
              No tickets yet. Go to AI Agents → Smart Ticket Routing → report an
              IT issue.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Ticket ID",
                      "Issue",
                      "Category",
                      "Priority",
                      "Team",
                      "Status",
                      "Created",
                      "Action",
                    ].map((h) => (
                      <th key={h} style={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t, i) => (
                    <tr
                      key={i}
                      style={{
                        background: i % 2 === 0 ? "transparent" : C.bg2 + "50",
                      }}
                    >
                      <td style={{ ...td, color: C.cyan, fontWeight: 700 }}>
                        {t.ticket_id}
                      </td>
                      <td
                        style={{
                          ...td,
                          color: C.text,
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={t.issue}
                      >
                        {t.issue}
                      </td>
                      <td style={{ ...td, color: C.sub }}>{t.category}</td>
                      <td style={td}>
                        <span
                          style={{
                            background:
                              (PRIORITY_COLOR[t.priority] || C.dim) + "20",
                            color: PRIORITY_COLOR[t.priority] || C.dim,
                            borderRadius: 20,
                            padding: "2px 8px",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ ...td, color: C.amber }}>{t.team}</td>
                      <td style={td}>
                        <span
                          style={{
                            background:
                              (t.status === "Resolved" ? C.green : C.amber) +
                              "20",
                            color: t.status === "Resolved" ? C.green : C.amber,
                            borderRadius: 20,
                            padding: "2px 8px",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ ...td, color: C.dim, fontSize: 10 }}>
                        {t.created_at}
                      </td>
                      <td style={td}>
                        {t.status !== "Resolved" ? (
                          <button
                            onClick={() =>
                              setTicketStatus(t.ticket_id, "Resolved")
                            }
                            style={{
                              background: C.green + "18",
                              border: `1px solid ${C.green}50`,
                              color: C.green,
                              borderRadius: 6,
                              padding: "3px 10px",
                              fontSize: 9,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontWeight: 700,
                            }}
                          >
                            Resolve
                          </button>
                        ) : (
                          <button
                            onClick={() => setTicketStatus(t.ticket_id, "Open")}
                            style={{
                              background: C.amber + "18",
                              border: `1px solid ${C.amber}50`,
                              color: C.amber,
                              borderRadius: 6,
                              padding: "3px 10px",
                              fontSize: 9,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontWeight: 700,
                            }}
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ALERTS TAB */}
      {!loading && tab === "alerts" && (
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          {alerts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: C.dim,
                fontSize: 11,
              }}
            >
              No alerts yet. Go to AI Agents → Employee Sentiment Analysis → ask
              it to flag teams below target.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alerts.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: C.bg2,
                    border: `1px solid ${SEVERITY_COLOR[a.severity] || C.dim}40`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    opacity: a.status === "Resolved" ? 0.5 : 1,
                  }}
                >
                  <div style={{ fontSize: 20 }}>
                    {a.severity === "High"
                      ? "🔴"
                      : a.severity === "Medium"
                        ? "🟡"
                        : "🔵"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 12, fontWeight: 700, color: C.text }}
                    >
                      {a.entity} — {a.metric} {a.value}% (target {a.target}%)
                    </div>
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>
                      {a.message}
                    </div>
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>
                      {a.created_at}
                    </div>
                  </div>
                  <span
                    style={{
                      background: (SEVERITY_COLOR[a.severity] || C.dim) + "20",
                      color: SEVERITY_COLOR[a.severity] || C.dim,
                      borderRadius: 20,
                      padding: "2px 10px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {a.severity}
                  </span>
                  {a.status === "Active" ? (
                    <button
                      onClick={() => resolveAlert(a.id)}
                      style={{
                        background: C.green + "18",
                        border: `1px solid ${C.green}50`,
                        color: C.green,
                        borderRadius: 6,
                        padding: "4px 12px",
                        fontSize: 9,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: 700,
                      }}
                    >
                      Resolve
                    </button>
                  ) : (
                    <span
                      style={{ fontSize: 10, color: C.green, fontWeight: 700 }}
                    >
                      ✓ Resolved
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REPORTS TAB */}
      {!loading && tab === "reports" && (
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          {reports.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: C.dim,
                fontSize: 11,
              }}
            >
              No reports yet. Go to AI Agents → Research and Reporting →
              generate a report.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reports.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: C.bg2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ fontSize: 20 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 12, fontWeight: 700, color: C.text }}
                    >
                      {r.title}
                    </div>
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>
                      {r.report_type} · {r.created_at} · by {r.created_by}
                    </div>
                  </div>
                  <button
                    onClick={() => openReport(r.id)}
                    style={{
                      background: C.violet + "18",
                      border: `1px solid ${C.violet}50`,
                      color: C.violet,
                      borderRadius: 6,
                      padding: "4px 12px",
                      fontSize: 9,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 700,
                    }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => delReport(r.id)}
                    style={{
                      background: C.red + "18",
                      border: `1px solid ${C.red}50`,
                      color: C.red,
                      borderRadius: 6,
                      padding: "4px 12px",
                      fontSize: 9,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 700,
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report viewer modal */}
      {viewReport && (
        <div
          onClick={() => setViewReport(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bg1,
              border: `1px solid ${C.violet}50`,
              borderRadius: 14,
              maxWidth: 800,
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.violet }}>
                  {viewReport.title}
                </div>
                <div style={{ fontSize: 10, color: C.dim }}>
                  {viewReport.report_type} · {viewReport.created_at}
                </div>
              </div>
              <button
                onClick={() => setViewReport(null)}
                style={{
                  background: C.red + "18",
                  border: `1px solid ${C.red}50`,
                  color: C.red,
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 700,
                }}
              >
                ✕ Close
              </button>
            </div>
            <div
              style={{
                padding: 20,
                overflowY: "auto",
                fontSize: 11,
                color: C.text,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {viewReport.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
