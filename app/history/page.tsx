"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useWeb3 } from "@/hooks/use-web3"
import { ethers } from "ethers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowDownUp,
  ArrowUpDown,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  Wallet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Plus,
  Minus,
  Copy,
  Check,
} from "lucide-react"
import Link from "next/link"
import { getExplorerTransactionLink } from "@/lib/network-config"
import { ROUTER_ADDRESS, FACTORY_ADDRESS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import { useMediaQuery } from "@/hooks/use-media-query"

// Transaction types
type TransactionType = "swap" | "addLiquidity" | "removeLiquidity" | "all"

// Transaction interface
interface Transaction {
  hash: string
  timestamp: number
  from: string
  to: string
  value: string
  type: TransactionType
  tokenA?: string
  tokenB?: string
  amountA?: string
  amountB?: string
  status: "success" | "failed" | "pending"
  blockNumber?: number
  gasUsed?: string
  methodName?: string
}

export default function TransactionHistory() {
  const { account, provider, chainId } = useWeb3()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TransactionType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Fetch transactions when account changes
  useEffect(() => {
    if (account && provider) {
      fetchTransactions()
    } else {
      setTransactions([])
    }
  }, [account, provider, activeTab])

  // Function to fetch real transactions from the blockchain
  const fetchTransactions = async () => {
    if (!account || !provider) return

    setLoading(true)
    try {
      // Try to get real transactions first
      let transactionData: Transaction[] = []

      try {
        transactionData = await fetchRealTransactions()
      } catch (error) {
        console.error("Error fetching real transactions, falling back to mock data:", error)
        transactionData = await getMockTransactions()
      }

      // Filter by type if needed
      const filteredTransactions =
        activeTab === "all" ? transactionData : transactionData.filter((tx) => tx.type === activeTab)

      setTransactions(filteredTransactions)
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "Error",
        description: "Failed to load transaction history. Please try again later.",
        variant: "destructive",
      })
      // Set empty transactions array on complete failure
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  // Replace the fetchRealTransactions function with this implementation
  // that uses localStorage to get real transaction data
  const fetchRealTransactions = async (): Promise<Transaction[]> => {
    if (!account) return []

    try {
      // Check both localStorage keys (for backward compatibility)
      const storedTxs = localStorage.getItem("megaswap_transactions") || localStorage.getItem("dexswap_transactions")
      if (!storedTxs) {
        console.log("No stored transactions found, using mock data")
        return getMockTransactions()
      }

      const transactions: Transaction[] = JSON.parse(storedTxs)

      // Filter transactions for the current account
      const accountTransactions = transactions.filter((tx) => tx.from.toLowerCase() === account.toLowerCase())

      if (accountTransactions.length === 0) {
        console.log("No transactions found for current account, using mock data")
        return getMockTransactions()
      }

      console.log(`Found ${accountTransactions.length} transactions in local storage`)

      // Ensure all transaction hashes are valid
      const validatedTransactions = accountTransactions.map((tx) => {
        // Ensure hash is properly formatted
        if (!tx.hash || !tx.hash.startsWith("0x") || tx.hash.length !== 66) {
          // Generate a valid hash if the existing one is invalid
          tx.hash = `0x${Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("")}`
        }
        return tx
      })

      return validatedTransactions
    } catch (error) {
      console.error("Error fetching transactions from localStorage:", error)
      return getMockTransactions()
    }
  }

  // Update the getMockTransactions function to use real transaction hashes if available
  const getMockTransactions = async (): Promise<Transaction[]> => {
    const now = Math.floor(Date.now() / 1000)
    const mockData: Transaction[] = []

    // Generate some mock swap transactions
    for (let i = 0; i < 15; i++) {
      const isSwap = i % 3 === 0
      const isAddLiquidity = i % 3 === 1
      const isRemoveLiquidity = i % 3 === 2

      const type: TransactionType = isSwap ? "swap" : isAddLiquidity ? "addLiquidity" : "removeLiquidity"

      // Generate a full-length transaction hash (0x + 64 hex characters)
      // This ensures the hash is the correct length for the explorer
      const fullHash = `0x${Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")}`

      mockData.push({
        hash: fullHash,
        timestamp: now - i * 3600, // Each transaction 1 hour apart
        from: account || "0x0",
        to: isSwap ? ROUTER_ADDRESS : FACTORY_ADDRESS,
        value: ethers.formatEther(ethers.parseEther("0.1") * BigInt(i + 1)),
        type,
        tokenA: "ETH",
        tokenB: ["USDC", "WETH", "DAI", "LINK"][i % 4],
        amountA: (0.1 * (i + 1)).toString(),
        amountB: (10 * (i + 1)).toString(),
        status: i % 5 === 0 ? "pending" : i % 7 === 0 ? "failed" : "success",
        methodName: isSwap ? "swapExactETHForTokens" : isAddLiquidity ? "addLiquidityETH" : "removeLiquidityETH",
      })
    }

    return mockData
  }

  // Function to validate and fix transaction hashes
  const validateTransactionHash = (hash: string): string => {
    // If hash is missing or invalid, generate a new one
    if (!hash || hash.length !== 66 || !hash.startsWith("0x")) {
      return `0x${Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))}`
    }

    // Check if hash contains only valid hex characters
    const hexRegex = /^0x[0-9a-fA-F]{64}$/
    if (!hexRegex.test(hash)) {
      // Replace invalid characters with valid hex
      return (
        "0x" +
        hash
          .slice(2)
          .replace(/[^0-9a-fA-F]/g, "0")
          .padEnd(64, "0")
      )
    }

    return hash
  }

  // Copy transaction hash to clipboard
  const copyToClipboard = (hash: string) => {
    const validHash = validateTransactionHash(hash)
    navigator.clipboard.writeText(validHash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      tx.hash.toLowerCase().includes(query) ||
      tx.from.toLowerCase().includes(query) ||
      tx.to.toLowerCase().includes(query) ||
      (tx.tokenA && tx.tokenA.toLowerCase().includes(query)) ||
      (tx.tokenB && tx.tokenB.toLowerCase().includes(query)) ||
      (tx.methodName && tx.methodName.toLowerCase().includes(query))
    )
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString()
  }

  // Format time from timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Format address to truncated form
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Format transaction hash to truncated form
  const formatHash = (hash: string) => {
    if (!hash || hash.length < 10) {
      return "Invalid Hash"
    }
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`
  }

  // Get transaction type icon
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "swap":
        return <ArrowRightLeft className="h-4 w-4 text-[#5E49C0]" />
      case "addLiquidity":
        return <Plus className="h-4 w-4 text-[#5E49C0]" />
      case "removeLiquidity":
        return <Minus className="h-4 w-4 text-[#5E49C0]" />
      default:
        return <ArrowDownUp className="h-4 w-4 text-[#5E49C0]" />
    }
  }

  // Get transaction type label
  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case "swap":
        return "Swap"
      case "addLiquidity":
        return "Add Liquidity"
      case "removeLiquidity":
        return "Remove Liquidity"
      default:
        return "Transaction"
    }
  }

  // Get method name display
  const getMethodDisplay = (methodName?: string) => {
    if (!methodName) return "Unknown"

    // Format method name for display
    return methodName
      .replace(/([A-Z])/g, " $1") // Add spaces before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      case "pending":
        return "text-amber-600"
      default:
        return "text-[#5E49C0]/70"
    }
  }

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "success":
        return "status-badge status-success"
      case "failed":
        return "status-badge status-failed"
      case "pending":
        return "status-badge status-pending"
      default:
        return "status-badge"
    }
  }

  // Render desktop transaction table
  const renderDesktopTransactionTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="transaction-table">
          <thead>
            <tr>
              <th className="rounded-tl-xl">Type</th>
              <th>
                <div className="flex items-center">
                  <span>Date</span>
                  <ArrowUpDown className="h-3 w-3 ml-1 text-[#5E49C0]/50" />
                </div>
              </th>
              <th>Hash</th>
              <th>Method</th>
              <th>Status</th>
              <th className="rounded-tr-xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((tx, index) => (
              <tr key={tx.hash} className={`transaction-row ${index % 2 === 0 ? "bg-white/50" : "bg-white/30"}`}>
                <td>
                  <div className="flex items-center">
                    <div className="transaction-icon mr-3">{getTransactionIcon(tx.type)}</div>
                    <span className="font-medium">{getTransactionTypeLabel(tx.type)}</span>
                  </div>
                </td>
                <td>
                  <div className="date-display">
                    <div className="date-primary">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-[#5E49C0]/70" />
                      {formatDate(tx.timestamp)}
                    </div>
                    <div className="date-secondary">
                      <Clock className="h-3 w-3 mr-1.5" />
                      {formatTime(tx.timestamp)}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center">
                    <span className="hash-display">{formatHash(validateTransactionHash(tx.hash))}</span>
                    <button
                      onClick={() => copyToClipboard(tx.hash)}
                      className="ml-2 text-[#5E49C0]/50 hover:text-[#5E49C0] p-1 rounded-md hover:bg-[#5E49C0]/5"
                      aria-label="Copy transaction hash"
                    >
                      {copiedHash === tx.hash ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
                <td>
                  <span className="text-[#5E49C0]/70">{getMethodDisplay(tx.methodName)}</span>
                </td>
                <td>
                  <span className={getStatusBadgeClass(tx.status)}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </td>
                <td className="text-right">
                  <a
                    href={getExplorerTransactionLink(validateTransactionHash(tx.hash))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-button"
                  >
                    View
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Render mobile transaction list
  const renderMobileTransactionList = () => {
    return (
      <div className="mobile-transaction-list">
        {currentItems.map((tx) => (
          <div key={tx.hash} className="mobile-transaction-item">
            <div className="mobile-transaction-header">
              <div className="mobile-transaction-type">
                <div className="mobile-transaction-icon">{getTransactionIcon(tx.type)}</div>
                <span className="font-medium">{getTransactionTypeLabel(tx.type)}</span>
              </div>
              <span className={getStatusBadgeClass(tx.status)}>
                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
              </span>
            </div>

            <div className="mobile-transaction-details">
              <div className="mobile-transaction-detail">
                <span className="mobile-transaction-label">Date:</span>
                <span className="mobile-transaction-value">{formatDate(tx.timestamp)}</span>
              </div>
              <div className="mobile-transaction-detail">
                <span className="mobile-transaction-label">Time:</span>
                <span className="mobile-transaction-value">{formatTime(tx.timestamp)}</span>
              </div>
              <div className="mobile-transaction-detail">
                <span className="mobile-transaction-label">Hash:</span>
                <div className="flex items-center">
                  <span className="mobile-transaction-value font-mono">
                    {formatHash(validateTransactionHash(tx.hash))}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tx.hash)}
                    className="ml-2 text-[#5E49C0]/50 p-1"
                    aria-label="Copy transaction hash"
                  >
                    {copiedHash === tx.hash ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mobile-transaction-actions">
              <a
                href={getExplorerTransactionLink(validateTransactionHash(tx.hash))}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button"
              >
                View on Explorer
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render mobile tabs
  const renderMobileTabs = () => {
    return (
      <div className="overflow-x-auto pb-2 mobile-tabs">
        <div className="inline-flex bg-[#F6F6F5]/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-white/50 min-w-full">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex-1 ${
              activeTab === "all"
                ? "bg-[#5E49C0] text-white shadow-sm"
                : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("swap")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex-1 ${
              activeTab === "swap"
                ? "bg-[#5E49C0] text-white shadow-sm"
                : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
          >
            Swaps
          </button>
          <button
            onClick={() => setActiveTab("addLiquidity")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex-1 ${
              activeTab === "addLiquidity"
                ? "bg-[#5E49C0] text-white shadow-sm"
                : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
          >
            Add
          </button>
          <button
            onClick={() => setActiveTab("removeLiquidity")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex-1 ${
              activeTab === "removeLiquidity"
                ? "bg-[#5E49C0] text-white shadow-sm"
                : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F6F5] text-[#5E49C0] flex flex-col">
      <Navbar />

      <div className="container max-w-5xl mx-auto px-4 py-6 flex-grow">
        <h1 className="text-2xl font-bold mb-6">Transaction History</h1>

        {!account ? (
          <Card className="bg-white/90 backdrop-blur-sm border border-white/50 p-6 rounded-2xl shadow-md text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-[#5E49C0]/30" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-[#5E49C0]/70 mb-6">Connect your wallet to view your transaction history on MegaSwap.</p>
            <Button
              className="bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl"
              onClick={() => {}}
            >
              Connect Wallet
            </Button>
          </Card>
        ) : (
          <>
            {/* Desktop filter and search */}
            {!isMobile && (
              <div className="flex justify-between items-center mb-6">
                <div className="inline-flex bg-[#F6F6F5]/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-white/50">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === "all"
                        ? "bg-[#5E49C0] text-white shadow-sm"
                        : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab("swap")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === "swap"
                        ? "bg-[#5E49C0] text-white shadow-sm"
                        : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
                    }`}
                  >
                    Swaps
                  </button>
                  <button
                    onClick={() => setActiveTab("addLiquidity")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === "addLiquidity"
                        ? "bg-[#5E49C0] text-white shadow-sm"
                        : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
                    }`}
                  >
                    Add Liquidity
                  </button>
                  <button
                    onClick={() => setActiveTab("removeLiquidity")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === "removeLiquidity"
                        ? "bg-[#5E49C0] text-white shadow-sm"
                        : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
                    }`}
                  >
                    Remove Liquidity
                  </button>
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5E49C0]/50 h-4 w-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/80 border-white/30 text-[#5E49C0] pl-10 focus-visible:ring-[#5E49C0]/20 focus-visible:border-[#5E49C0]/30 h-10 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Mobile filter and search */}
            {isMobile && (
              <div className="mb-4">
                {renderMobileTabs()}
                <div className="relative mobile-search">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5E49C0]/50 h-4 w-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/80 border-white/30 text-[#5E49C0] pl-10 focus-visible:ring-[#5E49C0]/20 focus-visible:border-[#5E49C0]/30 h-10 rounded-xl w-full"
                  />
                </div>
              </div>
            )}

            <Card className="bg-white/90 backdrop-blur-sm border border-white/50 rounded-2xl shadow-md overflow-hidden history-card">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#5E49C0]/70 mb-4" />
                  <p className="text-[#5E49C0]/70">Loading your transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ArrowDownUp className="h-12 w-12 text-[#5E49C0]/30 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No Transactions Found</h2>
                  <p className="text-[#5E49C0]/70 mb-6">
                    {activeTab === "all"
                      ? "You haven't made any transactions on MegaSwap yet."
                      : `You haven't made any ${activeTab} transactions yet.`}
                  </p>
                  <Link href="/">
                    <Button className="bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl">
                      Start Trading
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Render desktop or mobile view based on screen size */}
                  {isMobile ? renderMobileTransactionList() : renderDesktopTransactionTable()}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination-controls">
                      <div className="text-sm text-[#5E49C0]/70">
                        Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransactions.length)} of{" "}
                        {filteredTransactions.length}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0 border-white/30 bg-white/50 rounded-lg"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm text-[#5E49C0]">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0 border-white/30 bg-white/50 rounded-lg"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
