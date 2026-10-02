import { createConfig, http } from "wagmi";
import { blastSepolia } from "wagmi/chains";

export const WagmiConfig = createConfig({
  chains: [blastSepolia],
  ssr: true,
  transports: {
    [blastSepolia.id]: http(),
  },
  multiInjectedProviderDiscovery: true,
});
