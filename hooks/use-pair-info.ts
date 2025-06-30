"use client"

import { useState, useEffect, useMemo } from "react"
import { ethers } from "ethers"
import { WETH_ADDRESS } from "@/lib/constants"
import { useWeb3 } from "./use-web3"

type PairInfo = {
  path: string[] | null
  reserves: { reserveIn: bigint; reserveOut: bigint } | null
  loading: boolean
  error: string | null
  pairExists: boolean
}

export function usePairInfo(
  fromToken: { address: string; symbol: string },
  toToken: { address: string; symbol: string },
): PairInfo {
  const { provider, getFactoryContract } = useWeb3()
  const [pairInfo, setPairInfo] = useState<PairInfo>({
    path: null,
    reserves: null,
    loading: false,
    error: null,
    pairExists: false,
  })

  // Memoize path calculation
  const path = useMemo(() => {
    if (
      fromToken.address === "0x0000000000000000000000000000000000000000" ||
      toToken.address === "0x0000000000000000000000000000000000000000"
    ) {
      return null
    }

    if (fromToken.address === toToken.address) {
      return null
    }

    if (fromToken.address === "ETH" || fromToken.address === "MON") {
      return [WETH_ADDRESS, toToken.address]
    } else if (toToken.address === "ETH" || toToken.address === "MON") {
      return [fromToken.address, WETH_ADDRESS]
    } else {
      return [fromToken.address, WETH_ADDRESS, toToken.address]
    }
  }, [fromToken.address, toToken.address])

  // Fetch reserves only when necessary
  useEffect(() => {
    let mounted = true
    if (!provider || !path || path.length < 2) {
      setPairInfo((prev) => ({ ...prev, path, reserves: null, pairExists: false }))
      return
    }

    // Only fetch reserves for direct pairs (not via WETH)
    if (path.length === 2) {
      const fetchReserves = async () => {
        setPairInfo((prev) => ({ ...prev, loading: true, error: null }))
        try {
          const factory = getFactoryContract()

          // Wrap this in a try-catch to handle non-existent pairs gracefully
          try {
            const pairAddress = await factory.getPair(path[0], path[1])

            // Check if pair exists
            if (pairAddress === ethers.ZeroAddress) {
              if (mounted) {
                setPairInfo({
                  path,
                  reserves: null,
                  loading: false,
                  error: null,
                  pairExists: false,
                })
              }
              return
            }

            // Fetch reserves
            const pairContract = new ethers.Contract(
              pairAddress,
              [
                "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
                "function token0() external view returns (address)",
              ],
              provider,
            )

            const [reserve0, reserve1] = await pairContract.getReserves()
            const token0 = await pairContract.token0()

            // Determine which reserve corresponds to which token
            let reserveIn, reserveOut
            if (path[0].toLowerCase() === token0.toLowerCase()) {
              reserveIn = reserve0
              reserveOut = reserve1
            } else {
              reserveIn = reserve1
              reserveOut = reserve0
            }

            if (mounted) {
              setPairInfo({
                path,
                reserves: { reserveIn, reserveOut },
                loading: false,
                error: null,
                pairExists: true,
              })
            }
          } catch (error) {
            console.log("Pair doesn't exist or other contract error:", error)
            if (mounted) {
              setPairInfo({
                path,
                reserves: null,
                loading: false,
                error: null, // Don't set error for non-existent pairs
                pairExists: false,
              })
            }
          }
        } catch (error) {
          console.error("Error fetching pair info:", error)
          if (mounted) {
            setPairInfo({
              path,
              reserves: null,
              loading: false,
              error: "Failed to fetch pair information",
              pairExists: false,
            })
          }
        }
      }

      fetchReserves()
    } else {
      // For indirect pairs (via WETH), we don't fetch reserves
      setPairInfo({
        path,
        reserves: null,
        loading: false,
        error: null,
        pairExists: true, // Assume it exists if we go via WETH
      })
    }

    return () => {
      mounted = false
    }
  }, [provider, path, getFactoryContract])

  return pairInfo
}
