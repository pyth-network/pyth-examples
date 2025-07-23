import { toHex } from "viem";
import { wagmiConfig } from "./wagmi";

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const tenderlyBaseNetwork: NetworkConfig = {
  chainId: wagmiConfig.chains[0].id,
  chainName: "Base (Tenderly)",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: [wagmiConfig.chains[0].rpcUrls.default.http[0]],
  blockExplorerUrls: [wagmiConfig.chains[0].blockExplorers?.default.url || ""],
};

export async function addTenderlyNetworkToMetaMask(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      return {
        success: false,
        message: "MetaMask is not installed. Please install MetaMask first.",
      };
    }

    // Check if the network is already added
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChainId === toHex(tenderlyBaseNetwork.chainId)) {
      return {
        success: true,
        message: "Network is already added and active.",
      };
    }

    // Add the network to MetaMask
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: toHex(tenderlyBaseNetwork.chainId),
          chainName: tenderlyBaseNetwork.chainName,
          nativeCurrency: tenderlyBaseNetwork.nativeCurrency,
          rpcUrls: tenderlyBaseNetwork.rpcUrls,
          blockExplorerUrls: tenderlyBaseNetwork.blockExplorerUrls,
        },
      ],
    });

    return {
      success: true,
      message: "Tenderly Base network added successfully!",
    };
  } catch (error) {
    console.error("Failed to add network:", error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("User rejected")) {
        return {
          success: false,
          message: "Network addition was cancelled by user.",
        };
      }
      if (error.message.includes("already exists")) {
        return {
          success: true,
          message: "Network already exists in MetaMask.",
        };
      }
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add network to MetaMask.",
    };
  }
}

// Note: window.ethereum types are already declared globally by wagmi/viem 