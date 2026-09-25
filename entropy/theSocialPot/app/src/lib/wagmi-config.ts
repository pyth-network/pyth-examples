import { baseSepolia } from "viem/chains"
import { createConfig, http } from "wagmi"
import { injected } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}

