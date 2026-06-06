"use client"
import { useState, useEffect, useRef } from "react"
import { Building, User, Shield, Users, Car, TrendingDown, Activity, Mail, Phone, Hash, Search as SearchIcon } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

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

interface ChurnFactor {
  score: number
  weight: number
  detail: string
}

interface ChurnData {
  score: number
  riskLevel: string
  factors: {
    sentiment: ChurnFactor
    policies: ChurnFactor
    spend: ChurnFactor
    tenure: ChurnFactor
    age: ChurnFactor
  }
}

interface CustomerSummary {
  totalPremiums: number
  totalCost: number
  tier: string
  contracts: { CONTRACT_TITLE: string; CONTRACT_VALUE: string; STATUS: string }[]
  dependents: Dependent[]
  churn?: ChurnData
}

interface SearchPanelProps {
  onCustomerSelect?: (id: string, name: string) => void
}

const TIER_STYLES: Record<string, { bg: string; color: string }> = {
  Gold: { bg: "rgba(255, 193, 7, 0.15)", color: "#f59e0b" },
  Silver: { bg: "rgba(148, 163, 184, 0.15)", color: "#64748b" },
  Bronze: { bg: "rgba(180, 83, 9, 0.15)", color: "#b45309" },
}

const CHURN_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  Low: { bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a", label: "LOW RISK" },
  Medium: { bg: "rgba(249, 115, 22, 0.12)", color: "#ea580c", label: "MEDIUM RISK" },
  High: { bg: "rgba(220, 38, 38, 0.12)", color: "#dc2626", label: "HIGH RISK" },
}

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export function SearchPanel({ onCustomerSelect }: SearchPanelProps) {
  const [companyQuery, setCompanyQuery] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("")
  const [contactQuery, setContactQuery] = useState("")
  const [emailQuery, setEmailQuery] = useState("colm.moynihan@snowflake.com")
  const [phoneQuery, setPhoneQuery] = useState("")
  const [idQuery, setIdQuery] = useState("")
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

  const searchByField = async (field: "email" | "phone" | "id", value: string) => {
    setSummary(null)
    setLoading(true)
    const res = await fetch(`/api/search?${field}=${encodeURIComponent(value)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
    if (data.length > 0) {
      setSelectedCustomerId(data[0].MASTER_CUSTOMER_ID)
      onCustomerSelect?.(data[0].MASTER_CUSTOMER_ID, data[0].FULL_NAME)
      loadSummary(data[0].MASTER_CUSTOMER_ID)
    }
  }

  const tierStyle = summary ? TIER_STYLES[summary.tier] || TIER_STYLES.Bronze : null
  const churnStyle = summary?.churn ? CHURN_STYLES[summary.churn.riskLevel] || CHURN_STYLES.Medium : null

  const premiumChartData = summary?.contracts.map(c => ({
    name: c.CONTRACT_TITLE.replace(" Insurance", "").replace(" Protection", " Prot."),
    value: parseFloat(c.CONTRACT_VALUE) || 0
  })).filter(d => d.value > 0) || []

  const churnFactorData = summary?.churn ? [
    { name: "Sentiment", score: summary.churn.factors.sentiment.score, fill: summary.churn.factors.sentiment.score > 50 ? "#ef4444" : "#10b981" },
    { name: "Policies", score: summary.churn.factors.policies.score, fill: summary.churn.factors.policies.score > 50 ? "#ef4444" : "#10b981" },
    { name: "Spend", score: summary.churn.factors.spend.score, fill: summary.churn.factors.spend.score > 50 ? "#ef4444" : "#10b981" },
    { name: "Tenure", score: summary.churn.factors.tenure.score, fill: summary.churn.factors.tenure.score > 50 ? "#ef4444" : "#10b981" },
    { name: "Age", score: summary.churn.factors.age.score, fill: summary.churn.factors.age.score > 50 ? "#ef4444" : "#10b981" },
  ] : []

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

      <div className="search-row" style={{ marginTop: 8 }}>
        <div className="input-group">
          <label><Mail size={12} /> Email</label>
          <input
            type="text"
            placeholder="e.g. colm.moynihan@snowflake.com"
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && emailQuery.length >= 3 && searchByField("email", emailQuery)}
          />
        </div>
        <div className="input-group">
          <label><Phone size={12} /> Phone</label>
          <input
            type="text"
            placeholder="e.g. 0872487665"
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && phoneQuery.length >= 3 && searchByField("phone", phoneQuery)}
          />
        </div>
        <div className="input-group">
          <label><Hash size={12} /> Global Customer ID</label>
          <input
            type="text"
            placeholder="e.g. SF-SF-0033r00003hMYRAAA4"
            value={idQuery}
            onChange={(e) => setIdQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && idQuery.length >= 3 && searchByField("id", idQuery)}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="btn"
          style={{ padding: "10px 24px", fontSize: 14, fontWeight: 600, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
          onClick={() => {
            if (emailQuery.length >= 3) searchByField("email", emailQuery)
            else if (phoneQuery.length >= 3) searchByField("phone", phoneQuery)
            else if (idQuery.length >= 3) searchByField("id", idQuery)
            else if (companyQuery.length >= 2) selectCompany(companyQuery)
          }}
        >
          <SearchIcon size={16} /> Search
        </button>
      </div>

      {loading && <div className="loading"><div className="spinner" /> Searching...</div>}

      {summary && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Customer Summary</div>
            <div style={{ display: "flex", gap: 8 }}>
              {churnStyle && summary.churn && (
                <span style={{ padding: "4px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, background: churnStyle.bg, color: churnStyle.color, letterSpacing: "0.05em" }}>
                  <TrendingDown size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  CHURN: {summary.churn.score}/100 {churnStyle.label}
                </span>
              )}
              {tierStyle && (
                <span style={{ padding: "4px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, background: tierStyle.bg, color: tierStyle.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {summary.tier}
                </span>
              )}
            </div>
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
            {summary.churn && (
              <div className="stat-card" style={{ borderColor: churnStyle?.color, borderWidth: 2 }}>
                <div className="stat-value" style={{ color: churnStyle?.color }}>{summary.churn.score}</div>
                <div className="stat-label">Churn Score</div>
              </div>
            )}
          </div>

          {summary.churn && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Activity size={14} /> Churn Risk Factors
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={churnFactorData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={65} />
                    <Tooltip formatter={(v: number) => [`${v}/100`, "Risk"]} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {churnFactorData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {premiumChartData.length > 0 && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Shield size={14} /> Premium Breakdown
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={premiumChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name} €${value.toLocaleString()}`} labelLine={true} style={{ fontSize: 12 }}>
                        {premiumChartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`€${v.toLocaleString()}`, "Value"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {summary.churn && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: churnStyle?.bg, borderRadius: 8, border: `1px solid ${churnStyle?.color}22` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: churnStyle?.color, marginBottom: 8 }}>Factor Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {Object.entries(summary.churn.factors).map(([key, f]) => (
                  <div key={key} style={{ fontSize: 11, textAlign: "center" }}>
                    <div style={{ fontWeight: 600, textTransform: "capitalize", marginBottom: 2 }}>{key}</div>
                    <div style={{ color: f.score > 50 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>{f.score}/100</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{f.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
