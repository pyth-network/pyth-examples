import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const CELO_USD = 0.157955;
const gasPriceJson = encodeURIComponent(JSON.stringify({ standard: 5 }));

const config: HardhatUserConfig = {
  solidity: "0.8.20",

  networks: {
    localhost: {
      url: "http://127.0.0.1:7545",
    },

    celoSepolia: {
      url: "https://forno.celo-sepolia.celo-testnet.org/",
      chainId: 11142220,
      accounts: {
        mnemonic: process.env.MNEMONIC!,
        initialIndex: 0,
        count: 1,
        path: "m/44'/60'/0'/0",
      },
    },

    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: {
        mnemonic: process.env.MNEMONIC!,
        initialIndex: 0,
        count: 1,
        path: "m/44'/52752'/0'/0",
      },
    },
  },

  gasReporter: {
    enabled: true,
    currency: "USD",
    token: "celo",
    gasPriceApi: `data:application/json,${gasPriceJson}?usd=${CELO_USD}`,
  },
};

export default config;
