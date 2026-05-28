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
        SELECT CONTRACT_ID, CONTRACT_TITLE, CUSTOMER_NAME, CONTRACT_DATE, EXPIRY_DATE,
               CONTRACT_VALUE, STATUS, SIGNED_BY_CUSTOMER, SIGNED_BY_PROVIDER, SIGNATURE_DATE,
               GET_PRESIGNED_URL(@CUSTOMER_360.PUBLIC.CONTRACT_DOCUMENTS_STAGE,
                 REPLACE(PDF_STAGE_PATH, '@CUSTOMER_360.PUBLIC.CONTRACT_DOCUMENTS_STAGE/', '')) AS PDF_URL
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_CONTRACTS
        WHERE MASTER_CUSTOMER_ID = '${safe}'
        ORDER BY CONTRACT_DATE DESC
      `
    } else if (name) {
      const words = name.replace(/'/g, "''").toUpperCase().split(/\s+/)
      const conds = words.map((w) => `UPPER(CUSTOMER_NAME) LIKE '%${w}%'`).join(" AND ")
      sql = `
        SELECT CONTRACT_ID, CONTRACT_TITLE, CUSTOMER_NAME, CONTRACT_DATE, EXPIRY_DATE,
               CONTRACT_VALUE, STATUS, SIGNED_BY_CUSTOMER, SIGNED_BY_PROVIDER, SIGNATURE_DATE,
               GET_PRESIGNED_URL(@CUSTOMER_360.PUBLIC.CONTRACT_DOCUMENTS_STAGE,
                 REPLACE(PDF_STAGE_PATH, '@CUSTOMER_360.PUBLIC.CONTRACT_DOCUMENTS_STAGE/', '')) AS PDF_URL
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_CONTRACTS
        WHERE ${conds}
        ORDER BY CONTRACT_DATE DESC
      `
    } else {
      return Response.json([])
    }
    const rows = await querySnowflake(sql)
    return Response.json(rows)
  } catch (e) {
    console.error(new Date().toISOString(), "[contracts]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load contracts" },
      { status: 500 }
    )
  }
}
