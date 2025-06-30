"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, AlertTriangle, History } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useWeb3 } from "@/hooks/use-web3"
import { NETWORK_CONFIG } from "@/lib/network-config"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Navbar() {
  const { account, connect, disconnect, isCorrectChain, switchNetwork, chainId } = useWeb3()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <nav className="border-b border-white/30 py-4 bg-[#F6F6F5]/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <div className="h-10 w-10 sm:h-10 sm:w-10 relative logo-container">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] opacity-90"></div>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg logo-text">
                F
              </div>
            </div>
            <span className="ml-3 text-lg sm:text-xl font-semibold text-[#5E49C0]">FactorySwap</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Navigation Links */}
          <Link
            href="/history"
            className={`flex items-center px-3 py-2 rounded-lg text-sm ${
              pathname === "/history"
                ? "bg-[#5E49C0]/10 text-[#5E49C0] font-medium"
                : "text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Link>

          <Link
            href="/docs"
            className={`flex items-center px-3 py-2 rounded-lg text-sm ${
              pathname === "/docs"
                ? "bg-[#5E49C0]/10 text-[#5E49C0] font-medium"
                : "text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
          >
            Docs
          </Link>

          {/* Network warning */}
          {account && !isCorrectChain && (
            <Button
              variant="destructive"
              size="sm"
              onClick={switchNetwork}
              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 h-10 text-sm"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Switch to {NETWORK_CONFIG.name}
            </Button>
          )}

          {account ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/20 backdrop-blur-sm text-[#5E49C0] hover:text-[#5E49C0] hover:bg-white/30 hover:border-white/50 h-10 text-sm rounded-xl"
                >
                  <Wallet className="mr-2 h-4 w-4 text-[#5E49C0]" />
                  {account.slice(0, 6)}...{account.slice(-4)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur-sm border-white/30 rounded-xl">
                <DropdownMenuItem
                  className="text-[#5E49C0] hover:bg-[#5E49C0]/5 cursor-pointer text-sm rounded-lg"
                  onClick={disconnect}
                >
                  Disconnect Wallet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={connect}
              size="sm"
              className="bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all h-10 text-sm rounded-xl"
            >
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/history"
            className={`p-2 rounded-lg ${
              pathname === "/history"
                ? "bg-[#5E49C0]/10 text-[#5E49C0]"
                : "text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
          >
            <History className="h-5 w-5" />
          </Link>

          {account ? (
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 py-0 text-sm border-white/30 bg-white/20 backdrop-blur-sm text-[#5E49C0]"
              onClick={disconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={connect}
              size="default"
              className="h-10 px-4 py-2 text-sm bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md rounded-xl font-medium"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
