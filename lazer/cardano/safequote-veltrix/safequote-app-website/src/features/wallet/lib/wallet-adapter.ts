import { BrowserWallet } from "@meshsdk/core";

function assertBrowserEnvironment() {
  if (typeof window === "undefined") {
    throw new Error("Browser wallet APIs are only available on the client");
  }
}

export async function getInstalledWallets() {
  assertBrowserEnvironment();
  return BrowserWallet.getAvailableWallets();
}

export async function connectWallet(walletName: string) {
  assertBrowserEnvironment();

  const wallet = await BrowserWallet.enable(walletName);
  const networkId = await wallet.getNetworkId();
  const changeAddress = await wallet.getChangeAddress();

  if (networkId === 1) {
    throw new Error("Mainnet wallet detected. Switch to preprod/testnet.");
  }

  return { wallet, networkId, changeAddress };
}
