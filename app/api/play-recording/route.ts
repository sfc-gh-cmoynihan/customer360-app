import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get("file")
  if (!file) return new Response("file param required", { status: 400 })

  try {
    const safe = file.replace(/'/g, "''")
    const rows = await querySnowflake(`
      SELECT BUILD_SCOPED_FILE_URL(@CUSTOMER_360.PUBLIC.CALL_RECORDINGS_STAGE, '${safe}') AS URL
    `)
    if (rows.length === 0 || !rows[0].URL) {
      return new Response("File not found", { status: 404 })
    }
    return Response.json({ url: rows[0].URL })
  } catch (e) {
    console.error("[play-recording]", e)
    return new Response("Error generating URL", { status: 500 })
  }
}
