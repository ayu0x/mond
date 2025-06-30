"use client"

import { Heart } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/30 py-5 bg-[#F6F6F5]/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4">
        {/* Mobile Footer (Stack vertically) */}
        <div className="flex flex-col items-center gap-4 sm:hidden">
          {/* Logo and name */}
          <div className="flex items-center">
            <div className="h-8 w-8 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] opacity-90"></div>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">F</div>
            </div>
            <span className="ml-2 text-base font-semibold text-[#5E49C0]">FactorySwap</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-3 w-full">
            <a
              href="/"
              className="px-4 py-2 bg-white/50 rounded-lg text-sm text-[#5E49C0] hover:bg-white/80 transition-colors shadow-sm"
            >
              Home
            </a>
            <a
              href="/docs"
              className="px-4 py-2 bg-white/50 rounded-lg text-sm text-[#5E49C0] hover:bg-white/80 transition-colors shadow-sm"
            >
              Docs
            </a>
            <a
              href="https://testnet.monadexplorer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/50 rounded-lg text-sm text-[#5E49C0] hover:bg-white/80 transition-colors shadow-sm"
            >
              Explorer
            </a>
          </div>

          {/* Copyright */}
          <div className="flex items-center text-sm text-[#5E49C0]/70 mt-2 bg-white/30 px-4 py-2 rounded-lg">
            <span className="flex items-center">
              Made with <Heart className="h-3.5 w-3.5 mx-1 text-[#5E49C0] fill-[#5E49C0]" /> on Monad
            </span>
          </div>
        </div>

        {/* Desktop Footer (Horizontal layout) */}
        <div className="hidden sm:flex sm:flex-row justify-between items-center gap-3">
          {/* Logo and name */}
          <div className="flex items-center">
            <div className="h-6 w-6 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] opacity-90"></div>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">F</div>
            </div>
            <span className="ml-2 text-base font-semibold text-[#5E49C0]">FactorySwap</span>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-sm text-[#5E49C0]/70 hover:text-[#5E49C0] transition-colors">
              Home
            </Link>
            <Link href="/docs" className="text-sm text-[#5E49C0]/70 hover:text-[#5E49C0] transition-colors">
              Docs
            </Link>
            <a
              href="https://testnet.monadexplorer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#5E49C0]/70 hover:text-[#5E49C0] transition-colors"
            >
              Explorer
            </a>
          </div>

          {/* Copyright */}
          <div className="flex items-center text-sm text-[#5E49C0]/70">
            <span className="flex items-center">
              Made with <Heart className="h-3.5 w-3.5 mx-1 text-[#5E49C0] fill-[#5E49C0]" /> on Monad
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
