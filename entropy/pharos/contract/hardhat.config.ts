import "@nomicfoundation/hardhat-toolbox-viem";
import "solidity-coverage";

require("dotenv").config();

const config = {
  solidity: {
    version: "0.8.20",
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
      accounts: [process.env.WALLET_KEY as string],
      gasPrice: 20000000,
    },
  },
  etherscan: {
    apiKey: {
      "blast-sepolia": process.env.BLAST_SCAN_API_KEY || "",
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

