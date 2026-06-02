import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

function computeChurnScore(data: {
  sentiments: string[]
  activeContracts: number
  totalContracts: number
  totalSpend: number
  tenureMonths: number
  ageYears: number | null
}) {
  const { sentiments, activeContracts, totalContracts, totalSpend, tenureMonths, ageYears } = data

  const positiveCount = sentiments.filter(s => s === "Positive").length
  const negativeCount = sentiments.filter(s => s === "Negative").length
  const totalCalls = sentiments.length
  let sentimentScore = 50
  if (totalCalls > 0) {
    const ratio = (negativeCount - positiveCount) / totalCalls
    sentimentScore = Math.round(Math.max(0, Math.min(100, 50 + ratio * 50)))
  }

  let policyScore = 80
  if (activeContracts >= 5) policyScore = 0
  else if (activeContracts >= 3) policyScore = 20
  else if (activeContracts >= 2) policyScore = 40
  else if (activeContracts >= 1) policyScore = 60

  let spendScore = 80
  if (totalSpend >= 50000) spendScore = 0
  else if (totalSpend >= 20000) spendScore = 25
  else if (totalSpend >= 10000) spendScore = 50
  else if (totalSpend >= 5000) spendScore = 65

  let tenureScore = 80
  if (tenureMonths >= 60) tenureScore = 0
  else if (tenureMonths >= 36) tenureScore = 20
  else if (tenureMonths >= 24) tenureScore = 40
  else if (tenureMonths >= 12) tenureScore = 60

  let ageScore = 50
  if (ageYears !== null) {
    if (ageYears >= 35 && ageYears <= 55) ageScore = 10
    else if (ageYears >= 25 && ageYears <= 65) ageScore = 30
    else if (ageYears < 25) ageScore = 70
    else ageScore = 60
  }

  const weighted = Math.round(
    sentimentScore * 0.25 +
    policyScore * 0.20 +
    spendScore * 0.20 +
    tenureScore * 0.20 +
    ageScore * 0.15
  )

  let riskLevel = "Low"
  if (weighted > 60) riskLevel = "High"
  else if (weighted > 30) riskLevel = "Medium"

  return {
    score: weighted,
    riskLevel,
    factors: {
      sentiment: { score: sentimentScore, weight: 25, detail: `${positiveCount} positive, ${negativeCount} negative of ${totalCalls} calls` },
      policies: { score: policyScore, weight: 20, detail: `${activeContracts} active of ${totalContracts} total` },
      spend: { score: spendScore, weight: 20, detail: `€${totalSpend.toLocaleString()} lifetime` },
      tenure: { score: tenureScore, weight: 20, detail: `${Math.round(tenureMonths)} months` },
      age: { score: ageScore, weight: 15, detail: ageYears !== null ? `${ageYears} years old` : "Unknown" }
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  try {
    const safe = id.replace(/'/g, "''")

    const [contracts, dependents, calls, tenure, profile] = await Promise.all([
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
      `),
      querySnowflake(`
        SELECT SENTIMENT
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_CALLS
        WHERE MASTER_CUSTOMER_ID = '${safe}'
      `),
      querySnowflake(`
        SELECT MIN(CREATED_DATE) AS FIRST_SEEN
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER
        WHERE MASTER_CUSTOMER_ID = '${safe}'
      `),
      querySnowflake(`
        SELECT DATE_OF_BIRTH
        FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
        WHERE MASTER_CUSTOMER_ID = '${safe}'
        LIMIT 1
      `)
    ])

    const totalPremiums = contracts.length
    const totalCost = contracts.reduce((sum: number, c: any) => sum + (parseFloat(c.CONTRACT_VALUE) || 0), 0)
    const activeContracts = contracts.filter((c: any) => c.STATUS?.toLowerCase() === "active").length

    let tier = "Bronze"
    if (totalCost >= 50000) tier = "Gold"
    else if (totalCost >= 20000) tier = "Silver"

    const sentiments = calls.map((c: any) => c.SENTIMENT)

    let tenureMonths = 12
    if (tenure.length > 0 && tenure[0].FIRST_SEEN) {
      const firstSeen = new Date(tenure[0].FIRST_SEEN)
      tenureMonths = (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    }

    let ageYears: number | null = null
    if (profile.length > 0 && profile[0].DATE_OF_BIRTH) {
      const dob = new Date(profile[0].DATE_OF_BIRTH)
      ageYears = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    }

    const churn = computeChurnScore({
      sentiments,
      activeContracts,
      totalContracts: totalPremiums,
      totalSpend: totalCost,
      tenureMonths,
      ageYears
    })

    return Response.json({
      totalPremiums,
      totalCost,
      tier,
      contracts,
      dependents,
      churn
    })
  } catch (e) {
    console.error(new Date().toISOString(), "[customer-summary]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load summary" },
      { status: 500 }
    )
  }
}
