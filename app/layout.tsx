import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Customer 360",
  description: "Unified customer master record search with AI-powered insights",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
