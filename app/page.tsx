"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Swap } from "@/components/swap"
import { Liquidity } from "@/components/liquidity"
import { Footer } from "@/components/footer"

export default function Home() {
  const [activeTab, setActiveTab] = useState("swap")

  return (
    <div className="min-h-screen bg-[#F6F6F5] text-[#5E49C0] flex flex-col">
      <Navbar />
      <div className="container max-w-[92%] sm:max-w-md mx-auto pt-6 sm:pt-8 px-3 sm:px-3 pb-6 sm:pb-10 flex-grow">
        <div className="w-full">
          {/* Tab Navigation */}
          <div className="grid w-full grid-cols-2 mb-5 sm:mb-6 bg-white/80 backdrop-blur-sm p-1.5 sm:p-1.5 rounded-xl shadow-sm border border-white/50">
            <button
              className={`rounded-lg py-2.5 sm:py-2.5 text-sm sm:text-sm transition-all ${
                activeTab === "swap"
                  ? "bg-[#5E49C0] text-white font-medium shadow-sm"
                  : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
              }`}
              onClick={() => setActiveTab("swap")}
            >
              Swap
            </button>
            <button
              className={`rounded-lg py-2.5 sm:py-2.5 text-sm sm:text-sm transition-all ${
                activeTab === "liquidity"
                  ? "bg-[#5E49C0] text-white font-medium shadow-sm"
                  : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
              }`}
              onClick={() => setActiveTab("liquidity")}
            >
              Liquidity
            </button>
          </div>

          {/* Tab Content */}
          <div className="transition-all">
            {activeTab === "swap" && <Swap />}
            {activeTab === "liquidity" && <Liquidity />}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
