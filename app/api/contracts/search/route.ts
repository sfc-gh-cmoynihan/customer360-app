import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  if (!q) {
    return Response.json([])
  }

  try {
    const searchParams_json = JSON.stringify({
      query: q,
      columns: ["CONTRACT_TEXT", "CONTRACT_TITLE", "CONTRACT_ID", "CUSTOMER_NAME", "STATUS", "CONTRACT_VALUE"],
      limit: 5
    })
    const safe = searchParams_json.replace(/'/g, "''")
    const rows = await querySnowflake(`
      SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
        'CUSTOMER_360.PUBLIC.CONTRACT_SEARCH_SERVICE',
        '${safe}'
      ) AS RESULT
    `)
    const raw = rows[0]?.RESULT
    if (!raw) {
      return Response.json([])
    }
    const parsed = JSON.parse(raw)
    return Response.json(parsed.results || [])
  } catch (e) {
    console.error(new Date().toISOString(), "[contract-search]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to search contracts" },
      { status: 500 }
    )
  }
}
