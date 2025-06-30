"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "./use-web3"
import { useDebounce } from "./use-debounce"

// Define the possible states of a swap estimate
export interface SwapEstimate {
  toAmount: string
  priceImpact: string | null
  loading: boolean
  error: string | null
}

export function useSwapEstimate(
  fromToken: { address: string; symbol: string },
  toToken: { address: string; symbol: string },
  fromAmount: string,
  path: string[] | null,
): SwapEstimate {
  const { provider, getRouterContract, getFactoryContract } = useWeb3()
  const [estimate, setEstimate] = useState<SwapEstimate>({
    toAmount: "",
    priceImpact: null,
    loading: false,
    error: null,
  })

  // Cache results with a key
  const [estimateCache, setEstimateCache] = useState<Record<string, SwapEstimate>>({})

  // Debounce input to reduce calculations
  const debouncedAmount = useDebounce(fromAmount, 500)

  // Generate a cache key
  const getCacheKey = useCallback(
    (amount: string) => {
      if (!path) return ""
      return `${fromToken.address}-${toToken.address}-${path.join("-")}-${amount}`
    },
    [fromToken.address, toToken.address, path],
  )

  // Safely parse ether values
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

  // Calculate output amount and price impact
  const calculateEstimate = useCallback(
    async (amount: string) => {
      if (!amount || !provider || !path || amount === "0") {
        return {
          toAmount: "",
          priceImpact: null,
          loading: false,
          error: null,
        }
      }

      // Check cache first
      const cacheKey = getCacheKey(amount)
      if (estimateCache[cacheKey]) {
        return estimateCache[cacheKey]
      }

      // Special case: Same token
      if (fromToken.address === toToken.address) {
        const result = {
          toAmount: amount,
          priceImpact: "0",
          loading: false,
          error: null,
        }
        setEstimateCache((prev) => ({ ...prev, [cacheKey]: result }))
        return result
      }

      try {
        setEstimate((prev) => ({ ...prev, loading: true, error: null }))
        const router = getRouterContract()
        const amountIn = safeParseEther(amount)

        if (amountIn === 0n) {
          return {
            toAmount: "0",
            priceImpact: null,
            loading: false,
            error: null,
          }
        }

        // Get output amount with better error handling
        try {
          const amountOut = await router.getAmountsOut(amountIn, path)
          const outputAmount = ethers.formatEther(amountOut[1])

          const result = {
            toAmount: outputAmount,
            priceImpact: null,
            loading: false,
            error: null,
          }

          // Update cache
          setEstimateCache((prev) => ({ ...prev, [cacheKey]: result }))
          return result
        } catch (error) {
          console.log("Error estimating swap (pair may not exist):", error)
          return {
            toAmount: "0",
            priceImpact: null,
            loading: false,
            error: "Pair does not exist yet",
          }
        }
      } catch (error) {
        console.error("Error estimating swap:", error)
        return {
          toAmount: "Tidak dapat mengestimasi",
          priceImpact: null,
          loading: false,
          error: "Gagal mengestimasi swap",
        }
      }
    },
    [
      provider,
      path,
      fromToken.address,
      toToken.address,
      getCacheKey,
      estimateCache,
      getRouterContract,
      getFactoryContract,
      safeParseEther,
    ],
  )

  // Trigger estimate calculation when debounced amount changes
  useEffect(() => {
    if (!debouncedAmount) {
      setEstimate({
        toAmount: "",
        priceImpact: null,
        loading: false,
        error: null,
      })
      return
    }

    let mounted = true
    calculateEstimate(debouncedAmount).then((result) => {
      if (mounted) {
        setEstimate(result)
      }
    })

    return () => {
      mounted = false
    }
  }, [debouncedAmount, calculateEstimate])

  return estimate
}
