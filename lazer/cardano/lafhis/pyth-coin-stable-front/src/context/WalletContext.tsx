import { createContext, useCallback, useContext, useMemo, useState } from "react";

type WalletContextValue = {
  connected: boolean;
  walletName: string | null;
  balanceAda: string | null;
  changeAddress: string | null;
  networkId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [balanceAda, setBalanceAda] = useState<string | null>(null);
  const [changeAddress, setChangeAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);

  const connect = useCallback(async () => {
    const { BrowserWallet } = await import("@meshsdk/wallet");

    const wallets = BrowserWallet.getInstalledWallets();
    if (wallets.length === 0) {
      console.warn("[wallet] no installed wallets found by Mesh BrowserWallet");
      return;
    }

    const selectedWallet = wallets[0]?.name;
    if (!selectedWallet) {
      console.warn("[wallet] wallet list is empty");
      return;
    }

    const wallet = await BrowserWallet.enable(selectedWallet);
    const [assets, address, currentNetwork] = await Promise.all([
      wallet.getBalance(),
      wallet.getChangeAddress(),
      wallet.getNetworkId(),
    ]);

    const lovelace = assets.find((asset) => asset.unit === "lovelace")?.quantity ?? "0";
    const ada = (Number(lovelace) / 1_000_000).toFixed(6);

    setConnected(true);
    setWalletName(selectedWallet);
    setBalanceAda(ada);
    setChangeAddress(address);
    setNetworkId(currentNetwork);

    console.log(`[wallet] connected (Mesh): ${selectedWallet}`);
    console.log(`[wallet] networkId: ${currentNetwork}`);
    console.log(`[wallet] lovelace: ${lovelace}`);
    console.log(`[wallet] balance (ADA): ${ada}`);
    console.log(`[wallet] change address (hex): ${address}`);
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setWalletName(null);
    setBalanceAda(null);
    setChangeAddress(null);
    setNetworkId(null);
    console.log("[wallet] disconnected");
  }, []);

  const value = useMemo(
    () => ({
      connected,
      walletName,
      balanceAda,
      changeAddress,
      networkId,
      connect,
      disconnect,
    }),
    [connected, walletName, balanceAda, changeAddress, networkId, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWalletContext must be used inside WalletProvider");
  }
  return ctx;
}
