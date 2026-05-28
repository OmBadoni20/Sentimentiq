1)src/api.js-:      

import axios from "axios"

const api = axios.create({ baseURL: "http://localhost:8000" })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api



2)src/api.js:-   

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #020817;
  color: #e2e8f0;
  min-height: 100vh;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}



3)src/main.jsx:-

import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)


4)rc/App.jsx-:

import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Results from "./pages/Results"

function PrivateRoute({ children }) {
  return localStorage.getItem("token")
    ? children
    : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"   element={<Login />} />
      <Route path="/"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/results" element={<PrivateRoute><Results /></PrivateRoute>} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  )
}


5)src/pages/Login.jsx-:

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"

export default function Login() {
  const navigate = useNavigate()
  const [mode,     setMode]     = useState("login")
  const [name,     setName]     = useState("")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async () => {
    setError("")
    setLoading(true)
    try {
      const endpoint = mode === "login" ? "/login" : "/register"
      const payload  = mode === "login"
        ? { email, password }
        : { email, password, name }
      const { data } = await api.post(endpoint, payload)
      localStorage.setItem("token", data.access_token)
      localStorage.setItem("user", JSON.stringify({ name: data.name, email: data.email }))
      navigate("/")
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: "100%", background: "#0a0f1e",
    border: "1px solid #1e293b", borderRadius: 10,
    padding: "12px 14px", color: "#e2e8f0",
    fontSize: 14, outline: "none", fontFamily: "inherit",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9" }}>SentimentIQ</h1>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
            Local AI · No Cloud · Private
          </p>
        </div>

        <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 24, padding: 32 }}>

          <div style={{ display: "flex", background: "#0a0f1e", borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "8px 0", borderRadius: 9,
                border: "none", cursor: "pointer", fontSize: 13,
                fontWeight: 600, fontFamily: "inherit",
                background: mode === m ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
                color: mode === m ? "#fff" : "#475569",
                transition: "all 0.2s",
              }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, fontWeight: 700 }}>
                FULL NAME
              </label>
              <input style={inputStyle} value={name}
                onChange={e => setName(e.target.value)} placeholder="Your Name" />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, fontWeight: 700 }}>
              EMAIL
            </label>
            <input style={inputStyle} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, fontWeight: 700 }}>
              PASSWORD
            </label>
            <input style={inputStyle} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: "13px",
            background: loading ? "#2d3a55" : "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none", borderRadius: 12, color: "#fff",
            fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading
              ? <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Please wait…
                </>
              : mode === "login" ? "Sign In →" : "Create Account →"
            }
          </button>

        </div>
      </div>
    </div>
  )
}

6)src/components/UploadZone.jsx:-

import { useRef, useState } from "react"

