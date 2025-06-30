"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowDown, Settings, Info, AlertCircle, AlertTriangle } from "lucide-react"
import { TokenSelector } from "@/components/token-selector"
import { useWeb3 } from "@/hooks/use-web3"
import { ethers } from "ethers"
import { ROUTER_ADDRESS, WETH_ADDRESS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { NETWORK_CONFIG, getExplorerTransactionLink } from "@/lib/network-config"
import { usePairInfo } from "@/hooks/use-pair-info"
import { useSwapEstimate } from "@/hooks/use-swap-estimate"

export function Swap() {
  const { account, provider, signer, getTokenBalance, getRouterContract, isCorrectChain, switchNetwork } = useWeb3()
  const { toast } = useToast()
  const [fromToken, setFromToken] = useState({
    address: "MON",
    symbol: "MON",
    logoURI: "https://docs.monad.xyz/img/monad_logo.png",
  })
  const [toToken, setToToken] = useState({
    address: "0x0000000000000000000000000000000000000000",
    symbol: "Select a token",
    logoURI: undefined,
  })
  const [fromAmount, setFromAmount] = useState("")
  const [fromBalance, setFromBalance] = useState("0")
  const [toBalance, setToBalance] = useState("0")
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [needsApproval, setNeedsApproval] = useState(false)

  // Get pair information - path and reserves
  const { path, reserves, pairExists } = usePairInfo(fromToken, toToken)

  // Get swap estimate with debouncing and caching
  const { toAmount, priceImpact, loading: estimateLoading } = useSwapEstimate(fromToken, toToken, fromAmount, path)

  useEffect(() => {
    if (account && provider) {
      updateBalances()
    }
  }, [account, provider, fromToken, toToken])

  // Check if approval is needed when fromToken or fromAmount changes
  useEffect(() => {
    checkApprovalNeeded()
  }, [fromToken, fromAmount, account])

  const handleImageError = useCallback((tokenAddress: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [tokenAddress]: true,
    }))
  }, [])

  const updateBalances = async () => {
    if (!account || !provider) return

    try {
      // Get fromToken balance
      try {
        if (fromToken.address === "ETH") {
          const balance = await provider.getBalance(account)
          setFromBalance(ethers.formatEther(balance))
        } else {
          const balance = await getTokenBalance(fromToken.address, account)
          setFromBalance(balance)
        }
      } catch (error) {
        console.error("Error getting fromToken balance:", error)
        setFromBalance("0")
      }

      // Get toToken balance
      try {
        if (toToken.address === "ETH") {
          const balance = await provider.getBalance(account)
          setToBalance(ethers.formatEther(balance))
        } else if (toToken.address === "0x0000000000000000000000000000000000000000") {
          setToBalance("0")
        } else {
          const balance = await getTokenBalance(toToken.address, account)
          setToBalance(balance)
        }
      } catch (error) {
        console.error("Error getting toToken balance:", error)
        setToBalance("0")
      }
    } catch (error) {
      console.error("Error updating balances:", error)
      // Don't reset balances on general error
    }
  }

  // Helper function to safely parse and format amounts
  const safeParseEther = useCallback((value: string): bigint => {
    try {
      // Limit decimal places to 18 (max for Ether)
      const parts = value.split(".")
      if (parts.length === 2 && parts[1].length > 18) {
        value = `${parts[0]}.${parts[1].substring(0, 18)}`
      }
      return ethers.parseEther(value)
    } catch (error) {
      console.error("Error parsing ether value:", error)
      return 0n
    }
  }, [])

  const checkApprovalNeeded = useCallback(async () => {
    if (!account || !signer || !fromAmount || fromToken.address === "ETH" || fromToken.address === "MON") {
      setNeedsApproval(false)
      return
    }

    try {
      const amountIn = safeParseEther(fromAmount)
      if (amountIn === 0n) {
        setNeedsApproval(false)
        return
      }

      // Check current allowance
      const tokenContract = new ethers.Contract(
        fromToken.address,
        [
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 amount) public returns (bool)",
        ],
        provider,
      )

      const allowance = await tokenContract.allowance(account, ROUTER_ADDRESS)
      setNeedsApproval(allowance < amountIn)
    } catch (error) {
      console.error("Error checking approval:", error)
      setNeedsApproval(true) // Assume approval needed on error
    }
  }, [account, signer, fromAmount, fromToken.address, provider, safeParseEther])

  const approveToken = async () => {
    if (!account || !signer || !fromAmount || fromToken.address === "ETH") return false

    setApproving(true)
    try {
      const amountIn = safeParseEther(fromAmount)

      // Show approval toast
      const approvalToastId = toast({
        title: "Approval Required",
        description: `Please approve ${fromToken.symbol} for swapping`,
        duration: 10000, // 10 seconds
      }).id

      // Approve token
      const tokenContract = new ethers.Contract(
        fromToken.address,
        ["function approve(address spender, uint256 amount) public returns (bool)"],
        signer,
      )

      const approveTx = await tokenContract.approve(ROUTER_ADDRESS, amountIn)

      // Update toast to show pending transaction
      toast({
        id: approvalToastId,
        title: "Approval Pending",
        description: "Please wait while your transaction is being confirmed...",
        duration: 10000,
      })

      await approveTx.wait()

      // Update approval toast
      toast({
        id: approvalToastId,
        title: "Approval Successful",
        description: `${fromToken.symbol} approved successfully`,
        duration: 5000,
      })

      setNeedsApproval(false)
      return true
    } catch (error) {
      console.error("Approval error:", error)
      toast({
        title: "Approval Failed",
        description: "Failed to approve token. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
      return false
    } finally {
      setApproving(false)
    }
  }

  const handleSwap = async () => {
    if (!account || !signer || !fromAmount || !path) return

    // First approve token if needed
    if (needsApproval) {
      const approved = await approveToken()
      if (!approved) return
    }

    setLoading(true)
    try {
      const router = getRouterContract()
      const amountIn = safeParseEther(fromAmount)

      // Calculate minimum output amount with 0.5% slippage tolerance
      let amountOutMin = 0n
      if (toAmount && toAmount !== "Cannot estimate" && toAmount !== "Error") {
        try {
          // Calculate with slippage and ensure we don't exceed decimal precision
          const slippageAdjusted = (Number(toAmount) * 0.995).toFixed(18)
          amountOutMin = safeParseEther(slippageAdjusted)
        } catch (error) {
          console.error("Error calculating amountOutMin:", error)
          // Fallback to 0 if there's an error
          amountOutMin = 0n
        }
      }

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

      // Show swap pending toast
      const swapToastId = toast({
        title: "Swap Initiated",
        description: "Please confirm the transaction in your wallet",
        duration: 10000,
      }).id

      let tx

      if (fromToken.address === "ETH" || fromToken.address === "MON") {
        // Native token to Token
        tx = await router.swapExactETHForTokens(amountOutMin, [WETH_ADDRESS, toToken.address], account, deadline, {
          value: amountIn,
        })
      } else if (toToken.address === "ETH" || toToken.address === "MON") {
        // Token to Native token
        tx = await router.swapExactTokensForETH(
          amountIn,
          amountOutMin,
          [fromToken.address, WETH_ADDRESS],
          account,
          deadline,
        )
      } else {
        // Token to Token
        tx = await router.swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          [fromToken.address, WETH_ADDRESS, toToken.address],
          account,
          deadline,
        )
      }

      // Update toast to show pending transaction
      toast({
        id: swapToastId,
        title: "Swap Pending",
        description: (
          <div>
            Please wait while your transaction is being confirmed...
            <div className="mt-2">
              <a
                href={getExplorerTransactionLink(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5E49C0] underline hover:no-underline"
              >
                View on Explorer
              </a>
            </div>
          </div>
        ),
        duration: 10000,
      })

      // Store transaction in local storage for history
      try {
        const txData = {
          hash: tx.hash,
          timestamp: Math.floor(Date.now() / 1000),
          from: account,
          to: ROUTER_ADDRESS,
          value: fromToken.address === "ETH" ? fromAmount : "0",
          type: "swap",
          tokenA: fromToken.symbol,
          tokenB: toToken.symbol,
          amountA: fromAmount,
          amountB: toAmount,
          status: "pending",
          methodName:
            fromToken.address === "ETH"
              ? "swapExactETHForTokens"
              : toToken.address === "ETH"
                ? "swapExactTokensForETH"
                : "swapExactTokensForTokens",
        }

        // Get existing transactions from localStorage
        const existingTxs = localStorage.getItem("megaswap_transactions")
        const transactions = existingTxs ? JSON.parse(existingTxs) : []

        // Add new transaction to the beginning of the array
        transactions.unshift(txData)

        // Store back in localStorage (limit to 50 transactions)
        localStorage.setItem("megaswap_transactions", JSON.stringify(transactions.slice(0, 50)))
      } catch (error) {
        console.error("Error storing transaction in history:", error)
      }

      const receipt = await tx.wait()

      // Update transaction status in localStorage
      try {
        const existingTxs = localStorage.getItem("megaswap_transactions")
        if (existingTxs) {
          const transactions = JSON.parse(existingTxs)
          const updatedTransactions = transactions.map((t) => {
            if (t.hash === tx.hash) {
              return { ...t, status: receipt.status === 1 ? "success" : "failed" }
            }
            return t
          })
          localStorage.setItem("megaswap_transactions", JSON.stringify(updatedTransactions))
        }
      } catch (error) {
        console.error("Error updating transaction status:", error)
      }

      // Update toast to show success with link to explorer
      toast({
        id: swapToastId,
        title: "Swap Successful",
        description: (
          <div>
            Successfully swapped {fromAmount} {fromToken.symbol} to {toToken.symbol}
            <div className="mt-2">
              <a
                href={getExplorerTransactionLink(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5E49C0] underline hover:no-underline"
              >
                View on Explorer
              </a>
            </div>
          </div>
        ),
        duration: 5000,
      })

      setFromAmount("")
      updateBalances()
    } catch (error) {
      console.error("Swap error:", error)
      let errorMessage = "There was an error during the swap. Please try again."

      // Try to extract a more specific error message
      if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        // Clean up common error messages
        const message = error.message
        if (message.includes("insufficient")) {
          errorMessage = "Insufficient balance for this swap."
        } else if (message.includes("expired")) {
          errorMessage = "The transaction deadline has expired. Please try again."
        } else if (message.includes("slippage")) {
          errorMessage = "Price moved unfavorably beyond slippage tolerance."
        } else if (message.includes("decimals") || message.includes("NUMERIC_FAULT")) {
          errorMessage = "Numeric precision error. Try with a different amount."
        }
      }

      toast({
        title: "Swap Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const switchTokens = useCallback(() => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }, [fromToken, toToken, toAmount])

  // Exchange rate calculation memoized for better performance
  const exchangeRate = useMemo(() => {
    if (!fromAmount || !toAmount || toAmount === "Cannot estimate" || toAmount === "Error" || fromAmount === "0") {
      return null
    }

    try {
      return (Number.parseFloat(toAmount) / Number.parseFloat(fromAmount)).toFixed(6)
    } catch (error) {
      return null
    }
  }, [fromAmount, toAmount])

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-white/50 p-4 sm:p-5 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-semibold text-[#5E49C0]">Swap Tokens</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5 rounded-full h-8 w-8 sm:h-9 sm:w-9"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      <div className="space-y-4 sm:space-y-5">
        <div className="bg-[#F6F6F5]/50 p-4 sm:p-5 rounded-xl border border-white/30">
          <div className="flex justify-between mb-2">
            <span className="text-[#5E49C0]/70 text-sm">From</span>
            <span className="text-[#5E49C0]/70 text-sm">Balance: {Number.parseFloat(fromBalance).toFixed(4)}</span>
          </div>
          <div className="flex gap-3 items-center">
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="bg-transparent border-none text-xl sm:text-2xl text-[#5E49C0] focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
            />
            <TokenSelector
              selectedToken={fromToken}
              onSelectToken={setFromToken}
              otherToken={toToken}
              imageErrors={imageErrors}
              onImageError={handleImageError}
            />
          </div>
        </div>

        <div className="flex justify-between text-sm sm:text-sm text-[#5E49C0]/70 px-2 sm:px-3 py-0.5">
          {exchangeRate && (
            <>
              <span>Exchange Rate</span>
              <span>{`1 ${fromToken.symbol} = ${exchangeRate} ${toToken.symbol}`}</span>
            </>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={switchTokens}
            className="bg-[#5E49C0] text-white rounded-full h-9 w-9 sm:h-10 sm:w-10 -my-1 sm:-my-2 z-10 shadow-md hover:bg-[#5E49C0]/90 transition-all"
          >
            <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        <div className="bg-[#F6F6F5]/50 p-4 sm:p-5 rounded-xl border border-white/30">
          <div className="flex justify-between mb-2">
            <span className="text-[#5E49C0]/70 text-sm">To</span>
            <span className="text-[#5E49C0]/70 text-sm">Balance: {Number.parseFloat(toBalance).toFixed(4)}</span>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="0.0"
                value={toAmount}
                readOnly
                className="bg-transparent border-none text-xl sm:text-2xl text-[#5E49C0] focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
              {estimateLoading && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-[#5E49C0]"></div>
                </div>
              )}
            </div>
            <TokenSelector
              selectedToken={toToken}
              onSelectToken={setToToken}
              otherToken={fromToken}
              imageErrors={imageErrors}
              onImageError={handleImageError}
            />
          </div>
        </div>

        {/* Price impact info */}
        {priceImpact && (
          <div className="flex justify-between items-center px-2 sm:px-3 py-1 text-sm sm:text-sm">
            <div className="flex items-center gap-1">
              <span className="text-[#5E49C0]/70">Price Impact</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#5E49C0]/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-[#5E49C0]/10 text-[#5E49C0] text-xs sm:text-sm">
                    <p>The difference between the market price and estimated price due to trade size</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span
              className={`
              ${
                Number(priceImpact) < 1 ? "text-green-600" : Number(priceImpact) < 3 ? "text-amber-600" : "text-red-600"
              }
            `}
            >
              {priceImpact}%
            </span>
          </div>
        )}

        {!pairExists &&
          fromToken.address !== toToken.address &&
          toToken.address !== "0x0000000000000000000000000000000000000000" && (
            <div className="p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 mt-1 sm:mt-2">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base text-[#5E49C0]">Liquidity pair does not exist yet</p>
                  <p className="text-xs sm:text-sm text-[#5E49C0]/70 mt-1 sm:mt-1">
                    You can be the first to add liquidity for this pair
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Approval notice for ERC20 tokens */}
        {needsApproval && fromToken.address !== "ETH" && fromAmount && (
          <div className="p-3 sm:p-4 rounded-xl bg-[#5E49C0]/5 border border-[#5E49C0]/10 mt-1 sm:mt-2">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#5E49C0]/70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm sm:text-base text-[#5E49C0]">
                  You need to approve {fromToken.symbol} before swapping
                </p>
                <p className="text-xs sm:text-sm text-[#5E49C0]/70 mt-1 sm:mt-1">
                  This is a one-time approval for this token
                </p>
              </div>
            </div>
          </div>
        )}

        {account ? (
          !isCorrectChain ? (
            <Button
              className="w-full h-12 sm:h-14 mt-4 sm:mt-5 text-sm sm:text-base bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl"
              onClick={switchNetwork}
            >
              <AlertTriangle className="mr-2 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Switch to {NETWORK_CONFIG.name}
            </Button>
          ) : needsApproval && fromToken.address !== "ETH" ? (
            <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-5">
              <Button
                className="w-full h-12 sm:h-14 bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl text-sm sm:text-base"
                disabled={approving}
                onClick={approveToken}
              >
                {approving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-2"></div>
                    <span>Approving {fromToken.symbol}...</span>
                  </div>
                ) : (
                  <span>Approve {fromToken.symbol}</span>
                )}
              </Button>
              <Button
                className="w-full h-12 sm:h-14 bg-transparent border border-[#5E49C0]/20 text-[#5E49C0]/50 hover:bg-[#5E49C0]/5 rounded-xl text-sm sm:text-base"
                disabled={true}
              >
                <span>Swap (approval needed)</span>
              </Button>
            </div>
          ) : (
            <Button
              className="w-full h-12 sm:h-14 mt-4 sm:mt-5 text-sm sm:text-base bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl"
              disabled={
                !fromAmount ||
                loading ||
                estimateLoading ||
                approving ||
                fromAmount === "0" ||
                toToken.address === "0x0000000000000000000000000000000000000000" ||
                !path
              }
              onClick={handleSwap}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-2"></div>
                  <span>Swapping...</span>
                </div>
              ) : estimateLoading ? (
                <span>Calculating...</span>
              ) : toToken.address === "0x0000000000000000000000000000000000000000" ? (
                <span>Select a token</span>
              ) : (
                <span>Swap Tokens</span>
              )}
            </Button>
          )
        ) : (
          <Button
            className="w-full h-12 sm:h-14 mt-4 sm:mt-5 text-sm sm:text-base bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl"
            disabled
          >
            <span>Connect Wallet</span>
          </Button>
        )}
      </div>
    </Card>
  )
}
