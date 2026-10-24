// CIP-30 Cardano dApp Connector — Type Declarations
// Supports: Lace, Nami, Eternl, Flint, etc.

interface CardanoCIP30 {
  apiVersion: string;
  name: string;
  icon: string;
  enable(): Promise<CardanoCIP30API>;
  isEnabled(): Promise<boolean>;
}

interface CardanoCIP30API {
  getNetworkId(): Promise<number>;                  // 0 = Testnet, 1 = Mainnet
  getUsedAddresses(): Promise<string[]>;            // CBOR hex
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;              // CBOR hex
  getRewardAddresses(): Promise<string[]>;
  getBalance(): Promise<string>;                    // CBOR hex (Lovelace)
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  signData(addr: string, payload: string): Promise<{ key: string; signature: string }>;
  submitTx(tx: string): Promise<string>;
}

interface Window {
  cardano?: {
    lace?:    CardanoCIP30;
    nami?:    CardanoCIP30;
    eternl?:  CardanoCIP30;
    flint?:   CardanoCIP30;
    [key: string]: CardanoCIP30 | undefined;
  };
}
