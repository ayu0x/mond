import type React from "react"
import "../docs/docs.css"

// Update the docs page metadata
export const metadata = {
  title: "Documentation | FactorySwap",
  description: "Learn how to use FactorySwap to swap tokens and provide liquidity on Monad Testnet",
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
