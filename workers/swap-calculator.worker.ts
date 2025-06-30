// This file will be detected as a web worker

// Define message types
interface SwapCalculationRequest {
  type: "calculate"
  fromAmount: string
  path: string[]
  reserves?: {
    reserveIn: string
    reserveOut: string
  }
}

interface SwapCalculationResponse {
  type: "result"
  toAmount: string
  priceImpact: string | null
}

// Helper function for price impact calculation
function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): string | null {
  try {
    // Calculate ideal output amount
    const idealOutAmount = (reserveOut * amountIn) / (reserveIn + amountIn)

    // Calculate price impact
    if (idealOutAmount > 0n) {
      const impact = (1 - Number(amountOut) / Number(idealOutAmount)) * 100
      return impact.toFixed(2)
    }
    return null
  } catch (error) {
    console.error("Error calculating price impact in worker:", error)
    return null
  }
}

// Listen for messages from the main thread
self.addEventListener("message", (event: MessageEvent<SwapCalculationRequest>) => {
  const { type, fromAmount, path, reserves } = event.data

  if (type === "calculate") {
    try {
      // For direct pairs with reserves, we can calculate locally
      if (path.length === 2 && reserves) {
        const reserveIn = BigInt(reserves.reserveIn)
        const reserveOut = BigInt(reserves.reserveOut)
        const amountIn = BigInt(fromAmount)

        // Calculate output amount using formula: outputAmount = (reserveOut * amountIn) / (reserveIn + amountIn)
        const outputAmount = (reserveOut * amountIn) / (reserveIn + amountIn)

        // Calculate price impact
        const priceImpact = calculatePriceImpact(amountIn, outputAmount, reserveIn, reserveOut)

        // Send result back to main thread
        const response: SwapCalculationResponse = {
          type: "result",
          toAmount: outputAmount.toString(),
          priceImpact,
        }

        self.postMessage(response)
      } else {
        // For complex routes, we can't calculate locally
        // Return null to signal that we need to use the router contract
        self.postMessage({
          type: "result",
          toAmount: null,
          priceImpact: null,
        })
      }
    } catch (error) {
      // Send error back to main thread
      self.postMessage({
        type: "error",
        message: "Failed to calculate swap in worker",
      })
    }
  }
})

export {}
