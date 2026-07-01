import { useState } from "react";

const C = {
  bg0: "#07090f",
  bg1: "#0d1117",
  bg2: "#161b22",
  panel: "#13181f",
  border: "#21262d",
  cyan: "#58a6ff",
  red: "#f85149",
  violet: "#bc8cff",
  text: "#e6edf3",
  sub: "#8b949e",
  dim: "#484f58",
};

const API = "http://localhost:8000";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      // ── Call backend /auth/login API ─────────────────
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend returned 401 — wrong credentials
        setError(data.detail || "Invalid username or password");
        setLoading(false);
        return;
      }

      // ── Login success ────────────────────────────────
      // Save token for future API calls
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Pass user to App.jsx
      onLogin(data.user);
    } catch (err) {
      // Backend not running
      setError(
        "Cannot connect to server. " +
          "Make sure backend is running on port 8000.",
      );
      setLoading(false);
    }
  }

  const inp = {
    width: "100%",
    background: C.bg2,
    border: `1px solid ${C.border}`,
    borderRadius: 9,
    padding: "12px 14px",
    color: C.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color .2s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "'IBM Plex Mono','Courier New',monospace",
        padding: 20,
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `
          linear-gradient(${C.border}44 1px, transparent 1px),
          linear-gradient(90deg, ${C.border}44 1px, transparent 1px)
        `,
          backgroundSize: "40px 40px",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500,
          height: 300,
          background: `radial-gradient(ellipse,${C.cyan}14 0%,transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Login card */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          padding: "44px 44px 36px",
          width: "100%",
          maxWidth: 420,
          boxShadow: `0 0 60px ${C.cyan}12`,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              margin: "0 auto 16px",
              boxShadow: `0 0 30px ${C.cyan}30`,
            }}
          >
            ⚡
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: C.cyan,
              letterSpacing: 3,
            }}
          >
            SENTIMENTIQ
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.dim,
              marginTop: 5,
              letterSpacing: 1.5,
            }}
          >
            AI ANALYTICS PLATFORM
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {/* Username */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.sub,
                letterSpacing: 1.5,
                fontWeight: 700,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              spellCheck={false}
              style={inp}
              onFocus={(e) => (e.target.style.borderColor = C.cyan)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.sub,
                letterSpacing: 1.5,
                fontWeight: 700,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...inp, paddingRight: 44 }}
                onFocus={(e) => (e.target.style.borderColor = C.cyan)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: C.dim,
                  cursor: "pointer",
                  fontSize: 16,
                  padding: 4,
                }}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Error message from backend */}
          {error && (
            <div
              style={{
                background: C.red + "15",
                border: `1px solid ${C.red}40`,
                borderRadius: 8,
                padding: "10px 13px",
                fontSize: 12,
                color: C.red,
                fontWeight: 600,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? C.dim
                : `linear-gradient(135deg,${C.cyan},${C.violet})`,
              border: "none",
              borderRadius: 10,
              padding: 14,
              width: "100%",
              color: loading ? C.sub : "#000",
              fontSize: 14,
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            {loading ? "Signing in…" : "SIGN IN →"}
          </button>
        </form>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: C.dim,
          letterSpacing: 1,
        }}
      >
        v1.0.0
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg0}}
        input::placeholder{color:${C.dim}}
        button:active{transform:scale(.97)}
      `}</style>
    </div>
  );
}
