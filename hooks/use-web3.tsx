"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import { FACTORY_ADDRESS, FACTORY_ABI, ROUTER_ADDRESS, ROUTER_ABI } from "@/lib/constants"
import { NETWORK_CONFIG, isCorrectNetwork, switchToCorrectNetwork } from "@/lib/network-config"
import { useToast } from "@/hooks/use-toast"

interface Web3ContextType {
  account: string | null
  provider: any | null
  signer: any | null
  connect: () => Promise<void>
  disconnect: () => void
  getTokenBalance: (tokenAddress: string, account: string) => Promise<string>
  getRouterContract: () => ethers.Contract
  getFactoryContract: (useSigner?: boolean) => ethers.Contract
  isCorrectChain: boolean
  switchNetwork: () => Promise<boolean>
  chainId: number | null
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
  getTokenBalance: async () => "0",
  getRouterContract: () => ({}) as ethers.Contract,
  getFactoryContract: () => ({}) as ethers.Contract,
  isCorrectChain: false,
  switchNetwork: async () => false,
  chainId: null,
})

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<any | null>(null)
  const [signer, setSigner] = useState<any | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isCorrectChain, setIsCorrectChain] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if we're in the browser and if ethereum is available
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // Create a new Web3Provider instance
        const web3Provider = new ethers.BrowserProvider(window.ethereum)

        // Check if already connected
        const checkConnection = async () => {
          try {
            const accounts = await window.ethereum.request({ method: "eth_accounts" })
            if (accounts.length > 0) {
              setAccount(accounts[0])
              setProvider(web3Provider)

              // Get the signer
              const signerInstance = await web3Provider.getSigner()
              setSigner(signerInstance)

              // Check network
              const network = await web3Provider.getNetwork()
              const currentChainId = Number(network.chainId)
              setChainId(currentChainId)
              setIsCorrectChain(isCorrectNetwork(currentChainId))

              // Show warning if on wrong network
              if (!isCorrectNetwork(currentChainId)) {
                toast({
                  title: "Wrong Network",
                  description: `Please switch to ${NETWORK_CONFIG.name} network to use this DEX`,
                  variant: "destructive",
                  duration: 10000,
                })
              }
            }
          } catch (error) {
            console.error("Error checking connection:", error)
          }
        }

        checkConnection()

        // Listen for account changes
        window.ethereum.on("accountsChanged", async (accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0])

            // Update signer when account changes
            if (provider) {
              const signerInstance = await provider.getSigner()
              setSigner(signerInstance)
            }
          } else {
            setAccount(null)
            setSigner(null)
          }
        })

        // Listen for chain changes
        window.ethereum.on("chainChanged", async (newChainId: string) => {
          const chainIdNumber = Number.parseInt(newChainId, 16)
          setChainId(chainIdNumber)
          setIsCorrectChain(isCorrectNetwork(chainIdNumber))

          // Show warning if on wrong network
          if (!isCorrectNetwork(chainIdNumber)) {
            toast({
              title: "Wrong Network",
              description: `Please switch to ${NETWORK_CONFIG.name} network to use this DEX`,
              variant: "destructive",
              duration: 10000,
            })
          } else {
            toast({
              title: "Network Connected",
              description: `Successfully connected to ${NETWORK_CONFIG.name}`,
              duration: 5000,
            })
          }

          // Refresh provider and signer on chain change
          const web3Provider = new ethers.BrowserProvider(window.ethereum)
          setProvider(web3Provider)

          if (account) {
            const signerInstance = await web3Provider.getSigner()
            setSigner(signerInstance)
          }
        })
      } catch (error) {
        console.error("Error initializing web3:", error)
      }
    }
  }, [toast])

  const connect = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })

        // Create a new provider
        const web3Provider = new ethers.BrowserProvider(window.ethereum)

        if (accounts.length > 0) {
          setAccount(accounts[0])
          setProvider(web3Provider)

          // Get the signer
          const signerInstance = await web3Provider.getSigner()
          setSigner(signerInstance)

          // Check network
          const network = await web3Provider.getNetwork()
          const currentChainId = Number(network.chainId)
          setChainId(currentChainId)
          setIsCorrectChain(isCorrectNetwork(currentChainId))

          // Show warning if on wrong network
          if (!isCorrectNetwork(currentChainId)) {
            toast({
              title: "Wrong Network",
              description: `Please switch to ${NETWORK_CONFIG.name} network to use this DEX`,
              variant: "destructive",
              duration: 10000,
            })
          }
        }
      } catch (error) {
        console.error("Error connecting wallet:", error)
      }
    } else {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or another Ethereum wallet",
        variant: "destructive",
      })
    }
  }

  const switchNetwork = async () => {
    const success = await switchToCorrectNetwork()
    if (success) {
      toast({
        title: "Network Switched",
        description: `Successfully switched to ${NETWORK_CONFIG.name}`,
        duration: 5000,
      })
    } else {
      toast({
        title: "Network Switch Failed",
        description: `Failed to switch to ${NETWORK_CONFIG.name}. Please try manually.`,
        variant: "destructive",
        duration: 5000,
      })
    }
    return success
  }

  const disconnect = () => {
    setAccount(null)
    setSigner(null)
  }

  const getTokenBalance = async (tokenAddress: string, account: string): Promise<string> => {
    if (!provider) return "0"

    try {
      if (tokenAddress === "ETH" || tokenAddress === "MON") {
        const balance = await provider.getBalance(account)
        return ethers.formatEther(balance)
      }

      // First check if the address is valid
      if (!ethers.isAddress(tokenAddress)) {
        console.error("Invalid token address:", tokenAddress)
        return "0"
      }

      try {
        // Try with a more robust approach
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
          provider,
        )

        // First check if the contract exists and has the required methods
        const code = await provider.getCode(tokenAddress)
        if (code === "0x") {
          console.error("No contract at address:", tokenAddress)
          return "0"
        }

        // Get balance with proper error handling
        let balance
        try {
          balance = await tokenContract.balanceOf(account)
        } catch (error) {
          console.error("Error calling balanceOf:", error)
          return "0"
        }

        // Get decimals with proper error handling
        let decimals
        try {
          decimals = await tokenContract.decimals()
        } catch (error) {
          console.error("Error calling decimals, defaulting to 18:", error)
          decimals = 18 // Default to 18 if decimals() fails
        }

        return ethers.formatUnits(balance, decimals)
      } catch (error) {
        console.error("Error creating token contract:", error)
        return "0"
      }
    } catch (error) {
      console.error("Error getting token balance:", error)
      return "0"
    }
  }

  const getRouterContract = () => {
    if (!signer) throw new Error("Signer not initialized")
    return new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer)
  }

  const getFactoryContract = (useSigner = false) => {
    if (useSigner && signer) {
      return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)
    }
    if (!provider) throw new Error("Provider not initialized")
    // Factory is read-only, so we use provider
    return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider)
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        connect,
        disconnect,
        getTokenBalance,
        getRouterContract,
        getFactoryContract,
        isCorrectChain,
        switchNetwork,
        chainId,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => useContext(Web3Context)
