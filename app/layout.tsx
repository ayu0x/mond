import type React from "react"
import "@/styles/globals.css"
import { Inter } from "next/font/google"
import { Web3Provider } from "@/hooks/use-web3"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

// Load Inter font with variable support
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

// Update the metadata description to be more comprehensive
export const metadata = {
  title: "FactorySwap | Modern Token Exchange on Monad Testnet",
  description:
    "FactorySwap is a cutting-edge decentralized exchange (DEX) built on the Monad Testnet, offering lightning-fast token swaps with minimal fees. Our platform provides seamless liquidity provision, intuitive trading interface, and secure transaction history tracking. Experience the next generation of DeFi with FactorySwap's optimized trading algorithms and user-friendly design.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png" },
    shortcut: { url: "/favicon.ico" },
  },
  manifest: "/site.webmanifest",
  themeColor: "#5E49C0",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme="light" storageKey="dex-theme">
          <Web3Provider>
            {children}
            <Toaster />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}

import "./globals.css"


import './globals.css'