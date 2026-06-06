"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, Play, Clock, User, Phone, FileAudio } from "lucide-react"

interface CallDetail {
  CALL_ID: string
  CALL_DATE: string
  DURATION_SECONDS: number
  AGENT_NAME: string
  CALL_TYPE: string
  SENTIMENT: string
  MP4_FILE_PATH: string
  TRANSCRIPTION: string
  SUMMARY: string
  PRESIGNED_URL: string
  FULL_NAME: string
  MASTER_CUSTOMER_ID: string
}

interface CallDetailPanelProps {
  callId: string
  onBack: () => void
}

export function CallDetailPanel({ callId, onBack }: CallDetailPanelProps) {
  const [detail, setDetail] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/calls/detail?callId=${encodeURIComponent(callId)}`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || "Failed to load")
          return
        }
        const data = await res.json()
        setDetail(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load call detail")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [callId])

  if (loading) {
    return (
      <div>
        <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to Calls
        </button>
        <div className="loading"><div className="spinner" /> Loading call details (AI summarization in progress)...</div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div>
        <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to Calls
        </button>
        <div className="error-banner">{error || "Call not found"}</div>
      </div>
    )
  }

  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Calls
      </button>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2>Call Details</h2>
          <span className={`badge badge-${detail.SENTIMENT.toLowerCase()}`}>{detail.SENTIMENT}</span>
        </div>
        <p>{detail.CALL_ID} &mdash; {detail.FULL_NAME}</p>
      </div>

      {detail.PRESIGNED_URL && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <FileAudio size={16} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Call Recording</span>
          </div>
          <audio controls preload="auto" crossOrigin="anonymous" style={{ width: "100%" }}>
            <source src={detail.PRESIGNED_URL} type="audio/mp4" />
          </audio>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <a href={detail.PRESIGNED_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)" }}>
              Open recording directly
            </a>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {detail.MP4_FILE_PATH}
            </span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid var(--accent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>AI Summary</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)" }}>
          {detail.SUMMARY}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Sentiment Analysis</span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className={`sentiment-indicator ${detail.SENTIMENT.toLowerCase() === "positive" ? "active" : ""}`}>
            <div className="sentiment-icon positive">+</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Positive</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Customer expressed satisfaction</div>
            </div>
          </div>
          <div className={`sentiment-indicator ${detail.SENTIMENT.toLowerCase() === "neutral" ? "active" : ""}`}>
            <div className="sentiment-icon neutral">=</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Neutral</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Standard interaction</div>
            </div>
          </div>
          <div className={`sentiment-indicator ${detail.SENTIMENT.toLowerCase() === "negative" ? "active" : ""}`}>
            <div className="sentiment-icon negative">−</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Negative</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Customer expressed dissatisfaction</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Call Metadata</div>
        <div className="detail-row"><span className="detail-label">Date</span><span className="detail-value">{detail.CALL_DATE}</span></div>
        <div className="detail-row"><span className="detail-label">Agent</span><span className="detail-value"><User size={12} /> {detail.AGENT_NAME}</span></div>
        <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value"><Phone size={12} /> {detail.CALL_TYPE}</span></div>
        <div className="detail-row"><span className="detail-label">Duration</span><span className="detail-value"><Clock size={12} /> {detail.DURATION_SECONDS}s ({Math.round(detail.DURATION_SECONDS / 60)}m)</span></div>
        <div className="detail-row"><span className="detail-label">Customer ID</span><span className="detail-value" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{detail.MASTER_CUSTOMER_ID}</span></div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Full Transcript</div>
        <div className="transcript-box">{detail.TRANSCRIPTION}</div>
      </div>
    </div>
  )
}
