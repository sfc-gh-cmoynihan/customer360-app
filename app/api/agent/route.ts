import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

interface ToolRoute {
  keywords: string[]
  semanticView: string
  name: string
}

const TOOL_ROUTES: ToolRoute[] = [
  { keywords: ["contract", "contracts", "contract value", "expir", "active contract", "pending", "signed", "revenue", "average contract"], semanticView: "CUSTOMER_360.PUBLIC.SV_CONTRACTS", name: "Contracts" },
  { keywords: ["call", "calls", "sentiment", "agent_name", "duration", "negative sentiment", "positive", "neutral", "churn"], semanticView: "CUSTOMER_360.PUBLIC.SV_CALLS", name: "Calls" },
  { keywords: ["customer", "customers", "record count", "source system", "top 10", "name", "email", "city", "country", "department"], semanticView: "CUSTOMER_360.PUBLIC.SV_CUSTOMERS", name: "Customers" },
  { keywords: ["web", "session", "channel", "device", "browser", "page", "campaign", "form"], semanticView: "CUSTOMER_360.PUBLIC.SV_WEB_ACTIVITY", name: "Web Activity" },
  { keywords: ["dependent", "family", "spouse", "child", "relationship", "license"], semanticView: "CUSTOMER_360.PUBLIC.SV_DEPENDENTS", name: "Dependents" },
]

function routeQuestion(question: string): string[] {
  const q = question.toLowerCase()
  const matched = TOOL_ROUTES.filter(r => r.keywords.some(k => q.includes(k)))
  if (matched.length === 0) return [TOOL_ROUTES[2].semanticView]
  return [...new Set(matched.map(m => m.semanticView))]
}

function isSearchQuery(question: string): boolean {
  const q = question.toLowerCase()
  return q.includes("find contract") || q.includes("search contract") || q.includes("look for") || (q.includes("related to") && q.includes("contract"))
}

