import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

const TABLE_SCHEMAS: Record<string, string> = {
  contracts: `Table: CUSTOMER_360.PUBLIC.CUSTOMER_CONTRACTS
Columns: CONTRACT_ID (TEXT), MASTER_CUSTOMER_ID (TEXT), CUSTOMER_NAME (TEXT), CONTRACT_TITLE (TEXT), CONTRACT_DATE (DATE), EXPIRY_DATE (DATE), CONTRACT_VALUE (NUMBER in euros), STATUS (TEXT: Active/Expired/Pending), SIGNED_BY_CUSTOMER (TEXT), SIGNED_BY_PROVIDER (TEXT), SIGNATURE_DATE (DATE)
Note: Do NOT select PDF_STAGE_PATH or CONTRACT_TEXT columns`,
  calls: `Table: CUSTOMER_360.PUBLIC.CUSTOMER_CALLS
Columns: CALL_ID (TEXT), MASTER_CUSTOMER_ID (TEXT), CALL_DATE (TIMESTAMP), DURATION_SECONDS (NUMBER), AGENT_NAME (TEXT), CALL_TYPE (TEXT: Inbound/Outbound/Support), SENTIMENT (TEXT: Positive/Negative/Neutral), SUMMARY (TEXT)`,
  customers: `Table: CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
Columns: MASTER_CUSTOMER_ID (TEXT), SOURCE_SYSTEM (TEXT: SALESFORCE/SAP/WEB), FULL_NAME (TEXT), FIRST_NAME (TEXT), LAST_NAME (TEXT), EMAIL (TEXT), PHONE (TEXT), MOBILE_PHONE (TEXT), CITY (TEXT), COUNTRY (TEXT), POSTAL_CODE (TEXT), STREET (TEXT), SF_ACCOUNT_NAME (TEXT), TITLE (TEXT), DEPARTMENT (TEXT), MATCH_CONFIDENCE (FLOAT), RECORD_COUNT (NUMBER), DATE_OF_BIRTH (DATE)`,
  web: `Table: CUSTOMER_360.PUBLIC.WEB_ACTIVITY
Columns: ACTIVITY_ID (TEXT), MASTER_CUSTOMER_ID (TEXT), ACTIVITY_TYPE (TEXT), PAGE_URL (TEXT), SESSION_DURATION_SECONDS (NUMBER), PAGES_VIEWED (NUMBER), CHANNEL (TEXT: organic/paid/social/email/direct), DEVICE_TYPE (TEXT: desktop/mobile/tablet), BROWSER (TEXT), ACTIVITY_DATE (TIMESTAMP), FORM_SUBMITTED (BOOLEAN), FORM_NAME (TEXT), CAMPAIGN_SOURCE (TEXT), CAMPAIGN_MEDIUM (TEXT)`,
  dependents: `Table: CUSTOMER_360.PUBLIC.CUSTOMER_DEPENDENTS
Columns: DEPENDENT_ID (TEXT), MASTER_CUSTOMER_ID (TEXT), FULL_NAME (TEXT), DATE_OF_BIRTH (DATE), GENDER (TEXT), RELATIONSHIP (TEXT: Spouse/Child/Parent), DRIVER_STATUS (TEXT), LICENSE_TYPE (TEXT)`,
}

function routeQuestion(question: string): string[] {
  const q = question.toLowerCase()
  const routes: string[] = []
  if (q.match(/contract|expir|active contract|pending|signed|revenue|average contract/)) routes.push("contracts")
  if (q.match(/call|sentiment|agent_name|duration|negative|positive|neutral|churn/)) routes.push("calls")
  if (q.match(/customer|record count|source system|top 10|name|email|city|country|department/)) routes.push("customers")
  if (q.match(/web|session|channel|device|browser|page|campaign|form/)) routes.push("web")
  if (q.match(/dependent|family|spouse|child|relationship|license/)) routes.push("dependents")
  if (routes.length === 0) routes.push("customers")
  return routes
}

async function generateAndRunSQL(question: string, schemas: string[], model: string): Promise<string | null> {
  const schemaText = schemas.map(s => TABLE_SCHEMAS[s]).join("\n\n")
  const escapedQ = question.replace(/'/g, "''")

  const prompt = `You are a Snowflake SQL generator. Output ONLY the SQL query with no other text, no explanation, no markdown fences, no comments. Just raw SQL.
Rules:
- Use fully qualified table names (CUSTOMER_360.PUBLIC.TABLE_NAME)
- Only use columns from the schema below
- NEVER use SELECT * - always list specific columns
- For DATE columns, use TO_CHAR(col, 'DD Mon YYYY') to format dates
- LIMIT 20
- Output ONLY the SQL, nothing else

${schemaText}

Question: ${escapedQ}
SQL:`

  const escapedPrompt = prompt.replace(/'/g, "''")

  try {
    const rows = await querySnowflake(`
      SELECT SNOWFLAKE.CORTEX.COMPLETE('${model}', '${escapedPrompt}') AS SQL_QUERY
    `)

    if (!rows || rows.length === 0) return null

    let sql = (rows[0].SQL_QUERY || "").trim()
    sql = sql.replace(/^```sql\s*/i, "").replace(/```\s*$/, "").trim()
    const sqlMatch = sql.match(/(?:^|\n)((?:SELECT|WITH)\b[\s\S]*?)(;|$)/i)
    if (sqlMatch) sql = sqlMatch[1].trim()
    if (sql.toUpperCase().startsWith("SELECT") || sql.toUpperCase().startsWith("WITH")) {
      if (!sql.includes("LIMIT")) sql += " LIMIT 20"

      const dataRows = await querySnowflake(sql)
      if (!dataRows || dataRows.length === 0) return "No results found for that query."

      if (dataRows.length === 1 && Object.keys(dataRows[0]).length <= 3) {
        return Object.entries(dataRows[0]).map(([k, v]) => `**${k.replace(/_/g, " ")}**: ${v}`).join(" | ")
      }

      const cols = Object.keys(dataRows[0])
      let table = "| " + cols.join(" | ") + " |\n"
      table += "| " + cols.map(() => "---").join(" | ") + " |\n"
      for (const row of dataRows.slice(0, 20)) {
        table += "| " + cols.map(c => row[c] ?? "").join(" | ") + " |\n"
      }
      return table
    }
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("SQL compilation") || msg.includes("does not exist")) {
      return `*Query error: ${msg.slice(0, 300)}*`
    }
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages array required" }, { status: 400 })
    }

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user")
    const question = lastUserMsg?.content?.[0]?.text || lastUserMsg?.content || ""

    if (!question) {
      return Response.json({ error: "No question found" }, { status: 400 })
    }

    const llmModel = model || "llama3.1-70b"
    const schemas = routeQuestion(question)
    const answer = await generateAndRunSQL(question, schemas, llmModel)

    if (answer) {
      return Response.json({ answer })
    }

    return Response.json({ answer: "I couldn't generate a valid query for that question. Try rephrasing or ask about customers, contracts, calls, web activity, or dependents." })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[agent] error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
