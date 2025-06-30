"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Settings, Trash2, Info, ArrowDown, AlertCircle } from "lucide-react"
import { TokenSelector } from "@/components/token-selector"
import { useWeb3 } from "@/hooks/use-web3"
import { ethers } from "ethers"
import { ROUTER_ADDRESS, WETH_ADDRESS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getExplorerTransactionLink } from "@/lib/network-config"
import { useLiquidityPair } from "@/hooks/use-liquidity-pair"

// LP Token ABI for getting info about liquidity positions
const LP_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function approve(address spender, uint256 value) external returns (bool)",
]

export function Liquidity() {
  const { account, provider, signer, getTokenBalance, getRouterContract, getFactoryContract } = useWeb3()
  const { toast } = useToast()
  const [activeView, setActiveView] = useState<"add" | "remove">("add")
  const [tokenA, setTokenA] = useState({
    address: "MON",
    symbol: "MON",
    logoURI: "https://docs.monad.xyz/img/monad_logo.png",
  })
  const [tokenB, setTokenB] = useState({
    address: "0x0000000000000000000000000000000000000000",
    symbol: "Select a token",
    logoURI: undefined,
  })
  const [amountA, setAmountA] = useState("")
  const [amountB, setAmountB] = useState("")
  const [balanceA, setBalanceA] = useState("0")
  const [balanceB, setBalanceB] = useState("0")
  const [loading, setLoading] = useState(false)
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [liquidityPositions, setLiquidityPositions] = useState<any[]>([])
  const [selectedPosition, setSelectedPosition] = useState<any>(null)
  const [removePercentage, setRemovePercentage] = useState(100)
  const [removingLiquidity, setRemovingLiquidity] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [approving, setApproving] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [pairExists, setPairExists] = useState(false)

  const { pairExists: pairExistsHook, reserves, pairAddress } = useLiquidityPair(tokenA, tokenB)

  useEffect(() => {
    if (account && provider) {
      updateBalances()
      fetchLiquidityPositions()
    }
  }, [account, provider, tokenA, tokenB])

  // Check if approval is needed when tokens or amounts change
  useEffect(() => {
    checkApprovalNeeded()
  }, [tokenA, tokenB, amountA, amountB, account])

  const handleImageError = (tokenAddress: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [tokenAddress]: true,
    }))
  }

  const updateBalances = async () => {
    if (!account || !provider) return

    try {
      // Get tokenA balance
      try {
        if (tokenA.address === "ETH") {
          const balance = await provider.getBalance(account)
          setBalanceA(ethers.formatEther(balance))
        } else {
          const balance = await getTokenBalance(tokenA.address, account)
          setBalanceA(balance)
        }
      } catch (error) {
        console.error("Error getting tokenA balance:", error)
        setBalanceA("0")
      }

      // Get tokenB balance
      try {
        if (tokenB.address === "ETH") {
          const balance = await provider.getBalance(account)
          setBalanceB(ethers.formatEther(balance))
        } else if (tokenB.address === "0x0000000000000000000000000000000000000000") {
          setBalanceB("0")
        } else {
          const balance = await getTokenBalance(tokenB.address, account)
          setBalanceB(balance)
        }
      } catch (error) {
        console.error("Error getting tokenB balance:", error)
        setBalanceB("0")
      }
    } catch (error) {
      console.error("Error updating balances:", error)
      // Don't reset balances on general error
    }
  }

  const checkApprovalNeeded = async () => {
    if (
      !account ||
      !signer ||
      !amountA ||
      !amountB ||
      tokenB.address === "0x0000000000000000000000000000000000000000"
    ) {
      setNeedsApproval(false)
      return
    }

    try {
      const amountADesired = ethers.parseEther(amountA)
      const amountBDesired = ethers.parseEther(amountB)

      let needsApprovalA = false
      let needsApprovalB = false

      // Check if tokenA needs approval (if it's not a native token)
      if (tokenA.address !== "ETH" && tokenA.address !== "MON") {
        const tokenAContract = new ethers.Contract(
          tokenA.address,
          ["function allowance(address owner, address spender) view returns (uint256)"],
          provider,
        )
        const allowanceA = await tokenAContract.allowance(account, ROUTER_ADDRESS)
        needsApprovalA = allowanceA < amountADesired
      }

      // Check if tokenB needs approval (if it's not a native token)
      if (tokenB.address !== "ETH" && tokenB.address !== "MON") {
        const tokenBContract = new ethers.Contract(
          tokenB.address,
          ["function allowance(address owner, address spender) view returns (uint256)"],
          provider,
        )
        const allowanceB = await tokenBContract.allowance(account, ROUTER_ADDRESS)
        needsApprovalB = allowanceB < amountBDesired
      }

      setNeedsApproval(needsApprovalA || needsApprovalB)
    } catch (error) {
      console.error("Error checking approval:", error)
      setNeedsApproval(true) // Assume approval needed on error
    }
  }

  const fetchLiquidityPositions = async () => {
    if (!account || !provider) return

    setLoadingPositions(true)
    try {
      const factory = getFactoryContract()
      const pairsLength = await factory.allPairsLength()

      // Convert BigInt to number safely
      const pairsCount =
        Number(pairsLength) > Number.MAX_SAFE_INTEGER
          ? 100 // If too large, limit to 100
          : Number(pairsLength)

      const positions = []

      // Loop through all pairs to find user's positions
      for (let i = 0; i < Math.min(pairsCount, 100); i++) {
        // Limit to 100 to prevent too many requests
        try {
          const pairAddress = await factory.allPairs(i)
          const pairContract = new ethers.Contract(pairAddress, LP_TOKEN_ABI, provider)

          // Check if user has LP tokens for this pair
          const balance = await pairContract.balanceOf(account)

          if (balance > 0n) {
            // Get pair tokens
            const token0Address = await pairContract.token0()
            const token1Address = await pairContract.token1()

            // Get token symbols
            let token0Symbol = "Unknown"
            let token1Symbol = "Unknown"
            let token0LogoURI = undefined
            let token1LogoURI = undefined

            try {
              if (token0Address === WETH_ADDRESS) {
                token0Symbol = "WETH"
                token0LogoURI =
                  "https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
              } else {
                const token0Contract = new ethers.Contract(
                  token0Address,
                  ["function symbol() view returns (string)"],
                  provider,
                )
                token0Symbol = await token0Contract.symbol()
                // We don't have logoURI for arbitrary tokens
              }

              if (token1Address === WETH_ADDRESS) {
                token1Symbol = "WETH"
                token1LogoURI =
                  "https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
              } else {
                const token1Contract = new ethers.Contract(
                  token1Address,
                  ["function symbol() view returns (string)"],
                  provider,
                )
                token1Symbol = await token1Contract.symbol()
                // We don't have logoURI for arbitrary tokens
              }
            } catch (error) {
              console.error("Error getting token symbols:", error)
            }

            // Get reserves
            const [reserve0, reserve1] = await pairContract.getReserves()
            const totalSupply = await pairContract.totalSupply()

            // Calculate user's share - safely convert BigInt to number
            let userSharePercent = 0
            try {
              // Calculate share as a string with high precision
              const shareRatio = (balance * 10000n) / totalSupply
              // Then convert to number safely
              userSharePercent = Number(shareRatio) / 100
            } catch (error) {
              console.error("Error calculating share percentage:", error)
              userSharePercent = 0
            }

            // Calculate token amounts based on share
            const token0Amount = (reserve0 * balance) / totalSupply
            const token1Amount = (reserve1 * balance) / totalSupply

            positions.push({
              pairAddress,
              token0: {
                address: token0Address,
                symbol: token0Symbol,
                amount: token0Amount,
                logoURI: token0LogoURI,
              },
              token1: {
                address: token1Address,
                symbol: token1Symbol,
                amount: token1Amount,
                logoURI: token1LogoURI,
              },
              balance,
              sharePercent: userSharePercent,
            })
          }
        } catch (error) {
          console.error(`Error processing pair ${i}:`, error)
        }
      }

      setLiquidityPositions(positions)
    } catch (error) {
      console.error("Error fetching liquidity positions:", error)
      toast({
        title: "Error",
        description: "Failed to load your liquidity positions",
        variant: "destructive",
      })
    } finally {
      setLoadingPositions(false)
    }
  }

  const approveTokens = async () => {
    if (!account || !signer || !amountA || !amountB || tokenB.address === "0x0000000000000000000000000000000000000000")
      return false

    setApproving(true)
    try {
      const amountADesired = ethers.parseEther(amountA)
      const amountBDesired = ethers.parseEther(amountB)

      // Show approval toast
      const approvalToastId = toast({
        title: "Approval Required",
        description: "Please approve token spending in your wallet",
        duration: 10000,
      }).id

      if (
        (tokenA.address === "ETH" || tokenA.address === "MON") &&
        tokenB.address !== "ETH" &&
        tokenB.address !== "MON"
      ) {
        // Native token + Token - only need to approve tokenB
        const tokenContract = new ethers.Contract(
          tokenB.address,
          ["function approve(address spender, uint256 amount) public returns (bool)"],
          signer,
        )

        // Update toast to show pending approval
        toast({
          id: approvalToastId,
          title: "Approving Token",
          description: `Approving ${tokenB.symbol}...`,
          duration: 10000,
        })

        const approveTx = await tokenContract.approve(ROUTER_ADDRESS, amountBDesired)

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
          description: `${tokenB.symbol} approved successfully`,
          duration: 5000,
        })
      } else if (
        (tokenB.address === "ETH" || tokenB.address === "MON") &&
        tokenA.address !== "ETH" &&
        tokenA.address !== "MON"
      ) {
        // Token + Native token - only need to approve tokenA
        const tokenContract = new ethers.Contract(
          tokenA.address,
          ["function approve(address spender, uint256 amount) public returns (bool)"],
          signer,
        )

        // Update toast to show pending approval
        toast({
          id: approvalToastId,
          title: "Approving Token",
          description: `Approving ${tokenA.symbol}...`,
          duration: 10000,
        })

        const approveTx = await tokenContract.approve(ROUTER_ADDRESS, amountADesired)

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
          description: `${tokenA.symbol} approved successfully`,
          duration: 5000,
        })
      } else if (
        tokenA.address !== "ETH" &&
        tokenA.address !== "MON" &&
        tokenB.address !== "ETH" &&
        tokenB.address !== "MON"
      ) {
        // Token + Token - need to approve both tokens
        const tokenAContract = new ethers.Contract(
          tokenA.address,
          ["function approve(address spender, uint256 amount) public returns (bool)"],
          signer,
        )

        const tokenBContract = new ethers.Contract(
          tokenB.address,
          ["function approve(address spender, uint256 amount) public returns (bool)"],
          signer,
        )

        // Approve token A
        toast({
          id: approvalToastId,
          title: "Approving First Token",
          description: `Approving ${tokenA.symbol}...`,
          duration: 10000,
        })

        const approveATx = await tokenAContract.approve(ROUTER_ADDRESS, amountADesired)

        toast({
          id: approvalToastId,
          title: "First Approval Pending",
          description: "Please wait while your transaction is being confirmed...",
          duration: 10000,
        })

        await approveATx.wait()

        // Update approval toast for first token
        toast({
          id: approvalToastId,
          title: "First Token Approved",
          description: `Now approving ${tokenB.symbol}...`,
          duration: 10000,
        })

        // Approve token B
        const approveBTx = await tokenBContract.approve(ROUTER_ADDRESS, amountBDesired)

        toast({
          id: approvalToastId,
          title: "Second Approval Pending",
          description: "Please wait while your transaction is being confirmed...",
          duration: 10000,
        })

        await approveBTx.wait()

        // Update approval toast for second token
        toast({
          id: approvalToastId,
          title: "Approval Successful",
          description: "Both tokens approved successfully",
          duration: 5000,
        })
      }

      setNeedsApproval(false)
      return true
    } catch (error) {
      console.error("Approval error:", error)
      toast({
        title: "Approval Failed",
        description: "Failed to approve token(s). Please try again.",
        variant: "destructive",
        duration: 5000,
      })
      return false
    } finally {
      setApproving(false)
    }
  }

  const handleAddLiquidity = async () => {
    if (!account || !signer || !amountA || !amountB || tokenB.address === "0x0000000000000000000000000000000000000000")
      return

    // First approve tokens if needed
    if (needsApproval) {
      const approved = await approveTokens()
      if (!approved) return
    }

    setLoading(true)
    try {
      const router = getRouterContract()
      const amountADesired = ethers.parseEther(amountA)
      const amountBDesired = ethers.parseEther(amountB)
      const amountAMin = (amountADesired * 95n) / 100n // 5% slippage
      const amountBMin = (amountBDesired * 95n) / 100n // 5% slippage
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

      // Show liquidity toast
      const liquidityToastId = toast({
        title: "Adding Liquidity",
        description: "Please confirm the transaction in your wallet",
        duration: 10000,
      }).id

      let tx

      if (
        (tokenA.address === "ETH" || tokenA.address === "MON") &&
        tokenB.address !== "ETH" &&
        tokenB.address !== "MON"
      ) {
        // Native token + Token
        tx = await router.addLiquidityETH(tokenB.address, amountBDesired, amountBMin, amountAMin, account, deadline, {
          value: amountADesired,
        })
      } else if (
        (tokenB.address === "ETH" || tokenB.address === "MON") &&
        tokenA.address !== "ETH" &&
        tokenA.address !== "MON"
      ) {
        // Token + Native token
        tx = await router.addLiquidityETH(tokenA.address, amountADesired, amountAMin, amountBMin, account, deadline, {
          value: amountBDesired,
        })
      } else if (
        tokenA.address !== "ETH" &&
        tokenA.address !== "MON" &&
        tokenB.address !== "ETH" &&
        tokenB.address !== "MON"
      ) {
        // Token + Token
        tx = await router.addLiquidity(
          tokenA.address,
          tokenB.address,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          account,
          deadline,
        )
      }

      // Update toast to show pending transaction
      toast({
        id: liquidityToastId,
        title: "Transaction Pending",
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
          value:
            tokenA.address === "ETH" || tokenB.address === "ETH" ? (tokenA.address === "ETH" ? amountA : amountB) : "0",
          type: "addLiquidity",
          tokenA: tokenA.symbol,
          tokenB: tokenB.symbol,
          amountA: amountA,
          amountB: amountB,
          status: "pending",
          methodName: tokenA.address === "ETH" || tokenB.address === "ETH" ? "addLiquidityETH" : "addLiquidity",
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

      await tx.wait()

      // Update transaction status in localStorage
      try {
        const existingTxs = localStorage.getItem("megaswap_transactions")
        if (existingTxs) {
          const transactions = JSON.parse(existingTxs)
          const updatedTransactions = transactions.map((t) => {
            if (t.hash === tx.hash) {
              return { ...t, status: "success" }
            }
            return t
          })
          localStorage.setItem("megaswap_transactions", JSON.stringify(updatedTransactions))
        }
      } catch (error) {
        console.error("Error updating transaction status:", error)
      }

      // Update toast to show success
      toast({
        id: liquidityToastId,
        title: "Liquidity Added",
        description: `Successfully added liquidity for ${tokenA.symbol}/${tokenB.symbol}`,
        duration: 5000,
      })

      setAmountA("")
      setAmountB("")
      updateBalances()
      fetchLiquidityPositions()
    } catch (error) {
      console.error("Add liquidity error:", error)
      toast({
        title: "Failed to Add Liquidity",
        description: "There was an error adding liquidity. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveLiquidity = async () => {
    if (!selectedPosition || !account || !signer) return

    setRemovingLiquidity(true)
    try {
      const router = getRouterContract()
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

      // Calculate amount of LP tokens to remove based on percentage
      const liquidity = (selectedPosition.balance * BigInt(removePercentage)) / 100n

      // Calculate minimum amounts with 5% slippage
      const token0Min = (selectedPosition.token0.amount * BigInt(removePercentage) * 95n) / (100n * 100n)
      const token1Min = (selectedPosition.token1.amount * BigInt(removePercentage) * 95n) / (100n * 100n)

      // Show approval toast
      const approvalToastId = toast({
        title: "Approval Required",
        description: "Please approve LP token spending in your wallet",
        duration: 10000,
      }).id

      // Approve router to spend LP tokens
      const pairContract = new ethers.Contract(selectedPosition.pairAddress, LP_TOKEN_ABI, signer)
      const approveTx = await pairContract.approve(ROUTER_ADDRESS, liquidity)

      // Update toast to show pending approval
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
        description: "Now removing your liquidity...",
        duration: 5000,
      })

      // Show remove liquidity toast
      const removeToastId = toast({
        title: "Removing Liquidity",
        description: "Please confirm the transaction in your wallet",
        duration: 10000,
      }).id

      let tx

      // Check if one of the tokens is WETH
      if (selectedPosition.token0.address === WETH_ADDRESS) {
        // token1 + ETH
        tx = await router.removeLiquidityETH(
          selectedPosition.token1.address,
          liquidity,
          token1Min,
          token0Min,
          account,
          deadline,
        )
      } else if (selectedPosition.token1.address === WETH_ADDRESS) {
        // token0 + ETH
        tx = await router.removeLiquidityETH(
          selectedPosition.token0.address,
          liquidity,
          token0Min,
          token1Min,
          account,
          deadline,
        )
      } else {
        // token0 + token1
        tx = await router.removeLiquidity(
          selectedPosition.token0.address,
          selectedPosition.token1.address,
          liquidity,
          token0Min,
          token1Min,
          account,
          deadline,
        )
      }

      // Update toast to show pending transaction
      toast({
        id: removeToastId,
        title: "Transaction Pending",
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
          value: "0",
          type: "removeLiquidity",
          tokenA: selectedPosition.token0.symbol,
          tokenB: selectedPosition.token1.symbol,
          amountA: formatTokenAmount(
            (selectedPosition.token0.amount * BigInt(removePercentage)) / 100n,
            selectedPosition.token0.symbol,
          ),
          amountB: formatTokenAmount(
            (selectedPosition.token1.amount * BigInt(removePercentage)) / 100n,
            selectedPosition.token1.symbol,
          ),
          status: "pending",
          methodName:
            selectedPosition.token0.address === WETH_ADDRESS || selectedPosition.token1.address === WETH_ADDRESS
              ? "removeLiquidityETH"
              : "removeLiquidity",
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

      await tx.wait()

      // Update transaction status in localStorage
      try {
        const existingTxs = localStorage.getItem("megaswap_transactions")
        if (existingTxs) {
          const transactions = JSON.parse(existingTxs)
          const updatedTransactions = transactions.map((t) => {
            if (t.hash === tx.hash) {
              return { ...t, status: "success" }
            }
            return t
          })
          localStorage.setItem("megaswap_transactions", JSON.stringify(updatedTransactions))
        }
      } catch (error) {
        console.error("Error updating transaction status:", error)
      }

      // Update toast to show success
      toast({
        id: removeToastId,
        title: "Liquidity Removed",
        description: `Successfully removed ${removePercentage}% of your liquidity.`,
        duration: 5000,
      })

      // Reset and refresh
      setSelectedPosition(null)
      setRemovePercentage(100)
      fetchLiquidityPositions()
      updateBalances()
    } catch (error) {
      console.error("Remove liquidity error:", error)
      toast({
        title: "Failed to Remove Liquidity",
        description: "There was an error removing your liquidity. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setRemovingLiquidity(false)
    }
  }

  const handleAmountAChange = async (value: string) => {
    setAmountA(value)

    if (!value || !account || !provider) {
      setAmountB("")
      return
    }

    try {
      // Check if there's an existing pool for these tokens
      if (
        tokenA.address !== "0x0000000000000000000000000000000000000000" &&
        tokenB.address !== "0x0000000000000000000000000000000000000000"
      ) {
        const factory = getFactoryContract()

        // Get the pair address (handle ETH/WETH special case)
        const token0 = tokenA.address === "ETH" || tokenA.address === "MON" ? WETH_ADDRESS : tokenA.address
        const token1 = tokenB.address === "ETH" || tokenB.address === "MON" ? WETH_ADDRESS : tokenB.address

        // If pair exists, get the reserves to calculate the ratio
        const pairAddress = await factory.getPair(token0, token1)

        // Set pairExists state
        const pairDoesExist = pairAddress !== ethers.ZeroAddress
        setPairExists(pairDoesExist)

        // If pair exists, get the reserves to calculate the ratio
        if (pairDoesExist) {
          const pairContract = new ethers.Contract(
            pairAddress,
            [
              "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
              "function token0() external view returns (address)",
              "function token1() external view returns (address)",
            ],
            provider,
          )

          const [reserve0, reserve1] = await pairContract.getReserves()
          const pairToken0 = await pairContract.token0()

          // Determine which reserve corresponds to which token
          let reserveA, reserveB
          if (token0.toLowerCase() === pairToken0.toLowerCase()) {
            reserveA = reserve0
            reserveB = reserve1
          } else {
            reserveA = reserve1
            reserveB = reserve0
          }

          // Calculate the amount of tokenB based on the ratio
          if (reserveA > 0n && reserveB > 0n) {
            try {
              const amountABigInt = ethers.parseEther(value)
              const amountBBigInt = (amountABigInt * reserveB) / reserveA
              const amountBFormatted = ethers.formatEther(amountBBigInt)

              // Update amountB with the calculated value based on the current pool ratio
              setAmountB(amountBFormatted)

              // Show a toast notification to inform the user about the ratio adjustment
              toast({
                title: "Amount Adjusted",
                description: `Amount has been adjusted to match the current pool ratio of ${(Number(reserveB) / Number(reserveA)).toFixed(6)} ${tokenB.symbol} per ${tokenA.symbol}`,
                duration: 5000,
              })

              return
            } catch (error) {
              console.error("Error calculating token ratio:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calculating token B amount:", error)
      // Falllback to 1:1 ratio
      setAmountB(value)
    }
  }

  const handleAmountBChange = async (value: string) => {
    setAmountB(value)

    if (!value || !account || !provider) {
      setAmountA("")
      return
    }

    try {
      // Check if there's an existing pool for these tokens
      if (
        tokenA.address !== "0x0000000000000000000000000000000000000000" &&
        tokenB.address !== "0x0000000000000000000000000000000000000000"
      ) {
        const factory = getFactoryContract()

        // Get the pair address (handle ETH/WETH special case)
        const token0 = tokenA.address === "ETH" || tokenA.address === "MON" ? WETH_ADDRESS : tokenA.address
        const token1 = tokenB.address === "ETH" || tokenB.address === "MON" ? WETH_ADDRESS : tokenB.address

        // If pair exists, get the reserves to calculate the ratio
        const pairAddress = await factory.getPair(token0, token1)

        // Set pairExists state
        const pairDoesExist = pairAddress !== ethers.ZeroAddress
        setPairExists(pairDoesExist)

        // If pair exists, get the reserves to calculate the ratio
        if (pairDoesExist) {
          const pairContract = new ethers.Contract(
            pairAddress,
            [
              "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
              "function token0() external view returns (address)",
              "function token1() external view returns (address)",
            ],
            provider,
          )

          const [reserve0, reserve1] = await pairContract.getReserves()
          const pairToken0 = await pairContract.token0()

          // Determine which reserve corresponds to which token
          let reserveA, reserveB
          if (token0.toLowerCase() === pairToken0.toLowerCase()) {
            reserveA = reserve0
            reserveB = reserve1
          } else {
            reserveA = reserve1
            reserveB = reserve0
          }

          // Calculate the amount of tokenA based on the ratio
          if (reserveA > 0n && reserveB > 0n) {
            try {
              const amountBBigInt = ethers.parseEther(value)
              const amountABigInt = (amountBBigInt * reserveA) / reserveB
              const amountAFormatted = ethers.formatEther(amountABigInt)

              // Update amountA with the calculated value based on the current pool ratio
              setAmountA(amountAFormatted)

              // Show a toast notification to inform the user about the ratio adjustment
              toast({
                title: "Amount Adjusted",
                description: `Amount has been adjusted to match the current pool ratio of ${(Number(reserveA) / Number(reserveB)).toFixed(6)} ${tokenA.symbol} per ${tokenB.symbol}`,
                duration: 5000,
              })

              return
            } catch (error) {
              console.error("Error calculating token ratio:", error)
            }
          }
        }
      }

      // Fallback to 1:1 ratio if no pair exists or calculation fails
      setAmountA(value)
    } catch (error) {
      console.error("Error calculating token A amount:", error)
      // Fallback to 1:1 ratio
      setAmountA(value)
    }
  }

  const switchTokens = () => {
    // Switch tokens and their amounts
    const tempToken = tokenA
    const tempAmount = amountA

    setTokenA(tokenB)
    setTokenB(tempToken)

    setAmountA(amountB)
    setAmountB(tempAmount)
  }

  const formatTokenAmount = (amount: bigint, symbol: string) => {
    try {
      const formatted = ethers.formatEther(amount)
      return `${Number.parseFloat(formatted).toFixed(6)} ${symbol}`
    } catch (error) {
      return `0 ${symbol}`
    }
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-white/50 p-4 sm:p-5 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-semibold text-[#5E49C0]">Liquidity Pool</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5 rounded-full h-8 w-8 sm:h-9 sm:w-9"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Liquidity Tabs */}
      <div className="mb-4 sm:mb-5">
        <div className="grid grid-cols-2 gap-2 sm:gap-2 p-1.5 sm:p-1.5 bg-[#F6F6F5]/50 rounded-xl shadow-sm border border-white/30">
          <button
            className={`py-2.5 sm:py-2.5 px-4 sm:px-4 text-sm sm:text-sm rounded-lg transition-all ${
              activeView === "add"
                ? "bg-[#5E49C0] text-white font-medium shadow-sm"
                : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
            onClick={() => setActiveView("add")}
          >
            Add Liquidity
          </button>
          <button
            className={`py-2.5 sm:py-2.5 px-4 sm:px-4 text-sm sm:text-sm rounded-lg transition-all ${
              activeView === "remove"
                ? "bg-[#5E49C0] text-white font-medium shadow-sm"
                : "bg-transparent text-[#5E49C0]/70 hover:text-[#5E49C0] hover:bg-[#5E49C0]/5"
            }`}
            onClick={() => setActiveView("remove")}
          >
            Remove Liquidity
          </button>
        </div>
      </div>

      {/* Add Liquidity View */}
      {activeView === "add" && (
        <div className="space-y-4 sm:space-y-5">
          {/* First token input */}
          <div className="bg-[#F6F6F5]/50 p-4 sm:p-5 rounded-xl border border-white/30">
            <div className="flex justify-between mb-2">
              <span className="text-[#5E49C0]/70 text-sm">First Token</span>
              <span className="text-[#5E49C0]/70 text-sm">
                Balance: {Number.parseFloat(balanceA).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div className="flex gap-3 items-center">
              <Input
                type="number"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                className="bg-transparent border-none text-xl sm:text-2xl text-[#5E49C0] focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
              <TokenSelector
                selectedToken={tokenA}
                onSelectToken={setTokenA}
                otherToken={tokenB}
                imageErrors={imageErrors}
                onImageError={handleImageError}
              />
            </div>
          </div>

          {/* Switch tokens button */}
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

          {/* Second token input */}
          <div className="bg-[#F6F6F5]/50 p-4 sm:p-5 rounded-xl border border-white/30">
            <div className="flex justify-between mb-2">
              <span className="text-[#5E49C0]/70 text-sm">Second Token</span>
              <span className="text-[#5E49C0]/70 text-sm">
                Balance: {Number.parseFloat(balanceB).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div className="flex gap-3 items-center">
              <Input
                type="number"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => handleAmountBChange(e.target.value)}
                className="bg-transparent border-none text-xl sm:text-2xl text-[#5E49C0] focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
              <TokenSelector
                selectedToken={tokenB}
                onSelectToken={setTokenB}
                otherToken={tokenA}
                imageErrors={imageErrors}
                onImageError={handleImageError}
              />
            </div>
          </div>

          {/* Price and pool share info */}
          {tokenA.address !== "0x0000000000000000000000000000000000000000" &&
            tokenB.address !== "0x0000000000000000000000000000000000000000" &&
            amountA &&
            amountB && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#F6F6F5]/50 mt-4 sm:mt-5 border border-white/30">
                <div className="flex justify-between items-center mb-2 sm:mb-2">
                  <span className="text-[#5E49C0]/70 text-sm">Exchange Rate:</span>
                  <div className="text-[#5E49C0] text-sm">
                    <div>
                      1 {tokenA.symbol} = {(Number(amountB) / Number(amountA)).toFixed(6)} {tokenB.symbol}
                    </div>
                    <div>
                      1 {tokenB.symbol} = {(Number(amountA) / Number(amountB)).toFixed(6)} {tokenA.symbol}
                    </div>
                  </div>
                </div>

                {pairExists && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-[#5E49C0] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[#5E49C0]">Existing Pool Detected</p>
                        <p className="text-xs text-[#5E49C0]/70 mt-1">
                          Amounts have been automatically adjusted to match the current pool ratio. Adding liquidity at
                          the current ratio prevents price impact.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Approval notice for ERC20 tokens */}
          {needsApproval && (tokenA.address !== "ETH" || tokenB.address !== "ETH") && amountA && amountB && (
            <div className="p-3 sm:p-4 rounded-xl bg-[#5E49C0]/5 border border-[#5E49C0]/10 mt-1 sm:mt-2">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#5E49C0]/70 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base text-[#5E49C0]">Token approval required before adding liquidity</p>
                  <p className="text-xs sm:text-sm text-[#5E49C0]/70 mt-1 sm:mt-1">
                    This is a one-time approval for these tokens
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Add liquidity button */}
          {account ? (
            needsApproval ? (
              <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-5">
                <Button
                  className="w-full h-12 sm:h-14 bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl text-sm sm:text-base"
                  disabled={
                    approving || !amountA || !amountB || tokenB.address === "0x0000000000000000000000000000000000000000"
                  }
                  onClick={approveTokens}
                >
                  {approving ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-2"></div>
                      <span>Approving Tokens...</span>
                    </div>
                  ) : (
                    <span>Approve Tokens</span>
                  )}
                </Button>
                <Button
                  className="w-full h-12 sm:h-14 bg-transparent border border-[#5E49C0]/20 text-[#5E49C0]/50 hover:bg-[#5E49C0]/5 rounded-xl text-sm sm:text-base"
                  disabled={true}
                >
                  <span>Add Liquidity (approval needed)</span>
                </Button>
              </div>
            ) : (
              <Button
                className="w-full h-12 sm:h-14 mt-4 sm:mt-5 bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl text-sm sm:text-base"
                disabled={
                  !amountA ||
                  !amountB ||
                  loading ||
                  approving ||
                  amountA === "0" ||
                  amountB === "0" ||
                  tokenB.address === "0x0000000000000000000000000000000000000000"
                }
                onClick={handleAddLiquidity}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-2"></div>
                    <span>Adding Liquidity...</span>
                  </div>
                ) : tokenB.address === "0x0000000000000000000000000000000000000000" ? (
                  <span>Select a token</span>
                ) : (
                  <span>Add Liquidity</span>
                )}
              </Button>
            )
          ) : (
            <Button
              className="w-full h-12 sm:h-14 bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl connect-button text-sm sm:text-base"
              disabled
            >
              <span className="hidden sm:inline">Connect Wallet to Add Liquidity</span>
              <span className="inline sm:hidden">Connect Wallet</span>
            </Button>
          )}
        </div>
      )}

      {/* Remove Liquidity View */}
      {activeView === "remove" && (
        <div className="space-y-4 sm:space-y-5">
          {loadingPositions ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-10 space-y-4 sm:space-y-5">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#5E49C0]"></div>
              <p className="text-sm sm:text-base text-[#5E49C0]/70">Loading your liquidity positions...</p>
            </div>
          ) : liquidityPositions.length === 0 ? (
            <div className="text-center py-8 sm:py-10 space-y-3 sm:space-y-4">
              <div className="bg-[#F6F6F5]/70 rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center mx-auto">
                <Info className="h-8 w-8 sm:h-10 sm:w-10 text-[#5E49C0]/50" />
              </div>
              <p className="text-sm sm:text-base text-[#5E49C0]/70">You don't have any liquidity positions yet.</p>
              <p className="text-xs sm:text-sm text-[#5E49C0]/50">Add liquidity to get started.</p>
              <Button
                className="mt-4 sm:mt-5 bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md rounded-xl h-12 sm:h-14 text-sm sm:text-base"
                onClick={() => setActiveView("add")}
              >
                Add Liquidity
              </Button>
            </div>
          ) : (
            <>
              {/* List of liquidity positions */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-base sm:text-lg font-semibold text-[#5E49C0]">Your Liquidity Positions</h3>

                {liquidityPositions.map((position, index) => (
                  <div
                    key={index}
                    className={`p-4 sm:p-5 rounded-xl transition-all cursor-pointer ${
                      selectedPosition?.pairAddress === position.pairAddress
                        ? "bg-[#5E49C0]/10 border border-[#5E49C0]/20"
                        : "bg-white/70 border border-white/50 hover:bg-[#F6F6F5]/30"
                    }`}
                    onClick={() => setSelectedPosition(position)}
                  >
                    <div className="flex justify-between items-center mb-2 sm:mb-2">
                      <div className="flex items-center">
                        <div className="flex -space-x-2 sm:-space-x-2">
                          {position.token0.logoURI && !imageErrors[position.token0.address] ? (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center z-10 overflow-hidden shadow-sm">
                              <img
                                src={position.token0.logoURI || "/placeholder.svg"}
                                alt={position.token0.symbol}
                                className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                                onError={() => handleImageError(position.token0.address)}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] flex items-center justify-center z-10 shadow-sm">
                              <span className="font-medium text-white text-sm sm:text-base">
                                {position.token0.symbol.charAt(0)}
                              </span>
                            </div>
                          )}

                          {position.token1.logoURI && !imageErrors[position.token1.address] ? (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm">
                              <img
                                src={position.token1.logoURI || "/placeholder.svg"}
                                alt={position.token1.symbol}
                                className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                                onError={() => handleImageError(position.token1.address)}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] flex items-center justify-center shadow-sm">
                              <span className="font-medium text-white text-sm sm:text-base">
                                {position.token1.symbol.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="ml-3 sm:ml-3 font-medium text-[#5E49C0] text-sm sm:text-base">
                          {position.token0.symbol}/{position.token1.symbol}
                        </span>
                      </div>
                      <span className="text-sm sm:text-base text-[#5E49C0]/70">
                        {position.sharePercent.toFixed(2)}% share
                      </span>
                    </div>
                    <div className="text-sm sm:text-base text-[#5E49C0]/70">
                      <div>{formatTokenAmount(position.token0.amount, position.token0.symbol)}</div>
                      <div>{formatTokenAmount(position.token1.amount, position.token1.symbol)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Remove liquidity UI */}
              {selectedPosition ? (
                <div className="mt-5 sm:mt-6 p-4 sm:p-5 rounded-xl bg-white/70 border border-white/50 shadow-md">
                  <h3 className="text-base sm:text-lg font-semibold text-[#5E49C0] mb-4 sm:mb-5">Remove Liquidity</h3>

                  <div className="mb-4 sm:mb-5">
                    <div className="flex justify-between mb-2 sm:mb-2">
                      <span className="text-[#5E49C0]/70 text-sm sm:text-base">Amount to remove</span>
                      <span className="text-[#5E49C0] font-medium text-sm sm:text-base">{removePercentage}%</span>
                    </div>
                    <Slider
                      value={[removePercentage]}
                      min={1}
                      max={100}
                      step={1}
                      onValueChange={(value) => setRemovePercentage(value[0])}
                      className="my-4 sm:my-5"
                    />
                    <div className="flex justify-between text-sm sm:text-base text-[#5E49C0]/70">
                      <span>1%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
                    <div className="flex justify-between">
                      <span className="text-[#5E49C0]/70 text-sm sm:text-base">You will receive:</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-[#5E49C0]/50 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-white border-[#5E49C0]/10 text-[#5E49C0]">
                            <p>Estimated output based on current pool ratio</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-[#F6F6F5]/50 border border-white/30">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {selectedPosition.token0.logoURI && !imageErrors[selectedPosition.token0.address] ? (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center mr-2 sm:mr-2 overflow-hidden shadow-sm">
                              <img
                                src={selectedPosition.token0.logoURI || "/placeholder.svg"}
                                alt={selectedPosition.token0.symbol}
                                className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                                onError={() => handleImageError(selectedPosition.token0.address)}
                              />
                            </div>
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] flex items-center justify-center mr-2 sm:mr-2 shadow-sm">
                              <span className="text-sm sm:text-base font-medium text-white">
                                {selectedPosition.token0.symbol.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-[#5E49C0] text-sm sm:text-base">
                            {formatTokenAmount(
                              (selectedPosition.token0.amount * BigInt(removePercentage)) / 100n,
                              selectedPosition.token0.symbol,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-[#F6F6F5]/50 border border-white/30">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {selectedPosition.token1.logoURI && !imageErrors[selectedPosition.token1.address] ? (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center mr-2 sm:mr-2 overflow-hidden shadow-sm">
                              <img
                                src={selectedPosition.token1.logoURI || "/placeholder.svg"}
                                alt={selectedPosition.token1.symbol}
                                className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                                onError={() => handleImageError(selectedPosition.token1.address)}
                              />
                            </div>
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] flex items-center justify-center mr-2 sm:mr-2 shadow-sm">
                              <span className="text-sm sm:text-base font-medium text-white">
                                {selectedPosition.token1.symbol.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-[#5E49C0] text-sm sm:text-base">
                            {formatTokenAmount(
                              (selectedPosition.token1.amount * BigInt(removePercentage)) / 100n,
                              selectedPosition.token1.symbol,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 sm:h-14 bg-[#5E49C0] hover:bg-[#5E49C0]/90 text-white shadow-md transition-all rounded-xl text-sm sm:text-base"
                    onClick={handleRemoveLiquidity}
                    disabled={removingLiquidity}
                  >
                    {removingLiquidity ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-2"></div>
                        <span>Removing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-2" />
                        <span>Remove Liquidity</span>
                      </div>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 sm:mt-5 p-4 sm:p-5 rounded-xl bg-[#F6F6F5]/50 border border-white/30 text-center">
                  <p className="text-sm sm:text-base text-[#5E49C0]/70">Select a position to remove liquidity</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}
