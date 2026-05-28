import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  try {
    const safe = id.replace(/'/g, "''")

    const [contracts, dependents] = await Promise.all([
      querySnowflake(`
        SELECT CONTRACT_TITLE, CONTRACT_VALUE, STATUS
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_CONTRACTS
        WHERE MASTER_CUSTOMER_ID = '${safe}'
        ORDER BY CONTRACT_DATE DESC
      `),
      querySnowflake(`
        SELECT FULL_NAME, DATE_OF_BIRTH, GENDER, RELATIONSHIP, DRIVER_STATUS, LICENSE_TYPE
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_DEPENDENTS
        WHERE MASTER_CUSTOMER_ID = '${safe}'
        ORDER BY DATE_OF_BIRTH
      `)
    ])

    const totalPremiums = contracts.length
    const totalCost = contracts.reduce((sum: number, c: any) => sum + (parseFloat(c.CONTRACT_VALUE) || 0), 0)

    let tier = "Bronze"
    if (totalCost >= 50000) tier = "Gold"
    else if (totalCost >= 20000) tier = "Silver"

    return Response.json({
      totalPremiums,
      totalCost,
      tier,
      contracts,
      dependents
    })
  } catch (e) {
    console.error(new Date().toISOString(), "[customer-summary]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load summary" },
      { status: 500 }
    )
  }
}
