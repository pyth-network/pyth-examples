import { createConfig, http } from "wagmi";
import { blastSepolia, optimismSepolia, arbitrumSepolia } from "wagmi/chains";

export const WagmiConfig = createConfig({
  chains: [blastSepolia, optimismSepolia, arbitrumSepolia],
  ssr: true,
  transports: {
    [blastSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
  multiInjectedProviderDiscovery: true,
});
