"use client"
import { useState, useEffect } from "react"
import { Phone, Clock, User, ExternalLink } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { CallDetailPanel } from "@/components/CallDetailPanel"

interface CallRecord {
  CALL_ID: string
  CALL_DATE: string
  DURATION_SECONDS: number
  AGENT_NAME: string
  CALL_TYPE: string
  SENTIMENT: string
  MP4_FILE_PATH: string
  TRANSCRIPTION: string
  FULL_NAME: string
}

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: "#66bb6a",
  Neutral: "#8899a8",
  Negative: "#ef5350",
}

interface CallsPanelProps {
  customerId?: string
}

export function CallsPanel({ customerId }: CallsPanelProps) {
  const [idInput, setIdInput] = useState(customerId || "")
  const [nameInput, setNameInput] = useState("")
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const doSearch = async (id?: string) => {
    const searchId = id || idInput
    if (!searchId && !nameInput) return
    setLoading(true)
    setSelectedCallId(null)
    const params = searchId ? `id=${encodeURIComponent(searchId)}` : `name=${encodeURIComponent(nameInput)}`
    const res = await fetch(`/api/calls?${params}`)
    const data = await res.json()
    setCalls(data)
    setLoading(false)
  }

  useEffect(() => {
    if (customerId) {
      setIdInput(customerId)
      doSearch(customerId)
    }
  }, [customerId])

  if (selectedCallId) {
    return <CallDetailPanel callId={selectedCallId} onBack={() => setSelectedCallId(null)} />
  }

  const sentimentData = Object.entries(
    calls.reduce<Record<string, number>>((acc, c) => {
      acc[c.SENTIMENT] = (acc[c.SENTIMENT] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  return (
    <div>
      <div className="page-header">
        <h2>Call History</h2>
        <p>View call logs with sentiment analysis and transcriptions</p>
      </div>

      <div className="card">
        <div className="search-row">
          <div className="input-group">
            <label>Master Customer ID</label>
            <input type="text" placeholder="e.g. MCR-00009001" value={idInput} onChange={(e) => setIdInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
          </div>
          <div className="input-group">
            <label>Or search by name</label>
            <input type="text" placeholder="e.g. Colm Moynihan" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => doSearch()}>
          <Phone size={14} /> Search Calls
        </button>
      </div>

      {loading && <div className="loading"><div className="spinner" /> Loading calls...</div>}

      {calls.length > 0 && (
        <>
          <div className="info-banner">
            Found {calls.length} call(s) for {calls[0].FULL_NAME}
          </div>

          {sentimentData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-container">
                <div className="card-title" style={{ marginBottom: 12 }}>Sentiment Breakdown</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {sentimentData.map((entry) => (
                        <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] || "#5c7080"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-container">
                <div className="card-title" style={{ marginBottom: 12 }}>Stats</div>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-value">{calls.length}</div>
                    <div className="stat-label">Total Calls</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{Math.round(calls.reduce((s, c) => s + c.DURATION_SECONDS, 0) / 60)}m</div>
                    <div className="stat-label">Total Duration</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Call ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Agent</th>
                  <th>Duration</th>
                  <th>Sentiment</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.CALL_ID}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.CALL_ID}</td>
                    <td>{c.CALL_DATE}</td>
                    <td>{c.CALL_TYPE}</td>
                    <td><User size={12} /> {c.AGENT_NAME}</td>
                    <td><Clock size={12} /> {c.DURATION_SECONDS}s</td>
                    <td><span className={`badge badge-${c.SENTIMENT.toLowerCase()}`}>{c.SENTIMENT}</span></td>
                    <td>
                      <button
                        className="btn"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => setSelectedCallId(c.CALL_ID)}
                      >
                        <ExternalLink size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