export default function UploadZone({ type, onFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const accept = type === "structured"
    ? ".csv,.xlsx,.xls,.json,.tsv"
    : ".txt,.md,.eml"

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const accent = type === "structured" ? "#22d3ee" : "#818cf8"

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? accent : "#1e293b"}`,
        borderRadius: 20, padding: "36px 24px",
        cursor: "pointer",
        background: dragging ? `${accent}15` : "#0a0f1e",
        transition: "all 0.25s", textAlign: "center",
      }}
    >
      <input ref={inputRef} type="file" accept={accept}
        style={{ display: "none" }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }} />
      <div style={{ fontSize: 36, marginBottom: 10 }}>
        {type === "structured" ? "⊞" : "≡"}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
        {type === "structured" ? "Structured Data" : "Unstructured Data"}
      </div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
        {type === "structured" ? "CSV · XLSX · JSON · TSV" : "TXT · MD · EML"}
      </div>
      <div style={{ fontSize: 12, color: dragging ? accent : "#334155" }}>
        {dragging ? "Drop to upload" : "Drag & drop or click to browse"}
      </div>
    </div>
  )
}

7)rc/pages/Dashboard.jsx:-

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import UploadZone from "../components/UploadZone"

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const [activeType, setActiveType] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [error,      setError]      = useState("")

  const logout = () => { localStorage.clear(); navigate("/login") }

  const handleFile = async (file) => {
    setLoading(true); setError(""); setProgress(10)
    const ticker = setInterval(() => setProgress(p => Math.min(p + 6, 88)), 500)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("data_type", activeType)
      const { data } = await api.post("/analyse", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      clearInterval(ticker); setProgress(100)
      await new Promise(r => setTimeout(r, 400))
      navigate("/results", { state: { result: data } })
    } catch (e) {
      clearInterval(ticker)
      setError(e.response?.data?.detail || "Analysis failed. Is backend running?")
      setLoading(false); setProgress(0)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex" }}>

      <div style={{ width: 220, background: "#0a0f1e", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <div style={{ padding: "0 20px", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧠</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>SentimentIQ</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {["Dashboard", "History", "Reports", "Settings"].map((item, i) => (
            <div key={item} style={{
              padding: "10px 12px", borderRadius: 10, marginBottom: 4,
              cursor: "pointer",
              background: i === 0 ? "rgba(99,102,241,0.12)" : "transparent",
              color: i === 0 ? "#a5b4fc" : "#475569",
              fontWeight: i === 0 ? 600 : 400, fontSize: 14,
            }}>{item}</div>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>Analyst</div>
          </div>
          <button onClick={logout} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 18 }}>⎋</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 32px", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Welcome, {user.name} 👋</h2>
            <p style={{ margin: "2px 0 0", color: "#475569", fontSize: 13 }}>Upload your data to run local sentiment analysis</p>
          </div>
          <div style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#22d3ee" }}>
            ⚡ DistilBERT · Local · CPU
          </div>
        </div>

        <div style={{ padding: 32 }}>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", color: "#fca5a5", fontSize: 13, marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          {loading ? (
            <div className="fade-up" style={{ maxWidth: 480, margin: "80px auto", textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 20, animation: "pulse 2s infinite" }}>🧠</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Analysing with DistilBERT…</h3>
              <p style={{ color: "#475569", fontSize: 13, marginBottom: 28 }}>Running locally — no data leaves your laptop</p>
              <div style={{ background: "#1e293b", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #22d3ee)", borderRadius: 99, transition: "width 0.5s ease" }} />
              </div>
              <p style={{ color: "#475569", fontSize: 12 }}>
                {progress < 30 ? "Reading file…" : progress < 70 ? "Running DistilBERT model…" : "Saving results…"}
              </p>
            </div>
          ) : (
            <div className="fade-up">
              <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 20, padding: 28, marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Step 1 — Select Data Type</h3>
                <p style={{ margin: "0 0 18px", color: "#475569", fontSize: 13 }}>What kind of file are you uploading?</p>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { id: "structured",   icon: "⊞", label: "Structured",   sub: "CSV, XLSX, JSON, TSV" },
                    { id: "unstructured", icon: "≡", label: "Unstructured", sub: "TXT, MD, EML" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setActiveType(t.id)} style={{
                      flex: 1, padding: "16px 12px", borderRadius: 14, cursor: "pointer",
                      border: activeType === t.id ? "2px solid #6366f1" : "2px solid #1e293b",
                      background: activeType === t.id ? "rgba(99,102,241,0.1)" : "#070d1a",
                      color: "#e2e8f0", fontFamily: "inherit",
                      transition: "all 0.2s", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{t.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{t.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {activeType && (
                <div className="fade-up" style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 20, padding: 28 }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Step 2 — Upload File</h3>
                  <p style={{ margin: "0 0 18px", color: "#475569", fontSize: 13 }}>Drop your {activeType} file below</p>
                  <UploadZone type={activeType} onFile={handleFile} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

8)src/pages/Results.jsx-:
import { useLocation, useNavigate } from "react-router-dom"

export default function Results() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const result    = state?.result

  if (!result) { navigate("/"); return null }

  const cfg = {
    Positive: { bg: "#14532d", color: "#86efac", border: "#16a34a", emoji: "😊" },
    Negative: { bg: "#450a0a", color: "#fca5a5", border: "#dc2626", emoji: "😠" },
    Neutral:  { bg: "#1e3a5f", color: "#93c5fd", border: "#3b82f6", emoji: "😐" },
  }
  const c = cfg[result.sentiment] || cfg.Neutral

  const Bar = ({ label, value, color }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{value}%</span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#020817", padding: 32 }}>
      <div className="fade-up" style={{ maxWidth: 680, margin: "0 auto" }}>

        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
          ← Back to Dashboard
        </button>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Analysis Results</h2>
        <p style={{ color: "#475569", fontSize: 13, marginBottom: 28 }}>
          {result.filename}{result.data_type && ` · ${result.data_type}`}{result.row_count && ` · ${result.row_count} rows`}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 16, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
          <span style={{ fontSize: 40 }}>{c.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{result.sentiment}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Overall Sentiment</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: c.color, lineHeight: 1 }}>{result.confidence}%</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>confidence</div>
          </div>
        </div>

        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
            Score Breakdown
          </div>
          <Bar label="Positive Score" value={result.positive_score} color="#22c55e" />
          <Bar label="Negative Score" value={result.negative_score} color="#ef4444" />
        </div>

        {result.preview_text && (
          <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Text Preview
            </div>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
              "{result.preview_text}…"
            </p>
          </div>
        )}

        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            Model Info
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, color: "#e2e8f0" }}>DistilBERT SST-2</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                Runs 100% locally on CPU · ~250MB · No internet after first download
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate("/")} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #6366f1, #4f46e5)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Analyse Another File
        </button>

      </div>
    </div>
  )
}
.fade-up {
  animation: fadeUp 0.5s ease both;
}
