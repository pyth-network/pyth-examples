import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  argentWallet,
  coinbaseWallet,
  ledgerWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import type { Transport } from "viem";
import { defineChain } from 'viem/chains/utils'
import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";



export const virtualBase = defineChain({
  id: 8453,
  name: 'Virtual Base',
  nativeCurrency: { name: 'VETH', symbol: 'VETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://virtual.base.rpc.tenderly.co/d20a0d8a-03ee-4c00-adc1-f51d5e98d8cc'] }
  },
  blockExplorers: {
    default: {
      name: 'Tenderly Explorer',
      url: 'https://virtual.base.rpc.tenderly.co/5a3592a7-b6d4-4dd1-9c4b-5292da842e2b'
    }
  },
})

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  throw new Error(
    "WalletConnect project ID is not defined. Please check your environment variables.",
  );
}

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
        ledgerWallet,
        rabbyWallet,
        coinbaseWallet,
        argentWallet,
        safeWallet,
      ],
    },
  ],
  { appName: "Next-Web3-Boilerplate", projectId: walletConnectProjectId },
);

const transports: Record<number, Transport> = {
  [virtualBase.id]: http(),
};

export const wagmiConfig = createConfig({
  chains: [virtualBase],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "" }),
  ],
  ssr: true,
  transports: {
    [virtualBase.id]: http('https://virtual.base.rpc.tenderly.co/d20a0d8a-03ee-4c00-adc1-f51d5e98d8cc')
  }
});
