"use client"
import { useState } from "react"
import { Brain, FileText } from "lucide-react"

interface SearchResult {
  CONTRACT_TEXT: string
  CONTRACT_TITLE: string
  CONTRACT_ID: string
  CUSTOMER_NAME: string
  STATUS: string
  CONTRACT_VALUE: string
}

export function ContractSearchPanel() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch(`/api/contracts/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h2>AI Contract Search</h2>
        <p>Semantic search across contract text using Cortex Search</p>
      </div>

      <div className="card">
        <div className="input-group" style={{ marginBottom: 16 }}>
          <label><Brain size={12} /> Natural Language Query</label>
          <input
            type="search"
            placeholder="e.g. termination clause, SLA penalties, data protection, GDPR compliance..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
        </div>
        <button className="btn btn-primary" onClick={doSearch}>
          <Brain size={14} /> Search with AI
        </button>
      </div>

      {loading && <div className="loading"><div className="spinner" /> Searching contracts with AI...</div>}

      {results.length > 0 && (
        <>
          <div className="info-banner">
            Found {results.length} relevant contract sections
          </div>

          {results.map((r, i) => (
            <div key={i} className="contract-card">
              <div className="contract-header">
                <div>
                  <div className="contract-title"><FileText size={14} /> {r.CONTRACT_TITLE}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                    {r.CONTRACT_ID} | {r.CUSTOMER_NAME}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`badge badge-${(r.STATUS || "").toLowerCase()}`}>{r.STATUS}</span>
                  {Number(r.CONTRACT_VALUE) > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>EUR {Number(r.CONTRACT_VALUE).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="transcript-box" style={{ marginTop: 12 }}>
                {(r.CONTRACT_TEXT || "").slice(0, 2000)}
              </div>
            </div>
          ))}
        </>
      )}

      {!loading && results.length === 0 && query && (
        <div className="empty-state">
          <Brain size={32} />
          <p>No matching contracts found. Try different search terms.</p>
        </div>
      )}
    </div>
  )
}
