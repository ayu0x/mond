export interface Token {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string // Make logoURI optional since some tokens might not have it
}

export interface TokenList {
  name: string
  keywords: string[]
  timestamp: string
  tokens: Token[]
  version: {
    major: number
    minor: number
    patch: number
  }
}

// Cache the token list to avoid fetching it multiple times
let cachedTokenList: { address: string; symbol: string; name: string; decimals: number; logoURI?: string }[] | null =
  null

export const fetchTokenList = async (): Promise<
  { address: string; symbol: string; name: string; decimals: number; logoURI?: string }[]
> => {
  // If we have a cached list, return it
  if (cachedTokenList) {
    return cachedTokenList
  }

  try {
    // Use the new GitHub URL provided by the user
    const response = await fetch("https://raw.githubusercontent.com/furidngrt/DexSwap/master/monad-list-erc20.json", {
      cache: "no-store", // Don't cache the response
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status}`)
    }

    const data: TokenList = await response.json()

    // Format the tokens for our application
    const formattedTokens = data.tokens.map((token) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI, // Include the logoURI
    }))

    // Add MON to the list if it's not already included
    const hasMON = formattedTokens.some((token) => token.symbol === "MON")

    const finalTokenList = [
      // Always include MON at the top with the provided logo
      {
        address: "MON",
        symbol: "MON",
        name: "Monad Testnet",
        decimals: 18,
        logoURI: "https://docs.monad.xyz/img/monad_logo.png",
      },
      // Include all tokens from the fetched list
      ...formattedTokens.filter((token) => token.symbol !== "MON"), // Filter out MON if it's in the list
    ]

    // Cache the result
    cachedTokenList = finalTokenList
    return finalTokenList
  } catch (error) {
    console.error("Error fetching token list:", error)
    // Return default tokens if fetch fails
    return [
      {
        address: "MON",
        symbol: "MON",
        name: "Monad Testnet",
        decimals: 18,
        logoURI: "https://docs.monad.xyz/img/monad_logo.png",
      },
    ]
  }
}
