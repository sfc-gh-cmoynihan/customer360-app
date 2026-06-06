import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const callId = searchParams.get("callId")

  if (!callId) {
    return Response.json({ error: "callId required" }, { status: 400 })
  }

  try {
    const safe = callId.replace(/'/g, "''")
    const sql = `
      SELECT c.CALL_ID, c.CALL_DATE, c.DURATION_SECONDS, c.AGENT_NAME,
             c.CALL_TYPE, c.SENTIMENT, c.MP4_FILE_PATH, c.TRANSCRIPTION,
             c.MASTER_CUSTOMER_ID,
             COALESCE(c.SUMMARY, 'No summary available') AS SUMMARY,
             g.FULL_NAME
      FROM CUSTOMER_360.PUBLIC.CUSTOMER_CALLS c
      JOIN CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE g ON c.MASTER_CUSTOMER_ID = g.MASTER_CUSTOMER_ID
      WHERE c.CALL_ID = '${safe}'
      LIMIT 1
    `
    const rows = await querySnowflake(sql)
    if (rows.length === 0) {
      return Response.json({ error: "Call not found" }, { status: 404 })
    }
    const row = rows[0]
    const fileName = (row.MP4_FILE_PATH || "").replace("@CUSTOMER_360.PUBLIC.CALL_RECORDINGS_STAGE/", "")
    row.PRESIGNED_URL = fileName ? `/api/play-recording?file=${encodeURIComponent(fileName)}` : ""
    return Response.json(row)
  } catch (e) {
    console.error(new Date().toISOString(), "[call-detail]", e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load call detail" },
      { status: 500 }
    )
  }
}
