"use client"
import { useState, useEffect, useRef } from "react"
import { Building, User, Shield, Users, Car } from "lucide-react"

interface SearchResult {
  MASTER_CUSTOMER_ID: string
  FULL_NAME: string
  SF_ACCOUNT_NAME: string
  EMAIL: string
  PHONE: string
  CITY: string
  COUNTRY: string
  PPSN_SSN: string
  TITLE: string
  RECORD_COUNT: number
}

interface ContactOption {
  FULL_NAME: string
  SF_ACCOUNT_NAME: string
  MASTER_CUSTOMER_ID: string
}

interface Dependent {
  FULL_NAME: string
  DATE_OF_BIRTH: string
  GENDER: string
  RELATIONSHIP: string
  DRIVER_STATUS: string
  LICENSE_TYPE: string
}

interface CustomerSummary {
  totalPremiums: number
  totalCost: number
  tier: string
  contracts: { CONTRACT_TITLE: string; CONTRACT_VALUE: string; STATUS: string }[]
  dependents: Dependent[]
}

interface SearchPanelProps {
  onCustomerSelect?: (id: string, name: string) => void
}

const TIER_STYLES: Record<string, { bg: string; color: string }> = {
  Gold: { bg: "rgba(255, 193, 7, 0.15)", color: "#f59e0b" },
  Silver: { bg: "rgba(148, 163, 184, 0.15)", color: "#64748b" },
  Bronze: { bg: "rgba(180, 83, 9, 0.15)", color: "#b45309" },
}

