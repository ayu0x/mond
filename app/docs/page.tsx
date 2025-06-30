"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ArrowRight, Copy, Check, ChevronRight, Menu } from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("contracts")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F6F6F5] text-[#5E49C0] flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] text-white py-8">
        <div className="container max-w-5xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-2">FactorySwap Documentation</h1>
          <p className="text-white/80 text-base">Learn how to use FactorySwap on Monad Testnet</p>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="border-b border-white/30 bg-[#F6F6F5]/80 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-[#5E49C0]/70">
            <Link href="/" className="hover:text-[#5E49C0]">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-[#5E49C0] font-medium">Documentation</span>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-6 flex-grow">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex justify-between items-center bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 p-4 mb-4 shadow-sm">
            <span className="font-medium text-[#5E49C0]">
              {activeTab === "contracts" && "Contract Addresses"}
              {activeTab === "swap" && "How to Swap"}
              {activeTab === "liquidity" && "Managing Liquidity"}
              {activeTab === "faq" && "FAQ"}
            </span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-[#5E49C0]/70 p-1.5 rounded-lg hover:bg-[#5E49C0]/5"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <div className={`md:w-64 flex-shrink-0 ${mobileMenuOpen ? "block" : "hidden md:block"}`}>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 overflow-hidden sticky top-20 shadow-md">
              <nav className="p-2">
                <button
                  onClick={() => {
                    setActiveTab("contracts")
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm ${
                    activeTab === "contracts"
                      ? "bg-[#5E49C0] text-white font-medium"
                      : "text-[#5E49C0]/80 hover:bg-[#5E49C0]/5"
                  }`}
                >
                  Contract Addresses
                </button>
                <button
                  onClick={() => {
                    setActiveTab("swap")
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm ${
                    activeTab === "swap"
                      ? "bg-[#5E49C0] text-white font-medium"
                      : "text-[#5E49C0]/80 hover:bg-[#5E49C0]/5"
                  }`}
                >
                  How to Swap
                </button>
                <button
                  onClick={() => {
                    setActiveTab("liquidity")
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm ${
                    activeTab === "liquidity"
                      ? "bg-[#5E49C0] text-white font-medium"
                      : "text-[#5E49C0]/80 hover:bg-[#5E49C0]/5"
                  }`}
                >
                  Managing Liquidity
                </button>
                <button
                  onClick={() => {
                    setActiveTab("faq")
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm ${
                    activeTab === "faq"
                      ? "bg-[#5E49C0] text-white font-medium"
                      : "text-[#5E49C0]/80 hover:bg-[#5E49C0]/5"
                  }`}
                >
                  FAQ
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Contracts Tab */}
            {activeTab === "contracts" && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 p-5 shadow-md">
                <h2 className="text-xl font-semibold mb-4">Contract Addresses</h2>
                <p className="text-[#5E49C0]/80 mb-5 text-sm">
                  FactorySwap is deployed on Monad Testnet with the following contract addresses:
                </p>

                <div className="space-y-4">
                  <div className="bg-[#F6F6F5]/50 p-4 rounded-xl border border-white/30">
                    <div className="flex justify-between items-center">
                      <div className="pr-2">
                        <h3 className="font-medium text-[#5E49C0] text-base">WETH (Wrapped ETH)</h3>
                        <p className="text-sm text-[#5E49C0]/70 font-mono mt-1 break-all">
                          0xae732c8A5dBEC88Af00294b23535DE38FAF59ccf
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard("0xae732c8A5dBEC88Af00294b23535DE38FAF59ccf", "weth")}
                        className="text-[#5E49C0]/70 hover:text-[#5E49C0] p-2 rounded-lg hover:bg-[#5E49C0]/5 flex-shrink-0"
                      >
                        {copiedText === "weth" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#F6F6F5]/50 p-4 rounded-xl border border-white/30">
                    <div className="flex justify-between items-center">
                      <div className="pr-2">
                        <h3 className="font-medium text-[#5E49C0] text-base">Factory</h3>
                        <p className="text-sm text-[#5E49C0]/70 font-mono mt-1 break-all">
                          0x38074c226Db8122579b354A2F18d1c7B81f7c1F3
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard("0x38074c226Db8122579b354A2F18d1c7B81f7c1F3", "factory")}
                        className="text-[#5E49C0]/70 hover:text-[#5E49C0] p-2 rounded-lg hover:bg-[#5E49C0]/5 flex-shrink-0"
                      >
                        {copiedText === "factory" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#F6F6F5]/50 p-4 rounded-xl border border-white/30">
                    <div className="flex justify-between items-center">
                      <div className="pr-2">
                        <h3 className="font-medium text-[#5E49C0] text-base">Router</h3>
                        <p className="text-sm text-[#5E49C0]/70 font-mono mt-1 break-all">
                          0x2feaE4103B311BAA4a7572A6B3792629DbD41670
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard("0x2feaE4103B311BAA4a7572A6B3792629DbD41670", "router")}
                        className="text-[#5E49C0]/70 hover:text-[#5E49C0] p-2 rounded-lg hover:bg-[#5E49C0]/5 flex-shrink-0"
                      >
                        {copiedText === "router" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Swap Tab */}
            {activeTab === "swap" && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 p-5 shadow-md">
                <h2 className="text-xl font-semibold mb-4">How to Swap Tokens</h2>

                <div className="space-y-5">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 bg-[#5E49C0] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-base mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#5E49C0] mb-2 text-base">Connect Your Wallet</h3>
                      <p className="text-[#5E49C0]/70 mb-6">
                        Click the "Connect Wallet" button in the top right corner and select your wallet provider.
                      </p>
                      <div className="bg-[#F6F6F5]/50 p-3 rounded-xl border border-white/30 text-sm text-[#5E49C0]/80">
                        <strong>Network Details:</strong>
                        <br />
                        Network Name: Monad
                        <br />
                        RPC URL: https://testnet-rpc.monad.xyz
                        <br />
                        Chain ID: 10143
                        <br />
                        Currency Symbol: MON
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 bg-[#5E49C0] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-base mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#5E49C0] mb-2 text-base">Select Tokens</h3>
                      <p className="text-[#5E49C0]/80 mb-3 text-sm">
                        Click on the token selector dropdown to choose the tokens you want to swap between.
                      </p>
                      <div className="text-sm text-[#5E49C0]/80 bg-[#F6F6F5]/50 p-3 rounded-xl border border-white/30">
                        <div className="mb-2">
                          <div className="font-medium">From Token</div>
                          <div>Select the token you want to swap from your wallet</div>
                        </div>
                        <div className="flex justify-center my-2">
                          <ArrowRight className="h-4 w-4 text-[#5E49C0]/60" />
                        </div>
                        <div>
                          <div className="font-medium">To Token</div>
                          <div>Select the token you want to receive</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 bg-[#5E49C0] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-base mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#5E49C0] mb-2 text-base">Enter Amount</h3>
                      <p className="text-[#5E49C0]/80 text-sm">
                        Enter the amount of tokens you want to swap in the "From" field. The estimated amount you'll
                        receive will be calculated automatically based on current pool rates.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 bg-[#5E49C0] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-base mt-0.5">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#5E49C0] mb-2 text-base">Review Swap Details</h3>
                      <p className="text-[#5E49C0]/80 mb-3 text-sm">
                        Check the exchange rate, price impact, and minimum received amount before proceeding.
                      </p>
                      <div className="bg-[#5E49C0]/5 p-3 rounded-xl border border-[#5E49C0]/10 text-sm text-[#5E49C0]/80">
                        <strong>Tip:</strong> A high price impact means your trade will significantly affect the price.
                        Consider reducing your trade size for better rates.
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 bg-[#5E49C0] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-base mt-0.5">
                      5
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#5E49C0] mb-2 text-base">Approve Token (if needed)</h3>
                      <p className="text-[#5E49C0]/80 mb-3 text-sm">
                        If you're swapping an ERC-20 token (not MON), you'll need to approve the token first. Click the
                        "Approve" button and confirm the transaction in your wallet.
                      </p>
                      <div className="bg-[#5E49C0]/5 p-3 rounded-xl border border-[#5E49C0]/10 text-sm text-[#5E49C0]/80">
                        <strong>Note:</strong> Token approvals are a one-time action per token. Once approved, you won't
                        need to approve that token again for future swaps.
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 bg-[#5E49C0] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-base mt-0.5">
                      6
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#5E49C0] mb-2 text-base">Confirm Swap</h3>
                      <p className="text-[#5E49C0]/80 text-sm">
                        Click the "Swap" button and confirm the transaction in your wallet. Once the transaction is
                        confirmed on the blockchain, your tokens will be swapped and sent to your wallet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Liquidity Tab */}
            {activeTab === "liquidity" && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 p-5 shadow-md">
                <h2 className="text-xl font-semibold mb-4">Managing Liquidity</h2>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="bg-[#5E49C0] h-5 w-1.5 rounded-full mr-3"></div>
                      <h3 className="text-lg font-medium text-[#5E49C0]">Adding Liquidity</h3>
                    </div>
                    <div className="space-y-4 pl-4">
                      <p className="text-[#5E49C0]/80 text-sm">
                        Providing liquidity allows you to earn fees from trades. Here's how to add liquidity:
                      </p>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          1
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Navigate to Liquidity</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            Click on the "Liquidity" tab in the main interface.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          2
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Select Token Pair</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            Choose the two tokens you want to provide liquidity for. You need to provide both tokens in
                            the pair.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          3
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Enter Amounts</h4>
                          <p className="text-[#5E49C0]/80 mb-3 text-sm">
                            Enter the amount for one token, and the interface will automatically calculate the required
                            amount of the other token based on the current exchange rate.
                          </p>
                          <div className="bg-[#F6F6F5]/50 p-3 rounded-xl border border-white/30 text-sm text-[#5E49C0]/80 mb-3">
                            <strong>Note:</strong> If the pool already exists, your token amounts will be automatically
                            adjusted to match the current pool ratio. This ensures you get the maximum LP tokens without
                            affecting the price.
                          </div>
                          <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/50 text-sm text-amber-800">
                            <strong>Important:</strong> Make sure you understand impermanent loss before providing
                            liquidity. The value of your deposited assets may change due to price fluctuations.
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          4
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Approve Tokens (if needed)</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            If you're adding ERC-20 tokens, you'll need to approve them first. Click the "Approve"
                            button for each token and confirm the transactions in your wallet.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          5
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Add Liquidity</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            Click the "Add Liquidity" button and confirm the transaction in your wallet. Once confirmed,
                            you'll receive LP tokens representing your share of the pool.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center mb-3">
                      <div className="bg-[#5E49C0] h-5 w-1.5 rounded-full mr-3"></div>
                      <h3 className="text-lg font-medium text-[#5E49C0]">Removing Liquidity</h3>
                    </div>
                    <div className="space-y-4 pl-4">
                      <p className="text-[#5E49C0]/80 text-sm">
                        You can withdraw your liquidity at any time. Here's how:
                      </p>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          1
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Navigate to Liquidity</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            Click on the "Liquidity" tab and then select "Remove" at the top.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          2
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Select Position</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            Your liquidity positions will be displayed. Click on the position you want to remove.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          3
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Choose Amount</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            Use the slider to select how much of your liquidity you want to remove (from 1% to 100%).
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 bg-[#F6F6F5]/70 text-[#5E49C0] rounded-full w-6 h-6 flex items-center justify-center font-medium text-sm mt-0.5">
                          4
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#5E49C0] text-base">Remove Liquidity</h4>
                          <p className="text-[#5E49C0]/80 text-sm">
                            Click the "Remove Liquidity" button and confirm the transaction in your wallet. Once
                            confirmed, you'll receive the tokens back in your wallet.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ Tab */}
            {activeTab === "faq" && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 p-5 shadow-md">
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>

                <div className="space-y-4">
                  <div className="border-b border-white/30 pb-4">
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">What is FactorySwap?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      FactorySwap is a decentralized exchange (DEX) running on Monad Testnet that allows users to swap
                      tokens and provide liquidity to earn fees.
                    </p>
                  </div>

                  <div className="border-b border-white/30 pb-4">
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">What is Monad Testnet?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      Monad Testnet is a test environment for the Monad blockchain, which is designed for
                      high-performance decentralized applications. It offers fast transactions with low fees and is
                      fully compatible with Ethereum smart contracts.
                    </p>
                  </div>

                  <div className="border-b border-white/30 pb-4">
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">How do I get tokens on Monad Testnet?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      You can get Monad Testnet MON tokens from the official faucet. For other tokens, you can use
                      FactorySwap to swap from MON once you have some.
                    </p>
                  </div>

                  <div className="border-b border-white/30 pb-4">
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">What is price impact?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      Price impact is the effect your trade will have on the market price. Larger trades relative to the
                      pool size will have a higher price impact, resulting in a less favorable exchange rate.
                    </p>
                  </div>

                  <div className="border-b border-white/30 pb-4">
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">What are LP tokens?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      Liquidity Provider (LP) tokens represent your share of a liquidity pool. When you add liquidity,
                      you receive LP tokens that you can later redeem to withdraw your share of the pool.
                    </p>
                  </div>

                  <div className="border-b border-white/30 pb-4">
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">What is impermanent loss?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      Impermanent loss occurs when the price of your tokens changes compared to when you deposited them.
                      If you provide liquidity and the price of one token rises significantly compared to the other, you
                      might have been better off holding the tokens instead of providing liquidity.
                    </p>
                  </div>

                  <div className="border-b border-white/30 pb-4">
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">How are swap fees calculated?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      FactorySwap charges a 0.3% fee on all swaps. These fees are distributed to liquidity providers
                      proportional to their share of the pool.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-[#5E49C0] mb-2 text-base">Why do I need to approve tokens?</h3>
                    <p className="text-[#5E49C0]/80 text-sm">
                      Token approvals are a security feature of ERC-20 tokens. Before the FactorySwap router contract
                      can move your tokens, you need to approve it to do so. This is a one-time action per token.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
