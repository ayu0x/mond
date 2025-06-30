"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "./use-web3"
import { ROUTER_ADDRESS, FACTORY_ADDRESS } from "@/lib/constants"

// Transaction types
export type TransactionType = "swap" | "addLiquidity" | "removeLiquidity" | "all"

// Transaction interface
export interface Transaction {
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

export function useTransactionHistory() {
  const { account, provider, chainId } = useWeb3()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Method to identify transaction type from input data
  const identifyTransactionType = useCallback((data: string): { type: TransactionType; methodName: string } => {
    // Default values
    let type: TransactionType = "swap"
    let methodName = "Unknown"

    // Check method signatures
    if (data.startsWith("0x38ed1739")) {
      // swapExactTokensForTokens
      type = "swap"
      methodName = "swapExactTokensForTokens"
    } else if (data.startsWith("0x7ff36ab5")) {
      // swapExactETHForTokens
      type = "swap"
      methodName = "swapExactETHForTokens"
    } else if (data.startsWith("0x4a25d94a")) {
      // swapTokensForExactTokens
      type = "swap"
      methodName = "swapTokensForExactTokens"
    } else if (data.startsWith("0x18cbafe5")) {
      // swapExactTokensForETH
      type = "swap"
      methodName = "swapExactTokensForETH"
    } else if (data.startsWith("0xe8e33700")) {
      // addLiquidity
      type = "addLiquidity"
      methodName = "addLiquidity"
    } else if (data.startsWith("0xf305d719")) {
      // addLiquidityETH
      type = "addLiquidity"
      methodName = "addLiquidityETH"
    } else if (data.startsWith("0xbaa2abde")) {
      // removeLiquidity
      type = "removeLiquidity"
      methodName = "removeLiquidity"
    } else if (data.startsWith("0x02751cec")) {
      // removeLiquidityETH
      type = "removeLiquidity"
      methodName = "removeLiquidityETH"
    }

    return { type, methodName }
  }, [])

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (type: TransactionType = "all") => {
      if (!account || !provider) {
        setTransactions([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Get the current block number
        const currentBlock = await provider.getBlockNumber()

        // We'll look back 10000 blocks for transactions (adjust as needed)
        const fromBlock = Math.max(0, currentBlock - 10000)

        // Get transaction history for the account
        const history: Transaction[] = []

        // In a real implementation, you would use an indexer or API to get this data
        // For now, we'll use a simplified approach by getting the last few transactions

        // Get the transaction count for the account
        const txCount = await provider.getTransactionCount(account)

        // Get the last 20 transactions (adjust as needed)
        const txPromises = []
        for (let i = txCount - 1; i >= Math.max(0, txCount - 20); i--) {
          txPromises.push(provider.getTransaction(account, i).catch(() => null))
        }

        const txs = (await Promise.all(txPromises)).filter((tx) => tx !== null)

        // Process each transaction
        for (const tx of txs) {
          if (!tx) continue

          // Skip transactions not related to our DEX
          if (
            tx.to?.toLowerCase() !== ROUTER_ADDRESS.toLowerCase() &&
            tx.to?.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()
          ) {
            continue
          }

          // Get transaction receipt to check status
          const receipt = await provider.getTransactionReceipt(tx.hash)
          if (!receipt) continue

          // Determine transaction type based on method signature
          const { type, methodName } = identifyTransactionType(tx.data)

          // Skip if filtering by type and this doesn't match
          if (type !== "all" && type !== type) continue

          // Get block to get timestamp
          const block = await provider.getBlock(receipt.blockNumber)

          // Create transaction object
          history.push({
            hash: tx.hash,
            timestamp: block ? block.timestamp : Math.floor(Date.now() / 1000),
            from: tx.from,
            to: tx.to || "",
            value: ethers.formatEther(tx.value || 0),
            type,
            status: receipt.status ? "success" : "failed",
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString() || "0",
            methodName,
          })
        }

        // Sort by timestamp (newest first)
        history.sort((a, b) => b.timestamp - a.timestamp)

        setTransactions(history)
      } catch (error) {
        console.error("Error fetching transactions:", error)
        setError("Failed to load transaction history")

        // Generate mock data as fallback
        const mockData = generateMockTransactions()
        setTransactions(mockData)
      } finally {
        setLoading(false)
      }
    },
    [account, provider, identifyTransactionType],
  )

  // Generate mock transactions for testing
  const generateMockTransactions = useCallback((): Transaction[] => {
    const now = Math.floor(Date.now() / 1000)
    const mockData: Transaction[] = []

    // Generate some mock transactions
    for (let i = 0; i < 15; i++) {
      const isSwap = i % 3 === 0
      const isAddLiquidity = i % 3 === 1
      const isRemoveLiquidity = i % 3 === 2

      const type: TransactionType = isSwap ? "swap" : isAddLiquidity ? "addLiquidity" : "removeLiquidity"

      // Generate a full-length transaction hash (0x + 64 hex characters)
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
  }, [account])

  // Load transactions when account changes
  useEffect(() => {
    if (account && provider) {
      fetchTransactions()
    } else {
      setTransactions([])
    }
  }, [account, provider, fetchTransactions])

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    generateMockTransactions,
  }
}
