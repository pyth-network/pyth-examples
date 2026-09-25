import { baseSepolia } from 'wagmi/chains'
import { EntropyBeastsABI } from './abis/EntropyBeastsABI'

// Contract addresses - Update this with your deployed contract address
export const CONTRACTS = {
  ENTROPY_BEASTS: '0x3E8977Ce107DB75533E27E41bF1E8e14C8062F25' as const, 
  ENTROPY_V2: '0x41c9e39574f40ad34c79f1c99b66a45efb830d4c' as const,
} as const

export const ENTROPY_BEASTS_ABI = EntropyBeastsABI

// Chain configuration
export const SUPPORTED_CHAINS = [baseSepolia] as const

// Gas limits for different NFT sizes
export const GAS_LIMITS = {
  small: 50000,
  big: 150000,
} as const