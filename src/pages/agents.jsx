import { useState, useRef, useEffect } from "react";

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

const AGENTS = [
  {
    id: "ticket",
    icon: "🎫",
    name: "Smart Ticket Routing",
    model: "creates tickets",
    modelColor: "#f0b429",
    color: C.cyan,
    endpoint: "/agent/ticket",
    desc: "Analyzes IT complaints and CREATES a real ticket in the system, routed to the correct team",
    suggestions: [
      "My VPN is not working since morning, have client call in 1 hour!",
      "I forgot my password and locked out of my laptop",
      "Laptop very slow and freezing during Teams calls",
      "Cannot access the shared project drive, access denied",
      "Office printer showing offline, urgent documents to print",
    ],
  },
  {
    id: "sentiment",
    icon: "📊",
    name: "Employee Sentiment Analysis",
    model: "raises alerts",
    modelColor: "#4285f4",
    color: C.green,
    endpoint: "/agent/sentiment",
    desc: "Analyzes CSAT DSAT data and RAISES ALERTS for teams or regions performing below target",
    suggestions: [
      "Which team has the lowest CSAT score and why?",
      "What is our overall sentiment health status?",
      "Flag all teams below the NTT target",
      "Which region is performing worst?",
      "What should we prioritize to improve CSAT?",
    ],
  },
  {
    id: "report",
    icon: "📝",
    name: "Research and Reporting",
    model: "saves reports",
    modelColor: "#bc8cff",
    color: C.amber,
    endpoint: "/agent/report",
    desc: "Generates professional reports and SAVES them so you can reopen and export them anytime",
    suggestions: [
      "Generate executive summary for directors",
      "Write weekly operations report for my manager",
      "Create team performance analysis report",
      "Compare APAC vs EMEA regional performance",
      "Generate monthly trend analysis report",
    ],
  },
];

function ActionBadge({ action }) {
  if (!action) return null;
  let icon = "✅",
    text = "",
    color = C.green;
  if (action.type === "ticket_created") {
    icon = "🎫";
    text = `Ticket ${action.ticket_id} created · ${action.team} · ${action.priority}`;
    color = C.cyan;
  } else if (action.type === "alerts_raised") {
    icon = "🚨";
    text = `${action.count} alert${action.count > 1 ? "s" : ""} raised — see Operations page`;
    color = C.red;
  } else if (action.type === "report_saved") {
    icon = "📄";
    text = `Report saved: "${action.title}" — see Operations page`;
    color = C.violet;
  }
  return (
    <div
      style={{
        marginTop: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: color + "15",
        border: `1px solid ${color}50`,
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 10,
        color,
        fontWeight: 700,
      }}
    >
      <span>{icon}</span> ACTION TAKEN: {text}
    </div>
  );
}

