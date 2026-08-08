export interface Cip30WalletApi {
  getNetworkId(): Promise<number>;
  getUsedAddresses(paginate?: { page: number; limit: number }): Promise<string[]>;
  getChangeAddress(): Promise<string>;
}

export interface Cip30WalletProvider {
  apiVersion: string;
  name: string;
  icon: string;
  isEnabled(): Promise<boolean>;
  enable(): Promise<Cip30WalletApi>;
}

export interface EternlWalletState {
  isInstalled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  walletName: string;
  walletIcon: string | null;
  networkId: number | null;
  networkName: string;
  primaryAddressHex: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

declare global {
  interface Window {
    cardano?: {
      eternl?: Cip30WalletProvider;
      ccvault?: Cip30WalletProvider;
    };
  }
}
