import type React from "react"
import "./history.css"

// Update the history page metadata
export const metadata = {
  title: "Transaction History | MegaSwap",
  description: "View your transaction history on MegaSwap",
}

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
