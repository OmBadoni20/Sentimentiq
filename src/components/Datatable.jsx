import { useState, useMemo } from "react";

const PAGE_SIZE = 200;

const C = {
  bg0: "#07090f",
  bg2: "#161b22",
  panel: "#13181f",
  border: "#21262d",
  cyan: "#58a6ff",
  green: "#3fb950",
  red: "#f85149",
  amber: "#d29922",
  violet: "#bc8cff",
  text: "#e6edf3",
  sub: "#8b949e",
  dim: "#484f58",
};

const BADGE_MAP = {
  Positive: { bg: "#3fb95018", c: "#3fb950", bd: "#3fb95040" },
  Negative: { bg: "#f8514918", c: "#f85149", bd: "#f8514940" },
  Neutral: { bg: "#d2992218", c: "#d29922", bd: "#d2992240" },
  Promoter: { bg: "#58a6ff18", c: "#58a6ff", bd: "#58a6ff40" },
  Detractor: { bg: "#f8514918", c: "#f85149", bd: "#f8514940" },
  Passive: { bg: "#bc8cff18", c: "#bc8cff", bd: "#bc8cff40" },
  Yes: { bg: "#f8514918", c: "#f85149", bd: "#f8514940" },
  No: { bg: "#3fb95018", c: "#3fb950", bd: "#3fb95040" },
  P1: { bg: "#f8514918", c: "#f85149", bd: "#f8514940" },
  P2: { bg: "#d2992218", c: "#d29922", bd: "#d2992240" },
  P3: { bg: "#3fb95018", c: "#3fb950", bd: "#3fb95040" },
  1: { bg: "#3fb95018", c: "#3fb950", bd: "#3fb95040" },
  0: { bg: "#48484818", c: "#484f58", bd: "#48484840" },
};

const BADGE_COLS = new Set([
  "Predicted_Sentiment",
  "NPS_Category",
  "SLA_Breached",
  "Priority",
  "CSAT",
  "DSAT",
  "Status",
  "status",
  "ISHAPPY",
  "ISSAD",
  "ISPASSIVE",
]);
const EMAIL_COLS = new Set([
  "Employee_Email",
  "Client_Email",
  "email",
  "Email",
  "USER EMAIL",
  "user email",
  "ASSIGNED TOEMAIL",
]);

