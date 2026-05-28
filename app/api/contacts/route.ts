import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") || ""
  const company = searchParams.get("company") || ""
  const words = q.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length < 2) {
    return Response.json([])
  }
  try {
    const safeWords = words.map(w => w.replace(/'/g, "''").toUpperCase())
    const conds = safeWords.map((w) => `UPPER(FULL_NAME) LIKE '%${w}%'`).join(" AND ")
    let companyCond = ""
    if (company) {
      const isSnowflake = company.toUpperCase().includes("SNOWFLAKE")
      companyCond = isSnowflake
        ? ` AND UPPER(SF_ACCOUNT_NAME) LIKE '%SNOWFLAKE%'`
        : ` AND SF_ACCOUNT_NAME = '${company.replace(/'/g, "''")}'`
    }
    const rows = await querySnowflake(`
      SELECT DISTINCT FULL_NAME, 'Snowflake Inc' AS SF_ACCOUNT_NAME, MASTER_CUSTOMER_ID
      FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
      WHERE ${conds}${companyCond}
      ORDER BY FULL_NAME
      LIMIT 50
    `)
    return Response.json(rows)
  } catch (e) {
    console.error(new Date().toISOString(), "[contacts]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to search contacts" },
      { status: 500 }
    )
  }
}
