"use client"

import { useState, useEffect, useMemo } from "react"
import { ethers } from "ethers"
import { WETH_ADDRESS } from "@/lib/constants"
import { useWeb3 } from "./use-web3"

type LiquidityPairInfo = {
  pairAddress: string | null
  reserves: { reserve0: bigint; reserve1: bigint } | null
  token0: string | null
  token1: string | null
  loading: boolean
  error: string | null
  pairExists: boolean
}

export function useLiquidityPair(
  tokenA: { address: string; symbol: string },
  tokenB: { address: string; symbol: string },
): LiquidityPairInfo {
  const { provider, getFactoryContract } = useWeb3()
  const [pairInfo, setPairInfo] = useState<LiquidityPairInfo>({
    pairAddress: null,
    reserves: null,
    token0: null,
    token1: null,
    loading: false,
    error: null,
    pairExists: false,
  })

  // Memoize token addresses to ensure consistent order
  const [address0, address1] = useMemo(() => {
    if (
      tokenA.address === "0x0000000000000000000000000000000000000000" ||
      tokenB.address === "0x0000000000000000000000000000000000000000"
    ) {
      return [null, null]
    }

    // Handle native token special case
    const addressA = tokenA.address === "ETH" || tokenA.address === "MON" ? WETH_ADDRESS : tokenA.address
    const addressB = tokenB.address === "ETH" || tokenB.address === "MON" ? WETH_ADDRESS : tokenB.address

    // Return addresses in lexicographical order as the factory contract does
    return addressA.toLowerCase() < addressB.toLowerCase() ? [addressA, addressB] : [addressB, addressA]
  }, [tokenA.address, tokenB.address])

  // Fetch pair info when tokens change
  useEffect(() => {
    let mounted = true
    if (!provider || !address0 || !address1) {
      setPairInfo({
        pairAddress: null,
        reserves: null,
        token0: null,
        token1: null,
        loading: false,
        error: null,
        pairExists: false,
      })
      return
    }

    const fetchPairInfo = async () => {
      setPairInfo((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const factory = getFactoryContract()

        // Get pair address
        const pairAddress = await factory.getPair(address0, address1)

        // Check if pair exists
        if (pairAddress === ethers.ZeroAddress) {
          if (mounted) {
            setPairInfo({
              pairAddress: null,
              reserves: null,
              token0: address0,
              token1: address1,
              loading: false,
              error: null,
              pairExists: false,
            })
          }
          return
        }

        // Pair exists, get reserves
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
        const token0 = await pairContract.token0()
        const token1 = await pairContract.token1()

        if (mounted) {
          setPairInfo({
            pairAddress,
            reserves: { reserve0, reserve1 },
            token0,
            token1,
            loading: false,
            error: null,
            pairExists: true,
          })
        }
      } catch (error) {
        console.error("Error fetching pair info:", error)
        if (mounted) {
          setPairInfo({
            pairAddress: null,
            reserves: null,
            token0: address0,
            token1: address1,
            loading: false,
            error: "Failed to fetch pair information",
            pairExists: false,
          })
        }
      }
    }

    fetchPairInfo()

    return () => {
      mounted = false
    }
  }, [provider, address0, address1, getFactoryContract])

  return pairInfo
}
