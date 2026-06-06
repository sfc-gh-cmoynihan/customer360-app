"use client"
import { useState, useRef, useEffect } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
}

function FormattedAnswer({ content }: { content: string }) {
  if (!content.includes("|")) {
    const parts = content.split(/\*\*(.*?)\*\*/g)
    return (
      <div>
        {parts.map((part, i) =>
          i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
        )}
      </div>
    )
  }

  const lines = content.trim().split("\n").filter(l => l.trim())
  if (lines.length < 3 || !lines[0].includes("|")) {
    return <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
  }

  const headers = lines[0].split("|").map(h => h.trim()).filter(Boolean)
  const dataLines = lines.slice(2)

  const formatHeader = (h: string) => h.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  const formatValue = (v: string, col: string) => {
    if (!v || v === "-") return <span style={{ color: "#9ca3af" }}>—</span>
    if (col.match(/DATE|EXPIRY/i) && v.includes("GMT")) {
      return new Date(v).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })
    }
    if (col.match(/VALUE|COST|AMOUNT/i) && !isNaN(Number(v))) {
      return `€${Number(v).toLocaleString()}`
    }
    if (col.match(/STATUS/i)) {
      const color = v === "Active" ? "#16a34a" : v === "Expired" ? "#dc2626" : "#f59e0b"
      return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${color}18`, color }}>{v}</span>
    }
    if (col.match(/SENTIMENT/i)) {
      const color = v === "Positive" ? "#16a34a" : v === "Negative" ? "#dc2626" : "#6b7280"
      return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${color}18`, color }}>{v}</span>
    }
    if (v.length > 60) return v.slice(0, 60) + "..."
    return v
  }

  const skipCols = new Set(["PDF_STAGE_PATH", "CONTRACT_TEXT", "MASTER_CUSTOMER_ID"])
  const visibleHeaders = headers.filter(h => !skipCols.has(h))

  return (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{dataLines.length} result{dataLines.length !== 1 ? "s" : ""}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dataLines.map((line, ri) => {
          const cells = line.split("|").map(c => c.trim()).filter(Boolean)
          return (
            <div key={ri} style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px 16px" }}>
                {visibleHeaders.map((h, ci) => {
                  const cellIdx = headers.indexOf(h)
                  const val = cells[cellIdx] || ""
                  return (
                    <div key={ci}>
                      <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>{formatHeader(h)}</div>
                      <div style={{ fontSize: 13, color: "#1f2937", marginTop: 2 }}>{formatValue(val, h)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SAMPLE_QUESTIONS = [
  "What is the total value of all active contracts?",
  "Show me contracts expiring in the next 30 days",
  "Which contracts have the highest value?",
  "What is the sentiment breakdown across all calls?",
  "How many calls had negative sentiment?",
  "Show me top 10 customers by contract value",
  "Which customers have the most source records?",
  "Which customers have negative call sentiment?",
  "Which customers have expired contracts?",
  "Find all contracts signed by Colm Moynihan",
]

export function CoWorkAgentPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState("claude-opus-4-8")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: "user", content: text.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setLoading(true)
    try {
      const apiMessages = updated.map(m => ({ role: m.role, content: [{ type: "text", text: m.content }] }))
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages, model: selectedModel }) })
      const data = await res.json()
      setMessages([...updated, { role: "assistant", content: data.error ? `Error: ${data.error}` : (data.answer || "No response") }])
    } catch (err) {
      setMessages([...updated, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown"}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 120px)", padding: "24px 32px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "white", marginBottom: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#6c757d" }}>
              Ask a question about customers, contracts, calls, or web activity
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, maxWidth: msg.role === "user" ? "80%" : "95%", fontSize: 14, lineHeight: 1.6, ...(msg.role === "user" ? { background: "#3b82f6", color: "#fff", marginLeft: "auto", whiteSpace: "pre-wrap" } : { background: "#f8f9fa", color: "#1a1a2e", border: "1px solid #e0e0e0" }) }}>
              {msg.role === "assistant" ? <FormattedAnswer content={msg.content} /> : msg.content}
            </div>
          ))}
          {loading && <div style={{ padding: "12px 16px", borderRadius: 8, background: "#f1f3f5", color: "#6c757d", maxWidth: "80%" }}>Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask about customers, contracts, calls, web activity..."
            disabled={loading}
            style={{ flex: 1, padding: "12px 16px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{ padding: "12px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 600, opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            Go
          </button>
          <button
            onClick={() => { setMessages([]); setInput("") }}
            style={{ padding: "12px 16px", background: "#e9ecef", color: "#6c757d", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      </div>
      <div style={{ width: 300, minWidth: 300, background: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: 8, padding: 16, overflowY: "auto" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#6c757d", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Model</div>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            style={{ width: "100%", fontSize: 12, padding: "8px 10px", border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff", cursor: "pointer" }}
          >
            <option value="claude-opus-4-8">Claude Opus 4 (Latest)</option>
            <option value="chatgpt-5-5">ChatGPT 5-5</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="llama3.1-70b">Llama 3.1 70B</option>
            <option value="snowflake-llama-3.3-70b">Snowflake Llama 3.3 70B</option>
            <option value="mistral-large2">Mistral Large 2</option>
            <option value="llama3.1-8b">Llama 3.1 8B (Fastest)</option>
          </select>
        </div>
        <div style={{ fontSize: 11, color: "#6c757d", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>Sample Questions</div>
        {SAMPLE_QUESTIONS.map((q, i) => (
          <div
            key={i}
            onClick={() => sendMessage(q)}
            style={{ padding: "8px 12px", marginBottom: 6, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#1a1a2e" }}
          >
            {q}
          </div>
        ))}
      </div>
    </div>
  )
}
