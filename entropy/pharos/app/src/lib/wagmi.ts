import { createConfig } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { http } from 'viem'

export const config = createConfig({
  chains: [arbitrumSepolia],
  transports: {
    
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}