async function callCortexAnalyst(question: string, semanticView: string): Promise<{ sql: string; interpretation: string } | null> {
  const escapedQ = question.replace(/'/g, "''")
  const sql = `
    SELECT SNOWFLAKE.CORTEX.ANALYST(
      '${semanticView}',
      [{'role': 'user', 'content': [{'type': 'text', 'text': '${escapedQ}'}]}]
    ) AS result
  `
  try {
    const rows = await querySnowflake(sql)
    if (!rows || rows.length === 0) return null
    const raw = rows[0].RESULT || rows[0].result
    const result = typeof raw === "string" ? JSON.parse(raw) : raw
    const content = result?.message?.content || result?.content || []
    let sqlStatement = ""
    let interpretation = ""
    for (const item of content) {
      if (item.type === "sql") sqlStatement = item.statement
      if (item.type === "text") interpretation = item.text
    }
    return sqlStatement ? { sql: sqlStatement, interpretation } : null
  } catch {
    return null
  }
}

async function callCortexAnalystRest(question: string, semanticView: string): Promise<{ sql: string; interpretation: string } | null> {
  const fs = await import("fs")

  let token = ""
  let host = ""

  const SPCS_TOKEN_PATH = "/snowflake/session/token"
  try {
    token = fs.readFileSync(SPCS_TOKEN_PATH, "utf8").trim()
    host = process.env.SNOWFLAKE_HOST || ""
    if (!host && process.env.SNOWFLAKE_ACCOUNT) {
      const acct = process.env.SNOWFLAKE_ACCOUNT.replace(/_/g, "-")
      host = `${acct}.snowflakecomputing.com`
    }
  } catch {}

  if (!token) {
    const snowflake = (await import("snowflake-sdk")).default
    const { readTomlDefaultConnection } = await import("@/lib/snowflake")
    const tomlConn = readTomlDefaultConnection()
    if (!tomlConn) return null

    const connResult = await new Promise<{ token: string; host: string }>((resolve, reject) => {
      const config: Record<string, unknown> = { ...tomlConn, application: "Customer360App" }
      if ((tomlConn as Record<string, unknown>).host && !config.accessUrl) {
        config.accessUrl = `https://${(tomlConn as Record<string, unknown>).host}`
      }
      const conn = snowflake.createConnection(config as Parameters<typeof snowflake.createConnection>[0])
      conn.connect((err) => {
        if (err) { reject(err); return }
        const rest = (conn as unknown as { rest: { token: string } }).rest
        const h = (conn as unknown as { host: string }).host
        resolve({ token: rest.token, host: h })
        conn.destroy(() => {})
      })
    })
    token = connResult.token
    host = connResult.host
  }

  const url = `https://${host}/api/v2/cortex/analyst/message`
  const payload = {
    messages: [{ role: "user", content: [{ type: "text", text: question }] }],
    semantic_view: semanticView,
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Snowflake Token="${token}"`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...(process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ? {} : {}),
  })

  if (!res.ok) return null
  const data = await res.json()
  const content = data?.message?.content || []
  let sqlStatement = ""
  let interpretation = ""
  for (const item of content) {
    if (item.type === "sql") sqlStatement = item.statement
    if (item.type === "text") interpretation = item.text
  }
  return sqlStatement ? { sql: sqlStatement, interpretation } : null
}

async function callCortexSearch(question: string): Promise<string | null> {
  const escapedQ = question.replace(/'/g, "''")
  try {
    const rows = await querySnowflake(`
      SELECT PARSE_JSON(
        SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
          'CUSTOMER_360.PUBLIC.CONTRACT_SEARCH_SERVICE',
          '${escapedQ}',
          5
        )
      ):results AS results
    `)
    if (!rows || rows.length === 0) return null
    const raw = rows[0].RESULTS || rows[0].results
    const results = typeof raw === "string" ? JSON.parse(raw) : raw
    if (!results || results.length === 0) return null
    let output = "**Contract Search Results:**\n\n"
    for (const r of results) {
      output += `- **${r.CONTRACT_TITLE || r.contract_title}** (${r.CUSTOMER_NAME || r.customer_name}) - Status: ${r.STATUS || r.status}, Value: €${r.CONTRACT_VALUE || r.contract_value}\n`
    }
    return output
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages array required" }, { status: 400 })
    }

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user")
    const question = lastUserMsg?.content?.[0]?.text || lastUserMsg?.content || ""

    if (!question) {
      return Response.json({ error: "No question found" }, { status: 400 })
    }

    if (isSearchQuery(question)) {
      const searchResult = await callCortexSearch(question)
      if (searchResult) return Response.json({ answer: searchResult })
    }

    const semanticViews = routeQuestion(question)
    const results: string[] = []

    for (const sv of semanticViews) {
      const analystResult = await callCortexAnalystRest(question, sv)
      if (analystResult) {
        try {
          const rows = await querySnowflake(analystResult.sql)
          if (rows && rows.length > 0) {
            const viewName = TOOL_ROUTES.find(r => r.semanticView === sv)?.name || sv
            let table = ""
            if (rows.length === 1 && Object.keys(rows[0]).length <= 3) {
              const entries = Object.entries(rows[0]).map(([k, v]) => `**${k.replace(/_/g, " ")}**: ${v}`).join(" | ")
              table = entries
            } else {
              const cols = Object.keys(rows[0])
              table = "| " + cols.join(" | ") + " |\n"
              table += "| " + cols.map(() => "---").join(" | ") + " |\n"
              for (const row of rows.slice(0, 20)) {
                table += "| " + cols.map(c => row[c] ?? "").join(" | ") + " |\n"
              }
              if (rows.length > 20) table += `\n*...and ${rows.length - 20} more rows*`
            }
            results.push(`${analystResult.interpretation}\n\n${table}`)
          }
        } catch (sqlErr) {
          const msg = sqlErr instanceof Error ? sqlErr.message : String(sqlErr)
          results.push(`*Query error: ${msg.slice(0, 200)}*`)
        }
      }
    }

    if (results.length === 0) {
      const searchResult = await callCortexSearch(question)
      if (searchResult) return Response.json({ answer: searchResult })
      return Response.json({ answer: "I couldn't find relevant data for that question. Try asking about customers, contracts, calls, web activity, or dependents." })
    }

    return Response.json({ answer: results.join("\n\n---\n\n") })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[agent] error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
