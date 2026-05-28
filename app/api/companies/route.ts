import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

const SNOWFLAKE_VARIANTS_FILTER = `
  SF_ACCOUNT_NAME NOT LIKE '%Snowflake%'
  OR SF_ACCOUNT_NAME = 'Snowflake Inc'
`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") || ""
  if (q.length < 2) {
    return Response.json([])
  }
  try {
    const safe = q.replace(/'/g, "''").toUpperCase()
    const isSnowflakeSearch = safe.includes("SNOWFLAKE")

    let sql: string
    if (isSnowflakeSearch) {
      sql = `
        SELECT 'Snowflake Inc' AS SF_ACCOUNT_NAME
        UNION ALL
        SELECT DISTINCT SF_ACCOUNT_NAME
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
        WHERE UPPER(SF_ACCOUNT_NAME) LIKE '%${safe}%'
        AND SF_ACCOUNT_NAME IS NOT NULL
        AND UPPER(SF_ACCOUNT_NAME) NOT LIKE '%SNOWFLAKE%'
        ORDER BY SF_ACCOUNT_NAME
        LIMIT 50
      `
    } else {
      sql = `
        SELECT DISTINCT SF_ACCOUNT_NAME
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
        WHERE UPPER(SF_ACCOUNT_NAME) LIKE '%${safe}%'
        AND SF_ACCOUNT_NAME IS NOT NULL
        AND (${SNOWFLAKE_VARIANTS_FILTER})
        ORDER BY SF_ACCOUNT_NAME
        LIMIT 50
      `
    }
    const rows = await querySnowflake(sql)
    return Response.json(rows.map((r: any) => r.SF_ACCOUNT_NAME))
  } catch (e) {
    console.error(new Date().toISOString(), "[companies]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to search companies" },
      { status: 500 }
    )
  }
}