export function SearchPanel({ onCustomerSelect }: SearchPanelProps) {
  const [companyQuery, setCompanyQuery] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("")
  const [contactQuery, setContactQuery] = useState("")
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([])
  const [contactSuggestions, setContactSuggestions] = useState<ContactOption[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [summary, setSummary] = useState<CustomerSummary | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [loading, setLoading] = useState(false)
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const companyRef = useRef<HTMLDivElement>(null)
  const contactRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (companyQuery.length < 2) { setCompanySuggestions([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/companies?q=${encodeURIComponent(companyQuery)}`)
      const data = await res.json()
      setCompanySuggestions(data)
      setShowCompanyDropdown(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [companyQuery])

  useEffect(() => {
    const words = contactQuery.trim().split(/\s+/).filter(w => w.length > 0)
    if (words.length < 2 || !selectedCompany) { setContactSuggestions([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(contactQuery)}&company=${encodeURIComponent(selectedCompany)}`)
      const data = await res.json()
      setContactSuggestions(data)
      setShowContactDropdown(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [contactQuery, selectedCompany])

  const loadSummary = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customer-summary?id=${encodeURIComponent(customerId)}`)
      const data = await res.json()
      if (!data.error) setSummary(data)
    } catch {}
  }

  const selectCompany = async (company: string) => {
    setShowCompanyDropdown(false)
    setCompanyQuery(company)
    setSelectedCompany(company)
    setContactQuery("")
    setContactSuggestions([])
    setSummary(null)
    setLoading(true)
    const res = await fetch(`/api/search?company=${encodeURIComponent(company)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
    if (data.length > 0) {
      onCustomerSelect?.(data[0].MASTER_CUSTOMER_ID, data[0].FULL_NAME)
    }
  }

  const selectContact = async (contact: ContactOption) => {
    setShowContactDropdown(false)
    setContactQuery(contact.FULL_NAME)
    setSummary(null)
    setLoading(true)
    const res = await fetch(`/api/search?contactId=${encodeURIComponent(contact.MASTER_CUSTOMER_ID)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
    if (data.length > 0) {
      setSelectedCustomerId(data[0].MASTER_CUSTOMER_ID)
      onCustomerSelect?.(data[0].MASTER_CUSTOMER_ID, data[0].FULL_NAME)
      loadSummary(data[0].MASTER_CUSTOMER_ID)
    }
  }

  const handleRowClick = (r: SearchResult) => {
    setSelectedCustomerId(r.MASTER_CUSTOMER_ID)
    onCustomerSelect?.(r.MASTER_CUSTOMER_ID, r.FULL_NAME)
    loadSummary(r.MASTER_CUSTOMER_ID)
  }

  const handleCompanyChange = (value: string) => {
    setCompanyQuery(value)
    if (value !== selectedCompany) {
      setSelectedCompany("")
      setContactQuery("")
      setContactSuggestions([])
      setResults([])
      setSummary(null)
    }
  }

  const tierStyle = summary ? TIER_STYLES[summary.tier] || TIER_STYLES.Bronze : null

  return (
    <div>
      <div className="page-header">
        <h2>Customer Search</h2>
        <p>Search by company or contact name across 6.5M unified records</p>
      </div>

      <div className="search-row">
        <div className="input-group" ref={companyRef} style={{ position: "relative" }}>
          <label><Building size={12} /> Company</label>
          <input
            type="text"
            placeholder="e.g. Snowflake, Uber..."
            value={companyQuery}
            onChange={(e) => handleCompanyChange(e.target.value)}
            onFocus={() => companySuggestions.length > 0 && setShowCompanyDropdown(true)}
          />
          {showCompanyDropdown && companySuggestions.length > 0 && (
            <div className="dropdown-list">
              {companySuggestions.map((c) => (
                <div key={c} className="dropdown-item" onClick={() => selectCompany(c)}>{c}</div>
              ))}
            </div>
          )}
        </div>
        <div className="input-group" ref={contactRef} style={{ position: "relative" }}>
          <label><User size={12} /> Contact</label>
          <input
            type="text"
            placeholder={selectedCompany ? "Enter first and last name..." : "Select a company first..."}
            value={contactQuery}
            onChange={(e) => setContactQuery(e.target.value)}
            onFocus={() => contactSuggestions.length > 0 && setShowContactDropdown(true)}
            disabled={!selectedCompany}
            style={{ opacity: selectedCompany ? 1 : 0.5, cursor: selectedCompany ? "text" : "not-allowed" }}
          />
          {showContactDropdown && contactSuggestions.length > 0 && (
            <div className="dropdown-list">
              {contactSuggestions.map((c) => (
                <div key={c.MASTER_CUSTOMER_ID} className="dropdown-item" onClick={() => selectContact(c)}>
                  {c.FULL_NAME} <span style={{ color: "var(--text-muted)" }}>({c.SF_ACCOUNT_NAME || "N/A"})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <div className="loading"><div className="spinner" /> Searching...</div>}

      {summary && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Customer Summary</div>
            {tierStyle && (
              <span style={{ padding: "4px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, background: tierStyle.bg, color: tierStyle.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {summary.tier}
              </span>
            )}
          </div>

          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-value">{summary.totalPremiums}</div>
              <div className="stat-label">Total Premiums</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">&euro;{summary.totalCost.toLocaleString()}</div>
              <div className="stat-label">Total Premium Cost</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{summary.dependents.length}</div>
              <div className="stat-label">Dependents</div>
            </div>
          </div>

          {summary.contracts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Shield size={14} /> Premiums</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {summary.contracts.map((c) => (
                  <div key={c.CONTRACT_TITLE} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: 12 }}>
                    {c.CONTRACT_TITLE} <span style={{ color: "var(--text-muted)" }}>&euro;{parseFloat(c.CONTRACT_VALUE).toLocaleString()}</span>
                    <span className={`badge badge-${c.STATUS.toLowerCase()}`} style={{ marginLeft: 6 }}>{c.STATUS}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.dependents.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Users size={14} /> Children / Dependents</div>
              <div className="data-table-wrapper" style={{ maxHeight: 200 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>DOB</th>
                      <th>Gender</th>
                      <th>Driver</th>
                      <th>License</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.dependents.map((d) => (
                      <tr key={d.FULL_NAME}>
                        <td>{d.FULL_NAME}</td>
                        <td>{d.DATE_OF_BIRTH}</td>
                        <td>{d.GENDER}</td>
                        <td><Car size={12} /> {d.DRIVER_STATUS}</td>
                        <td>{d.LICENSE_TYPE}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="info-banner">
            Found {results.length} contact(s)
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Master ID</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>Versions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.MASTER_CUSTOMER_ID} onClick={() => handleRowClick(r)} style={{ cursor: "pointer", background: r.MASTER_CUSTOMER_ID === selectedCustomerId ? "var(--bg-hover)" : undefined }}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.MASTER_CUSTOMER_ID}</td>
                    <td>{r.FULL_NAME}</td>
                    <td>{r.SF_ACCOUNT_NAME}</td>
                    <td>{r.EMAIL || "-"}</td>
                    <td>{r.PHONE || "-"}</td>
                    <td>{r.CITY || "-"}</td>
                    <td>{r.COUNTRY || "-"}</td>
                    <td style={{ textAlign: "center" }}>{r.RECORD_COUNT}</td>
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
