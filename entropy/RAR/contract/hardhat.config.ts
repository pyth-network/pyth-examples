import "@nomicfoundation/hardhat-toolbox-viem";
import "solidity-coverage";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        runs: 1000,
        enabled: true,
      },
      viaIR: true,
    },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
  },
  networks: {

    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc", // Fixed RPC URL
      accounts: process.env.WALLET_KEY ? [process.env.WALLET_KEY] : [],
    }
  },
  etherscan: {
    apiKey: {
      "arbitrum-sepolia": process.env.ARBISCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "arbitrum-sepolia", 
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      }
    ],
  },
  defaultNetwork: "hardhat",
};

export default config;