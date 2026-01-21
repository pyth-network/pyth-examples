import { createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

export const WagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  ssr: true,
  transports: {
    [arbitrumSepolia.id]: http(),
  },
  multiInjectedProviderDiscovery: true,
});
