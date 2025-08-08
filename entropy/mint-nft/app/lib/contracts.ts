import { base } from 'wagmi/chains'

// Contract addresses
export const CONTRACTS = {
  ENTROPY_BEASTS: '0x2e2BAe4389DdD3272b945b0833eCf20554202f2c' as const,
} as const

// Contract ABIs
export const ENTROPY_BEASTS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_entropy", type: "address" }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "strength", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "intelligence", type: "uint256" },
      { indexed: false, internalType: "uint32", name: "gasUsed", type: "uint32" }
    ],
    name: "BeastMinted",
    type: "event"
  },
  {
    inputs: [
      { internalType: "uint32", name: "gasLimit", type: "uint32" },
      { internalType: "bool", name: "isBig", type: "bool" }
    ],
    name: "mintBeast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "getBeast",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "uint256", name: "strength", type: "uint256" },
          { internalType: "uint256", name: "intelligence", type: "uint256" }
        ],
        internalType: "struct EntropyBeasts.Beast",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

// Chain configuration
export const SUPPORTED_CHAINS = [base] as const

// Gas limits for different NFT sizes
export const GAS_LIMITS = {
  small: 50000,
  big: 150000,
} as const

// Fee estimation (approximate - will be fetched from contract)
export const ESTIMATED_FEES = {
  small: 0.001, // ETH
  big: 0.003,   // ETH
} as const
