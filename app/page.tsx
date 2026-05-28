"use client"
import { useState } from "react"
import { Search, Users, Phone, Headphones, FileText, Brain } from "lucide-react"
import { SearchPanel } from "@/components/SearchPanel"
import { VersionsPanel } from "@/components/VersionsPanel"
import { CallsPanel } from "@/components/CallsPanel"
import { RecordingsPanel } from "@/components/RecordingsPanel"
import { ContractsPanel } from "@/components/ContractsPanel"
import { ContractSearchPanel } from "@/components/ContractSearchPanel"

const NAV_ITEMS = [
  { id: "search", label: "Search", icon: Search },
  { id: "versions", label: "All Versions", icon: Users },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "recordings", label: "Recordings", icon: Headphones },
  { id: "contracts", label: "Contracts", icon: FileText },
  { id: "semantic", label: "AI Search", icon: Brain },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState("search")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedCustomerName, setSelectedCustomerName] = useState("")

  const handleCustomerSelect = (id: string, name: string) => {
    setSelectedCustomerId(id)
    setSelectedCustomerName(name)
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Customer 360</h1>
          <p>Master Record Search</p>
        </div>
        {selectedCustomerName && (
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
            <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>SELECTED</div>
            <div style={{ color: "var(--accent)", fontWeight: 600 }}>{selectedCustomerName}</div>
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{selectedCustomerId}</div>
          </div>
        )}
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {activeTab === "search" && <SearchPanel onCustomerSelect={handleCustomerSelect} />}
        {activeTab === "versions" && <VersionsPanel customerId={selectedCustomerId} />}
        {activeTab === "calls" && <CallsPanel customerId={selectedCustomerId} />}
        {activeTab === "recordings" && <RecordingsPanel customerId={selectedCustomerId} />}
        {activeTab === "contracts" && <ContractsPanel customerId={selectedCustomerId} />}
        {activeTab === "semantic" && <ContractSearchPanel />}
      </main>
    </div>
  )
}