function Badge({ v }) {
  const s = BADGE_MAP[String(v)];
  if (!s) return <span style={{ color: C.text, fontSize: 11 }}>{v}</span>;
  return (
    <span
      style={{
        background: s.bg,
        color: s.c,
        border: `1px solid ${s.bd}`,
        borderRadius: 5,
        padding: "2px 9px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {v}
    </span>
  );
}

function EmptyTable() {
  const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        minHeight: 300,
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg2 }}>
              <th
                style={{
                  width: 40,
                  padding: "9px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  borderRight: `1px solid ${C.border}`,
                  color: C.dim,
                  fontSize: 10,
                }}
              >
                #
              </th>
              {cols.map((c) => (
                <th
                  key={c}
                  style={{
                    padding: "9px 40px",
                    borderBottom: `1px solid ${C.border}`,
                    borderRight: `1px solid ${C.border}22`,
                    color: C.dim,
                    fontSize: 11,
                    fontWeight: 700,
                    textAlign: "center",
                    minWidth: 120,
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, ri) => (
              <tr
                key={ri}
                style={{
                  borderBottom: `1px solid ${C.border}22`,
                  background: ri % 2 ? "#ffffff03" : "transparent",
                }}
              >
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    color: C.dim,
                    fontSize: 10,
                    borderRight: `1px solid ${C.border}`,
                    background: "#161b2288",
                  }}
                >
                  {ri + 1}
                </td>
                {cols.map((c) => (
                  <td
                    key={c}
                    style={{
                      padding: "8px 12px",
                      minWidth: 120,
                      height: 34,
                      borderRight: `1px solid ${C.border}22`,
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>
          No data to display
        </div>
      </div>
    </div>
  );
}

function PaginationBar({ page, totalPages, setPage, totalFiltered }) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalFiltered);

  function pgBtn(label, onClick, disabled, active) {
    return (
      <button
        key={label + String(active)}
        onClick={onClick}
        disabled={disabled}
        style={{
          background: active ? C.cyan : disabled ? "transparent" : C.bg2,
          border: `1px solid ${active ? C.cyan : C.border}`,
          color: active ? "#000" : disabled ? C.dim : C.text,
          borderRadius: 7,
          padding: "5px 11px",
          fontSize: 11,
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          opacity: disabled ? 0.4 : 1,
          minWidth: 34,
        }}
      >
        {label}
      </button>
    );
  }

  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  const nums = [];
  for (let i = from; i <= to; i++) nums.push(i);

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 11, color: C.sub }}>
        Rows <strong style={{ color: C.cyan }}>{start.toLocaleString()}</strong>
        {" – "}
        <strong style={{ color: C.cyan }}>{end.toLocaleString()}</strong>
        {" of "}
        <strong style={{ color: C.text }}>
          {totalFiltered.toLocaleString()}
        </strong>
        {" · Page "}
        <strong style={{ color: C.cyan }}>{page}</strong>
        {" of "}
        <strong style={{ color: C.text }}>{totalPages}</strong>
        <span style={{ color: C.dim }}> · {PAGE_SIZE}/page</span>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {pgBtn("«", () => setPage(1), page === 1, false)}
        {pgBtn("‹", () => setPage((p) => p - 1), page === 1, false)}
        {from > 1 && (
          <>
            {pgBtn("1", () => setPage(1), false, false)}
            {from > 2 && (
              <span style={{ color: C.dim, padding: "0 4px" }}>…</span>
            )}
          </>
        )}
        {nums.map((p) => pgBtn(String(p), () => setPage(p), false, p === page))}
        {to < totalPages && (
          <>
            {to < totalPages - 1 && (
              <span style={{ color: C.dim, padding: "0 4px" }}>…</span>
            )}
            {pgBtn(String(totalPages), () => setPage(totalPages), false, false)}
          </>
        )}
        {pgBtn("›", () => setPage((p) => p + 1), page === totalPages, false)}
        {pgBtn("»", () => setPage(totalPages), page === totalPages, false)}
      </div>
    </div>
  );
}

export default function DataTable({ rows, onNotify }) {
  // ── ALL HOOKS FIRST — NEVER MOVE THESE ───────────────
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [colFilter, setColFilter] = useState({});
  const [page, setPage] = useState(1);

  const safeRows = rows || [];

  const cols = useMemo(() => {
    if (!safeRows.length) return [];
    return Object.keys(safeRows[0]);
  }, [safeRows]);

  const uniqueValues = useMemo(() => {
    if (!safeRows.length) return {};
    const map = {};
    cols.forEach((col) => {
      const vals = [...new Set(safeRows.map((r) => String(r[col] ?? "")))];
      if (vals.length <= 30) map[col] = vals;
    });
    return map;
  }, [safeRows, cols]);

  const filtered = useMemo(() => {
    if (!safeRows.length) return [];
    let data = safeRows;

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(q)),
      );
    }

    Object.entries(colFilter).forEach(([col, val]) => {
      if (val && val !== "All") {
        data = data.filter(
          (row) => String(row[col] ?? "").toLowerCase() === val.toLowerCase(),
        );
      }
    });

    return data;
  }, [safeRows, search, colFilter]);

  const sorted = useMemo(() => {
    if (!filtered.length) return [];
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? "");
      const bv = String(b[sortCol] ?? "");
      const nA = parseFloat(av),
        nB = parseFloat(bv);
      const cmp = !isNaN(nA) && !isNaN(nB) ? nA - nB : av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)),
    [sorted],
  );

  const curPage = useMemo(() => Math.min(page, totalPages), [page, totalPages]);

  const sliced = useMemo(
    () => sorted.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE),
    [sorted, curPage],
  );

  // ── ALL HOOKS DONE — safe to return early now ─────────
  if (!safeRows.length) return <EmptyTable />;

  const isFiltered =
    search.trim() || Object.values(colFilter).some((v) => v && v !== "All");
  const isSorted = sortCol !== null;

  function doSort(col) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  }
  function doFilter(col, val) {
    setColFilter((prev) => ({ ...prev, [col]: val }));
    setPage(1);
  }
  function doSearch(val) {
    setSearch(val);
    setPage(1);
  }
  function clearAll() {
    setSearch("");
    setColFilter({});
    setSortCol(null);
    setSortDir("asc");
    setPage(1);
  }

  // ── EXPORT — exports filtered + sorted data ───────────
  function doExport() {
    const dataToExport = sorted; // filtered + sorted!
    if (!dataToExport.length) return;

    const headers = Object.keys(dataToExport[0]).join(",");
    const body = dataToExport
      .map((r) =>
        Object.values(r)
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sentimentiq_export_${Date.now()}.csv`;
    a.click();

    const msg =
      isFiltered || isSorted
        ? `Exported ${dataToExport.length.toLocaleString()} rows (filtered/sorted)`
        : `Exported all ${dataToExport.length.toLocaleString()} rows`;

    if (onNotify) onNotify(msg, C.green);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* ── TOOLBAR ───────────────────────────────────── */}
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search box */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: C.dim,
              fontSize: 13,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search across all columns…"
            style={{
              width: "100%",
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 12px 8px 32px",
              color: C.text,
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Row count */}
        <div
          style={{
            fontSize: 11,
            color: C.sub,
            whiteSpace: "nowrap",
          }}
        >
          <strong style={{ color: C.cyan }}>
            {sorted.length.toLocaleString()}
          </strong>
          {" of "}
          <strong style={{ color: C.text }}>
            {safeRows.length.toLocaleString()}
          </strong>
          {" rows"}
          {(isFiltered || isSorted) && (
            <span
              style={{
                color: C.amber,
                marginLeft: 6,
                fontSize: 10,
              }}
            >
              ● filtered
            </span>
          )}
        </div>

        {/* Clear button */}
        {(isFiltered || isSorted) && (
          <button
            onClick={clearAll}
            style={{
              background: C.red + "18",
              border: `1px solid ${C.red}40`,
              color: C.red,
              borderRadius: 7,
              padding: "7px 13px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✕ Clear
          </button>
        )}

        {/* Export — always exports the FILTERED + SORTED data, never the raw import */}
        <button
          onClick={doExport}
          style={{
            background: C.green + "18",
            border: `1px solid ${C.green}50`,
            color: C.green,
            borderRadius: 7,
            padding: "7px 16px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          ⬇ Export CSV
          <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>
            ({sorted.length.toLocaleString()}{" "}
            {isFiltered || isSorted ? "filtered" : "rows"})
          </span>
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: "52vh",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: C.bg0 }}>
                {cols.map((col) => (
                  <th
                    key={col}
                    onClick={() => doSort(col)}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      color: C.cyan,
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer",
                      userSelect: "none",
                      position: "sticky",
                      top: 0,
                      background: C.bg0,
                    }}
                  >
                    {col.replace(/_/g, " ")}
                    <span
                      style={{
                        marginLeft: 4,
                        color: sortCol === col ? C.cyan : C.dim,
                      }}
                    >
                      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "⇅"}
                    </span>
                  </th>
                ))}
              </tr>

              {/* Filter dropdowns */}
              <tr style={{ background: C.bg0 }}>
                {cols.map((col) => {
                  const opts = uniqueValues[col];
                  return (
                    <th
                      key={col}
                      style={{
                        padding: "4px 8px",
                        borderBottom: `2px solid ${C.cyan}33`,
                        position: "sticky",
                        top: 37,
                        background: C.bg0,
                      }}
                    >
                      {opts ? (
                        <select
                          value={colFilter[col] || "All"}
                          onChange={(e) => doFilter(col, e.target.value)}
                          style={{
                            background: C.panel,
                            border: `1px solid ${
                              colFilter[col] && colFilter[col] !== "All"
                                ? C.cyan
                                : C.border
                            }`,
                            borderRadius: 5,
                            color:
                              colFilter[col] && colFilter[col] !== "All"
                                ? C.cyan
                                : C.dim,
                            fontSize: 10,
                            padding: "3px 6px",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            width: "100%",
                            outline: "none",
                          }}
                        >
                          <option value="All">All</option>
                          {opts.sort().map((v) => (
                            <option key={v} value={v}>
                              {v || "(empty)"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ height: 24 }} />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {sliced.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: `1px solid ${C.border}22`,
                    background: ri % 2 ? "#ffffff04" : "transparent",
                    cursor: "pointer",
                    transition: "background .1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.cyan + "0a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      ri % 2 ? "#ffffff04" : "transparent")
                  }
                >
                  {cols.map((col) => (
                    <td
                      key={col}
                      style={{
                        padding: "9px 14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {BADGE_COLS.has(col) ? (
                        <Badge v={String(row[col] ?? "")} />
                      ) : EMAIL_COLS.has(col) ? (
                        <span style={{ color: C.violet, fontSize: 11 }}>
                          {row[col]}
                        </span>
                      ) : (
                        <span style={{ color: C.text }}>
                          {String(row[col] ?? "").length > 48
                            ? String(row[col]).slice(0, 48) + "…"
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
                      padding: 40,
                      textAlign: "center",
                      color: C.dim,
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

      {/* Pagination — bottom only */}
      <PaginationBar
        page={curPage}
        totalPages={totalPages}
        setPage={setPage}
        totalFiltered={sorted.length}
      />

      <style>{`
        select option{background:${C.bg2};color:${C.text}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#07090f}
        ::-webkit-scrollbar-thumb{
          background:${C.border};border-radius:3px}
      `}</style>
    </div>
  );
}
