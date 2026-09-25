import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    "base-sepolia": {
      type: "http",
      chainType: "generic",
      url: "https://sepolia.base.org",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    "flare-coston2": {
      type: "http",
      chainType: "generic",
      url: "https://coston2-api.flare.network/ext/C/rpc",
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
    
});
