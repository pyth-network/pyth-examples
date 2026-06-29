import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, hardhat } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Entropy Beasts NFT',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [sepolia, hardhat],
  ssr: true,
})