function ChatWindow({ agent, token, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    const userMsg = { role: "user", content: msg };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}${agent.endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          chat_history: messages,
          username,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Agent error");
      }
      const data = await res.json();
      setMessages([
        ...updated,
        {
          role: "assistant",
          content: data.response,
          action: data.action_taken,
        },
      ]);
    } catch (e) {
      setMessages([
        ...updated,
        {
          role: "assistant",
          content: `Error: ${e.message}\n\nCheck: backend running, API keys in config.json, libraries installed.`,
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: C.bg1,
        borderRadius: 14,
        border: `1px solid ${agent.color}40`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: `${agent.color}15`,
            border: `2px solid ${agent.color}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {agent.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: agent.color }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 9, color: C.green, marginTop: 1 }}>
            ● Online ·{" "}
            <span
              style={{
                color: agent.modelColor,
                fontWeight: 700,
                marginLeft: 4,
              }}
            >
              {agent.model}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.dim,
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 9,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Clear Chat
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 10 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>{agent.icon}</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: agent.color,
                marginBottom: 4,
              }}
            >
              {agent.name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.sub,
                marginBottom: 20,
                lineHeight: 1.7,
                maxWidth: 380,
                margin: "0 auto 20px",
              }}
            >
              {agent.desc}
            </div>
            <div
              style={{
                fontSize: 9,
                color: C.dim,
                marginBottom: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Try asking:
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                textAlign: "left",
              }}
            >
              {agent.suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    background: C.bg2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.sub,
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = agent.color + "60";
                    e.currentTarget.style.color = agent.color;
                    e.currentTarget.style.background = agent.color + "08";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.color = C.sub;
                    e.currentTarget.style.background = C.bg2;
                  }}
                >
                  💬 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: `${agent.color}15`,
                  border: `1px solid ${agent.color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              >
                {agent.icon}
              </div>
            )}
            <div style={{ maxWidth: "82%" }}>
              <div
                style={{
                  background: msg.role === "user" ? `${agent.color}18` : C.bg2,
                  border: `1px solid ${msg.role === "user" ? agent.color + "40" : C.border}`,
                  borderRadius:
                    msg.role === "user"
                      ? "14px 14px 2px 14px"
                      : "2px 14px 14px 14px",
                  padding: "10px 14px",
                  fontSize: 11,
                  color: msg.role === "user" ? agent.color : C.text,
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && <ActionBadge action={msg.action} />}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: `${agent.color}15`,
                border: `1px solid ${agent.color}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              {agent.icon}
            </div>
            <div
              style={{
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: "2px 14px 14px 14px",
                padding: "10px 16px",
                fontSize: 16,
                color: C.dim,
                display: "flex",
                gap: 4,
              }}
            >
              <span style={{ animation: "pulse 1.2s infinite 0s" }}>●</span>
              <span style={{ animation: "pulse 1.2s infinite .2s" }}>●</span>
              <span style={{ animation: "pulse 1.2s infinite .4s" }}>●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: "12px",
          borderTop: `1px solid ${C.border}`,
          background: C.bg2,
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={`Message ${agent.name}... (Enter to send)`}
          rows={1}
          style={{
            flex: 1,
            background: C.bg1,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            color: C.text,
            fontSize: 11,
            fontFamily: "inherit",
            outline: "none",
            resize: "none",
            lineHeight: 1.5,
            minHeight: 40,
            maxHeight: 120,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = agent.color + "60";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = C.border;
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            background:
              loading || !input.trim()
                ? C.bg1
                : `linear-gradient(135deg,${agent.color},${C.violet})`,
            border: `1px solid ${loading || !input.trim() ? C.border : agent.color + "60"}`,
            borderRadius: 10,
            width: 42,
            height: 42,
            color: loading || !input.trim() ? C.dim : "#000",
            fontSize: 18,
            fontWeight: 700,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all .2s",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

export default function Agents({ token, username }) {
  const [activeAgent, setActiveAgent] = useState("ticket");
  const [aiStatus, setAiStatus] = useState(null);
  const agent = AGENTS.find((a) => a.id === activeAgent);

  useEffect(() => {
    fetch(`${API}/agent/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setAiStatus(d))
      .catch(() => setAiStatus(null));
  }, []);

  return (
    <div
      style={{
        padding: "24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'IBM Plex Mono',monospace",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
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
            AI Agents
          </h1>
          <p style={{ fontSize: 11, color: C.sub, margin: "4px 0 0" }}>
            Agents that take real actions · tickets · alerts · reports
          </p>
        </div>
        {aiStatus && (
          <div style={{ display: "flex", gap: 6 }}>
            <div
              style={{
                background: aiStatus.groq_available
                  ? C.green + "15"
                  : C.red + "15",
                border: `1px solid ${aiStatus.groq_available ? C.green + "40" : C.red + "40"}`,
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 9,
                fontWeight: 700,
                color: aiStatus.groq_available ? C.green : C.red,
              }}
            >
              {aiStatus.groq_available ? "●" : "○"} Groq
            </div>
            <div
              style={{
                background: aiStatus.gemini_available
                  ? C.green + "15"
                  : C.red + "15",
                border: `1px solid ${aiStatus.gemini_available ? C.green + "40" : C.red + "40"}`,
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 9,
                fontWeight: 700,
                color: aiStatus.gemini_available ? C.green : C.red,
              }}
            >
              {aiStatus.gemini_available ? "●" : "○"} Gemini
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveAgent(a.id)}
            style={{
              background: activeAgent === a.id ? `${a.color}18` : C.bg2,
              border: `1px solid ${activeAgent === a.id ? a.color + "60" : C.border}`,
              borderRadius: 12,
              padding: "12px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all .2s",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              if (activeAgent !== a.id)
                e.currentTarget.style.borderColor = a.color + "40";
            }}
            onMouseLeave={(e) => {
              if (activeAgent !== a.id)
                e.currentTarget.style.borderColor = C.border;
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 2,
                color: activeAgent === a.id ? a.color : C.sub,
              }}
            >
              {a.name}
            </div>
            <div style={{ fontSize: 8, color: a.modelColor, fontWeight: 600 }}>
              {a.model}
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {agent && (
          <ChatWindow
            key={activeAgent}
            agent={agent}
            token={token}
            username={username}
          />
        )}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:.2}50%{opacity:1}}`}</style>
    </div>
  );
}
