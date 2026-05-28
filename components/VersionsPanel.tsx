"use client"
import { useState, useEffect } from "react"
import { Users, Database } from "lucide-react"

interface VersionRecord {
  SOURCE_SYSTEM: string
  SOURCE_ID: string
  FULL_NAME: string
  EMAIL: string
  PHONE: string
  STREET: string
  CITY: string
  POSTAL_CODE: string
  COUNTRY: string
  PPSN_SSN: string
  SF_ACCOUNT_NAME: string
  MATCH_CONFIDENCE: number
  MASTER_CUSTOMER_ID: string
}

interface VersionsPanelProps {
  customerId?: string
}

export function VersionsPanel({ customerId }: VersionsPanelProps) {
  const [idInput, setIdInput] = useState(customerId || "")
  const [nameInput, setNameInput] = useState("")
  const [records, setRecords] = useState<VersionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"summary" | "full">("summary")

  const doSearch = async (id?: string) => {
    const searchId = id || idInput
    if (!searchId && !nameInput) return
    setLoading(true)
    const params = searchId ? `id=${encodeURIComponent(searchId)}` : `name=${encodeURIComponent(nameInput)}`
    const res = await fetch(`/api/versions?${params}`)
    setRecords(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    if (customerId) {
      setIdInput(customerId)
      doSearch(customerId)
    }
  }, [customerId])

  const clusters = records.reduce<Record<string, VersionRecord[]>>((acc, r) => {
    const key = r.MASTER_CUSTOMER_ID
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const clusterIds = Object.keys(clusters)

  return (
    <div>
      <div className="page-header">
        <h2>All Versions</h2>
        <p>View all source system records for a customer cluster</p>
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
          <Users size={14} /> Search Versions
        </button>
      </div>

      {loading && <div className="loading"><div className="spinner" /> Loading versions...</div>}

      {clusterIds.length > 0 && (
        <div className="info-banner">
          Found {records.length} records across {clusterIds.length} cluster(s)
        </div>
      )}

      {clusterIds.map((mid) => {
        const cluster = clusters[mid]
        const best = cluster[0]
        const sapCount = cluster.filter((r) => r.SOURCE_SYSTEM === "SAP").length
        const sfCount = cluster.filter((r) => r.SOURCE_SYSTEM === "SALESFORCE").length

        return (
          <div key={mid} className="cluster-card">
            <div className="cluster-header">
              <h3>{mid} ({cluster.length} versions)</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="badge badge-active"><Database size={10} /> SAP: {sapCount}</span>
                <span className="badge badge-neutral"><Database size={10} /> SF: {sfCount}</span>
              </div>
            </div>
            <div className="cluster-body">
              <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{best.FULL_NAME}</strong> | {best.EMAIL || "N/A"} | {best.PHONE || "N/A"} | {best.CITY || "N/A"}
              </div>

              <div className="tabs-inline">
                <button className={`tab-inline ${viewMode === "summary" ? "active" : ""}`} onClick={() => setViewMode("summary")}>Summary</button>
                <button className={`tab-inline ${viewMode === "full" ? "active" : ""}`} onClick={() => setViewMode("full")}>Full Details</button>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Source ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>City</th>
                      {viewMode === "full" && <th>Street</th>}
                      {viewMode === "full" && <th>Postal Code</th>}
                      {viewMode === "full" && <th>Country</th>}
                      {viewMode === "full" && <th>Account</th>}
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cluster.map((r, i) => (
                      <tr key={i}>
                        <td><span className={`badge ${r.SOURCE_SYSTEM === "SAP" ? "badge-active" : "badge-neutral"}`}>{r.SOURCE_SYSTEM}</span></td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.SOURCE_ID}</td>
                        <td>{r.FULL_NAME}</td>
                        <td>{r.EMAIL || "-"}</td>
                        <td>{r.PHONE || "-"}</td>
                        <td>{r.CITY || "-"}</td>
                        {viewMode === "full" && <td>{r.STREET || "-"}</td>}
                        {viewMode === "full" && <td>{r.POSTAL_CODE || "-"}</td>}
                        {viewMode === "full" && <td>{r.COUNTRY || "-"}</td>}
                        {viewMode === "full" && <td>{r.SF_ACCOUNT_NAME || "-"}</td>}
                        <td>{r.MATCH_CONFIDENCE ? `${(r.MATCH_CONFIDENCE * 100).toFixed(0)}%` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
