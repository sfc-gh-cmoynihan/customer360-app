"use client"
import { useState, useEffect } from "react"
import { Headphones, Play } from "lucide-react"

interface Recording {
  CALL_ID: string
  SENTIMENT: string
  MP4_FILE_PATH: string
  TRANSCRIPTION: string
  SUMMARY: string
  PRESIGNED_URL: string
  FULL_NAME: string
}

interface RecordingsPanelProps {
  customerId?: string
}

export function RecordingsPanel({ customerId }: RecordingsPanelProps) {
  const [idInput, setIdInput] = useState(customerId || "")
  const [nameInput, setNameInput] = useState("")
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = async (id?: string) => {
    const searchId = id || idInput
    if (!searchId && !nameInput) return
    setLoading(true)
    const params = searchId ? `id=${encodeURIComponent(searchId)}` : `name=${encodeURIComponent(nameInput)}`
    const res = await fetch(`/api/recordings?${params}`)
    const data = await res.json()
    setRecordings(data)
    setLoading(false)
  }

  useEffect(() => {
    if (customerId) {
      setIdInput(customerId)
      doSearch(customerId)
    }
  }, [customerId])

  return (
    <div>
      <div className="page-header">
        <h2>Call Recordings</h2>
        <p>Access recordings with AI-generated summaries via Cortex SUMMARIZE</p>
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
        <button className="btn btn-primary" onClick={doSearch}>
          <Headphones size={14} /> Load Recordings
        </button>
      </div>

      {loading && <div className="loading"><div className="spinner" /> Loading recordings (AI summarization in progress)...</div>}

      {recordings.length > 0 && (
        <>
          <div className="info-banner">
            Found {recordings.length} recording(s) for {recordings[0].FULL_NAME}
          </div>

          {recordings.map((rec) => (
            <div key={rec.CALL_ID} className="contract-card">
              <div className="contract-header">
                <div>
                  <div className="contract-title">{rec.CALL_ID}</div>
                  <span className={`badge badge-${rec.SENTIMENT.toLowerCase()}`} style={{ marginTop: 4 }}>{rec.SENTIMENT}</span>
                </div>
                {rec.PRESIGNED_URL && (
                  <a href={rec.PRESIGNED_URL} target="_blank" rel="noopener noreferrer" className="btn">
                    <Play size={14} /> Play Recording
                  </a>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="detail-label" style={{ marginBottom: 4 }}>AI Summary</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)" }}>{rec.SUMMARY}</div>
              </div>
              <div>
                <div className="detail-label" style={{ marginBottom: 4 }}>Transcript (excerpt)</div>
                <div className="transcript-box">{rec.TRANSCRIPTION.slice(0, 500)}{rec.TRANSCRIPTION.length > 500 ? "..." : ""}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
