// Network configuration for the DEX
// Change these values when deploying to a different network

// Monad Testnet network configuration
export const NETWORK_CONFIG = {
  chainId: 10143, // Monad Testnet chain ID
  chainIdHex: "0x279f", // Hex version of the chain ID
  name: "Monad Testnet",
  currency: {
    name: "Monad Testnet",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrl: "https://testnet-rpc.monad.xyz", // Public RPC URL
  blockExplorer: "https://testnet.monadexplorer.com",
}

// List of supported networks for easy switching in the future
export const SUPPORTED_NETWORKS = {
  MONAD_TESTNET: {
    chainId: 10143,
    chainIdHex: "0x279f",
    name: "Monad Testnet",
    currency: {
      name: "Monad Testnet",
      symbol: "MON",
      decimals: 18,
    },
    rpcUrl: "https://testnet-rpc.monad.xyz",
    blockExplorer: "https://testnet.monadexplorer.com",
  },
  MAINNET: {
    chainId: 1,
    chainIdHex: "0x1",
    name: "Ethereum Mainnet",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    blockExplorer: "https://etherscan.io",
  },
  GOERLI: {
    chainId: 5,
    chainIdHex: "0x5",
    name: "Goerli",
    currency: {
      name: "Goerli Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    blockExplorer: "https://goerli.etherscan.io",
  },
  SEPOLIA: {
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    name: "Sepolia",
    currency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    blockExplorer: "https://sepolia.etherscan.io",
  },
  // Add more networks as needed
}

// Check if the user is connected to the correct network
export const isCorrectNetwork = (chainId: number | string): boolean => {
  if (typeof chainId === "string") {
    // Convert hex string to number if needed
    chainId = Number.parseInt(chainId, 16)
  }
  return chainId === NETWORK_CONFIG.chainId
}

// Request network switch
export const switchToCorrectNetwork = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !window.ethereum) {
    console.error("No ethereum provider found")
    return false
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
    })
    return true
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: NETWORK_CONFIG.chainIdHex,
              chainName: NETWORK_CONFIG.name,
              nativeCurrency: NETWORK_CONFIG.currency,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              blockExplorerUrls: [NETWORK_CONFIG.blockExplorer],
            },
          ],
        })
        return true
      } catch (addError) {
        console.error("Error adding network:", addError)
        return false
      }
    }
    console.error("Error switching network:", switchError)
    return false
  }
}

// Improve the getExplorerTransactionLink function to handle transaction hash issues
export const getExplorerTransactionLink = (txHash: string): string => {
  // Ensure the transaction hash is complete (0x + 64 characters)
  if (!txHash) {
    console.warn("Invalid transaction hash: empty hash")
    return NETWORK_CONFIG.blockExplorer
  }

  // Check if it starts with 0x
  if (!txHash.startsWith("0x")) {
    console.warn("Invalid transaction hash format (missing 0x prefix):", txHash)
    txHash = "0x" + txHash // Add 0x prefix
  }

  // Check length - should be 66 characters (0x + 64 hex chars)
  if (txHash.length !== 66) {
    console.warn(`Invalid transaction hash length (${txHash.length}, expected 66):`, txHash)

    // If too short, pad with zeros
    if (txHash.length < 66) {
      const paddingNeeded = 66 - txHash.length
      const padding = "0".repeat(paddingNeeded)
      txHash = txHash.slice(0, 2) + padding + txHash.slice(2)
    }

    // If too long, truncate
    if (txHash.length > 66) {
      txHash = txHash.slice(0, 66)
    }
  }

  // Validate that it only contains hex characters
  const hexRegex = /^0x[0-9a-fA-F]{64}$/
  if (!hexRegex.test(txHash)) {
    console.warn("Invalid transaction hash format (non-hex characters):", txHash)
    // Replace any non-hex characters with valid ones
    const cleanedHash =
      "0x" +
      txHash
        .slice(2)
        .replace(/[^0-9a-fA-F]/g, "0")
        .padEnd(64, "0")
    return `${NETWORK_CONFIG.blockExplorer}/tx/${cleanedHash}`
  }

  return `${NETWORK_CONFIG.blockExplorer}/tx/${txHash}`
}

// Format address to block explorer URL
import { ethers } from "ethers"

export const getExplorerAddressLink = (address: string): string => {
  // Ensure the address is valid
  if (!address || !ethers.isAddress(address)) {
    console.warn("Invalid address format:", address)
    return NETWORK_CONFIG.blockExplorer
  }
  return `${NETWORK_CONFIG.blockExplorer}/address/${address}`
}
