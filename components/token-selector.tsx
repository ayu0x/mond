"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Search, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ethers } from "ethers"
import { useWeb3 } from "@/hooks/use-web3"
import { useToast } from "@/hooks/use-toast"
import { fetchTokenList } from "@/lib/token-list"

// Update the DEFAULT_TOKEN_LIST to only include ETH for MEGA Testnet
const DEFAULT_TOKEN_LIST = [
  {
    address: "ETH",
    symbol: "ETH",
    name: "MEGA Testnet Ether",
    decimals: 18,
    logoURI:
      "https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
]

interface TokenSelectorProps {
  selectedToken: { address: string; symbol: string; logoURI?: string }
  onSelectToken: (token: { address: string; symbol: string; logoURI?: string }) => void
  otherToken: { address: string; symbol: string; logoURI?: string }
  imageErrors?: Record<string, boolean>
  onImageError?: (tokenAddress: string) => void
}

export function TokenSelector({
  selectedToken,
  onSelectToken,
  otherToken,
  imageErrors = {},
  onImageError,
}: TokenSelectorProps) {
  const { provider } = useWeb3()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [tokenList, setTokenList] = useState(DEFAULT_TOKEN_LIST)
  const [isValidating, setIsValidating] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  // Fetch token list when component mounts
  useEffect(() => {
    const loadTokens = async () => {
      setIsLoadingTokens(true)
      try {
        const tokens = await fetchTokenList()
        setTokenList(tokens)
      } catch (error) {
        console.error("Failed to load token list:", error)
        toast({
          title: "Failed to load tokens",
          description: "Using default token list instead",
          variant: "destructive",
        })
      } finally {
        setIsLoadingTokens(false)
      }
    }

    loadTokens()
  }, [toast])

  // Update the filter function to not exclude WETH specifically
  const filteredTokens = tokenList.filter((token) => {
    // Basic filtering by search query (search by name, symbol, or address)
    const matchesSearch =
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (token.name && token.name.toLowerCase().includes(searchQuery.toLowerCase()))

    // Don't show the token that's already selected in the other selector
    const isNotOtherToken = token.address !== otherToken.address

    return matchesSearch && isNotOtherToken
  })

  const handleSelectToken = (token: { address: string; symbol: string; logoURI?: string }) => {
    onSelectToken(token)
    setOpen(false)
    setSearchQuery("")
  }

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value)

    // Check if the input is a valid Ethereum address
    if (ethers.isAddress(value) && !tokenList.some((token) => token.address.toLowerCase() === value.toLowerCase())) {
      validateAndAddToken(value)
    }
  }

  const validateAndAddToken = async (address: string) => {
    if (!provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to add custom tokens",
        variant: "destructive",
      })
      return
    }

    setIsValidating(true)

    try {
      // Check if token already exists in the list
      if (tokenList.some((token) => token.address.toLowerCase() === address.toLowerCase())) {
        // Token already exists, no need to add it again
        setIsValidating(false)
        return
      }

      // Create a contract instance to check if it's a valid ERC20
      const tokenContract = new ethers.Contract(
        address,
        [
          "function symbol() view returns (string)",
          "function name() view returns (string)",
          "function decimals() view returns (uint8)",
          "function totalSupply() view returns (uint256)",
        ],
        provider,
      )

      // Try to get token symbol and decimals to validate it's an ERC20
      const symbol = await tokenContract.symbol()
      const decimals = await tokenContract.decimals()
      const name = await tokenContract.name()

      // Add token to the list
      const newToken = {
        address: address,
        symbol: symbol,
        name: name,
        decimals: Number(decimals),
        // No logoURI for custom tokens
      }

      setTokenList((prev) => [...prev, newToken])

      toast({
        title: "Token added",
        description: `${symbol} has been added to your token list`,
      })

      // Optionally, select the newly added token
      handleSelectToken(newToken)
    } catch (error) {
      console.error("Error validating token:", error)
      toast({
        title: "Invalid token",
        description: "The address does not appear to be a valid ERC20 token",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleImageError = (tokenAddress: string) => {
    if (onImageError) {
      onImageError(tokenAddress)
    }
  }

  // Special case for the placeholder token
  const isPlaceholderToken = selectedToken.address === "0x0000000000000000000000000000000000000000"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white hover:border-white text-[#5E49C0] h-11 px-3 sm:px-4 rounded-xl transition-all shadow-sm"
        >
          <div className="flex items-center">
            {isPlaceholderToken ? (
              <div className="w-7 h-7 rounded-full bg-[#F6F6F5] flex items-center justify-center mr-2">
                <span className="font-medium text-sm text-[#5E49C0]/70">S</span>
              </div>
            ) : selectedToken.logoURI && !imageErrors[selectedToken.address] ? (
              <div className="w-7 h-7 mr-2 rounded-full overflow-hidden">
                <img
                  src={selectedToken.logoURI || "/placeholder.svg"}
                  alt={selectedToken.symbol}
                  className="w-full h-full object-contain"
                  onError={() => handleImageError(selectedToken.address)}
                />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] flex items-center justify-center mr-2">
                <span className="font-medium text-sm text-white">{selectedToken.symbol.charAt(0)}</span>
              </div>
            )}
            <span className="font-medium text-sm text-[#5E49C0]">{selectedToken.symbol}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 text-[#5E49C0]/50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-sm border-white/50 rounded-2xl shadow-xl max-w-[90vw] sm:max-w-md p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-[#5E49C0] text-lg font-semibold">Select a token</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5E49C0]/50 h-4 w-4" />
            <Input
              placeholder="Search token name or paste address"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-[#F6F6F5]/30 border-white/30 text-[#5E49C0] pl-10 focus-visible:ring-[#5E49C0]/20 focus-visible:border-[#5E49C0]/30 h-11 rounded-xl"
            />
            {isValidating && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#5E49C0]/50" />
              </div>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {isLoadingTokens ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#5E49C0]/70" />
                <span className="ml-3 text-[#5E49C0]/70 text-sm">Loading tokens...</span>
              </div>
            ) : filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <Button
                  key={token.address}
                  variant="ghost"
                  className="w-full justify-start hover:bg-[#F6F6F5]/30 text-[#5E49C0] h-12 rounded-xl"
                  onClick={() => handleSelectToken(token)}
                >
                  {token.logoURI && !imageErrors[token.address] ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mr-3 bg-white/50">
                      <img
                        src={token.logoURI || "/placeholder.svg"}
                        alt={token.symbol}
                        className="w-6 h-6 object-contain"
                        onError={() => handleImageError(token.address)}
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5E49C0] to-[#7A68D4] flex items-center justify-center mr-3">
                      <span className="font-medium text-white text-sm">{token.symbol.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{token.symbol}</span>
                    {token.address !== "ETH" && (
                      <span className="text-xs text-[#5E49C0]/70 truncate max-w-[200px]">
                        {token.name || `${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
                      </span>
                    )}
                  </div>
                </Button>
              ))
            ) : (
              <div className="text-center py-8 text-[#5E49C0]/70 text-sm">
                {isValidating
                  ? "Validating token..."
                  : ethers.isAddress(searchQuery)
                    ? "Invalid token address. Try another address."
                    : "No tokens found. Try searching by name or paste a token address."}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
