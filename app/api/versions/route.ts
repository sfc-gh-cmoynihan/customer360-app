import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const name = searchParams.get("name")

  try {
    let sql = ""
    if (id) {
      const safe = id.replace(/'/g, "''")
      sql = `
        SELECT SOURCE_SYSTEM, SOURCE_ID, FULL_NAME, EMAIL, PHONE,
               STREET, CITY, POSTAL_CODE, COUNTRY, PPSN_SSN,
               SF_ACCOUNT_NAME, MATCH_CONFIDENCE, MASTER_CUSTOMER_ID
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER
        WHERE MASTER_CUSTOMER_ID = '${safe}'
        ORDER BY SOURCE_SYSTEM, MATCH_CONFIDENCE DESC
      `
    } else if (name) {
      const safe = name.replace(/'/g, "''").toUpperCase()
      sql = `
        SELECT SOURCE_SYSTEM, SOURCE_ID, FULL_NAME, EMAIL, PHONE,
               STREET, CITY, POSTAL_CODE, COUNTRY, PPSN_SSN,
               SF_ACCOUNT_NAME, MATCH_CONFIDENCE, MASTER_CUSTOMER_ID
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER
        WHERE MASTER_CUSTOMER_ID IN (
          SELECT DISTINCT MASTER_CUSTOMER_ID FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER
          WHERE UPPER(FULL_NAME) LIKE '%${safe}%'
          AND MASTER_CUSTOMER_ID NOT LIKE 'MCR-SF-%'
        )
        ORDER BY MASTER_CUSTOMER_ID, SOURCE_SYSTEM, MATCH_CONFIDENCE DESC
        LIMIT 500
      `
    } else {
      return Response.json([])
    }
    const rows = await querySnowflake(sql)
    return Response.json(rows)
  } catch (e) {
    console.error(new Date().toISOString(), "[versions]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load versions" },
      { status: 500 }
    )
  }
}
