import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

let cachedFile: { name: string; buffer: ArrayBuffer; ts: number } | null = null

async function getFileBuffer(file: string): Promise<ArrayBuffer> {
  if (cachedFile && cachedFile.name === file && Date.now() - cachedFile.ts < 3600000) {
    return cachedFile.buffer
  }

  const safe = file.replace(/'/g, "''").replace(/[^a-zA-Z0-9_.\-]/g, "")
  if (!safe) throw new Error("Invalid file name")

  const rows = await querySnowflake(`
    SELECT GET_PRESIGNED_URL(@CUSTOMER_360.PUBLIC.CALL_RECORDINGS_PUBLIC, '${safe}', 3600) AS URL
  `)

  if (rows.length === 0 || !rows[0].URL) throw new Error("File not found")

  const fileRes = await fetch(rows[0].URL as string)
  if (!fileRes.ok) throw new Error("Failed to fetch recording")

  const buffer = await fileRes.arrayBuffer()
  cachedFile = { name: file, buffer, ts: Date.now() }
  return buffer
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get("file")
  if (!file) return new Response("file param required", { status: 400 })

  try {
    const buffer = await getFileBuffer(file)
    const total = buffer.byteLength
    const range = request.headers.get("range")

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : total - 1
        const chunk = buffer.slice(start, end + 1)
        return new Response(chunk, {
          status: 206,
          headers: {
            "Content-Type": "audio/mp4",
            "Content-Length": chunk.byteLength.toString(),
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
          },
        })
      }
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mp4",
        "Content-Length": total.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (e) {
    console.error("[play-recording]", e)
    const msg = e instanceof Error ? e.message : "Error streaming recording"
    return new Response(msg, { status: 500 })
  }
}
