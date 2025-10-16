import "@nomicfoundation/hardhat-toolbox-viem";
import "solidity-coverage";

require("dotenv").config();

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
    "blast-sepolia": {
      url: "https://sepolia.blast.io",
      accounts: process.env.WALLET_KEY ? [process.env.WALLET_KEY] : [],
      gasPrice: 20000000,
    },
    "optimism-sepolia": {
      url: "https://sepolia.optimism.io",
      accounts: process.env.WALLET_KEY ? [process.env.WALLET_KEY] : [],
    },
    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.WALLET_KEY ? [process.env.WALLET_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      "blast-sepolia": process.env.BLAST_SCAN_API_KEY || "",
      "optimism-sepolia": process.env.OPTIMISM_SCAN_API_KEY || "",
      "arbitrum-sepolia": process.env.ARBITRUM_SCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "blast-sepolia",
        chainId: 168587773,
        urls: {
          apiURL: "https://api-sepolia.blastscan.io/api",
          browserURL: "https://sepolia.blast.io",
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
};

export default config;
