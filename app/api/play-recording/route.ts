import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get("file")
  if (!file) return new Response("file param required", { status: 400 })

  try {
    const safe = file.replace(/'/g, "''").replace(/[^a-zA-Z0-9_.\-]/g, "")
    if (!safe) return new Response("Invalid file name", { status: 400 })

    const rows = await querySnowflake(`
      SELECT GET_PRESIGNED_URL(@CUSTOMER_360.PUBLIC.CALL_RECORDINGS_PUBLIC, '${safe}', 3600) AS URL
    `)

    if (rows.length === 0 || !rows[0].URL) {
      return new Response("File not found", { status: 404 })
    }

    const presignedUrl = rows[0].URL as string
    const fileRes = await fetch(presignedUrl)

    if (!fileRes.ok) {
      return new Response("Failed to fetch recording", { status: 502 })
    }

    const arrayBuffer = await fileRes.arrayBuffer()

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mp4",
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (e) {
    console.error("[play-recording]", e)
    return new Response("Error streaming recording", { status: 500 })
  }
}
