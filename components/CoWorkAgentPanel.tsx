"use client"
import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SAMPLE_QUESTIONS = [
  "What is the total value of all active contracts?",
  "Show me contracts expiring in the next 30 days",
  "Which contracts have the highest value?",
  "What is the sentiment breakdown across all calls?",
  "How many calls had negative sentiment and who were they for?",
  "Show me the top 10 customers by total contract value",
  "Which top 10 customers have the most source records?",
  "Which customers have the highest churn risk based on negative call sentiment?",
  "Which customers have expired contracts?",
  "Find contracts related to data processing agreements",
]

export function CoWorkAgentPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
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
      const apiMessages = updated.map(m => ({
        role: m.role,
        content: [{ type: "text", text: m.content }]
      }))

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages([...updated, { role: "assistant", content: `Error: ${data.error}` }])
      } else {
        const assistantText = data.answer || "No response"
        setMessages([...updated, { role: "assistant", content: assistantText }])
      }
    } catch (err) {
      setMessages([...updated, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", padding: "0" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bot size={20} style={{ color: "var(--accent)" }} />
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>CoWork Agent</h2>
          <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: 12 }}>
            Cortex Agent
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Ask questions about customers, contracts, calls, web activity, and dependents
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
            <Sparkles size={32} style={{ color: "var(--accent)", opacity: 0.6 }} />
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", maxWidth: 400 }}>
              Ask me anything about your Customer 360 data. I can query across customers, contracts, calls, web activity, and dependents.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 600, marginTop: 8 }}>
              {SAMPLE_QUESTIONS.slice(0, 6).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 11,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)" }}
                >
                  {q}
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
              gap: 10,
              marginBottom: 16,
              alignItems: "flex-start",
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: msg.role === "user" ? "var(--bg-secondary)" : "var(--accent)",
              flexShrink: 0,
            }}>
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} style={{ color: "white" }} />}
            </div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              maxWidth: "80%",
              background: msg.role === "user" ? "var(--bg-secondary)" : "transparent",
              padding: msg.role === "user" ? "8px 12px" : "0",
              borderRadius: 8,
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--accent)", flexShrink: 0,
            }}>
              <Bot size={14} style={{ color: "white" }} />
            </div>
            <Loader2 size={16} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{
        padding: "12px 24px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: 8,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 13,
            outline: "none",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 16px",
            background: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
