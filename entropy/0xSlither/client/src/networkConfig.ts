/**
 * Network Configuration for 0xSlither
 * This configuration is used to automatically add the network to MetaMask
 */

export interface NetworkConfig {
  chainId: bigint;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

// Chain ID as a number for calculations
const CHAIN_ID_DECIMAL = 2763767854157000n;

// Saga Chainlet Configuration
export const NETWORK_CONFIG: NetworkConfig = {
  chainId: CHAIN_ID_DECIMAL,
  chainIdHex: '0x' + CHAIN_ID_DECIMAL.toString(16), // Auto-computed: 0x9d1a1d9304cc8
  chainName: '0xSlither Saga Chainlet',
  nativeCurrency: {
    name: 'SSS',
    symbol: 'SSS',
    decimals: 18,
  },
  rpcUrls: ['https://slither-2763767854157000-1.jsonrpc.sagarpc.io'],
  blockExplorerUrls: ['https://slither-2763767854157000-1.sagaexplorer.io'],
};

/**
 * Get the parameters needed for wallet_addEthereumChain RPC call
 */
export function getAddChainParameters() {
  return {
    chainId: NETWORK_CONFIG.chainIdHex,
    chainName: NETWORK_CONFIG.chainName,
    nativeCurrency: NETWORK_CONFIG.nativeCurrency,
    rpcUrls: NETWORK_CONFIG.rpcUrls,
    blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrls,
  };
}

/**
 * Get the parameters needed for wallet_switchEthereumChain RPC call
 */
export function getSwitchChainParameters() {
  return {
    chainId: NETWORK_CONFIG.chainIdHex,
  };
}

