import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get("company")
  const contactId = searchParams.get("contactId")

  try {
    let rows
    if (company) {
      const safe = company.replace(/'/g, "''")
      const isSnowflake = safe.toUpperCase().includes("SNOWFLAKE")
      const companyCond = isSnowflake
        ? `UPPER(SF_ACCOUNT_NAME) LIKE '%SNOWFLAKE%'`
        : `SF_ACCOUNT_NAME = '${safe}'`
      rows = await querySnowflake(`
        SELECT MASTER_CUSTOMER_ID, FULL_NAME, 'Snowflake Inc' AS SF_ACCOUNT_NAME, EMAIL, PHONE,
               CITY, COUNTRY, PPSN_SSN, TITLE, RECORD_COUNT
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
        WHERE ${companyCond}
        ORDER BY FULL_NAME
        LIMIT 100
      `)
    } else if (contactId) {
      const safe = contactId.replace(/'/g, "''")
      rows = await querySnowflake(`
        SELECT MASTER_CUSTOMER_ID, FULL_NAME, SF_ACCOUNT_NAME, EMAIL, PHONE,
               CITY, COUNTRY, PPSN_SSN, TITLE, RECORD_COUNT
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
        WHERE MASTER_CUSTOMER_ID = '${safe}'
      `)
    } else {
      return Response.json([])
    }
    return Response.json(rows)
  } catch (e) {
    console.error(new Date().toISOString(), "[search]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to search" },
      { status: 500 }
    )
  }
}
