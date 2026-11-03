# Cardano Wallet Integration
URL: /apis/wallets

Connect to browser wallets and create server-side wallets for Cardano dApp development.

***

title: "Cardano Wallet Integration"
description: "Connect to browser wallets and create server-side wallets for Cardano dApp development."
icon: WalletIcon
full: true
----------

import {linksWallets} from "@/data/links-wallets";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

## Overview

Mesh provides wallet classes for different use cases:

| Wallet Class                                            | Use Case                                      | Environment        |
| ------------------------------------------------------- | --------------------------------------------- | ------------------ |
| [CardanoBrowserWallet](/apis/wallets/browserwallet)     | Connect to user's wallet extension (CIP-30)   | Frontend (browser) |
| [MeshCardanoBrowserWallet](/apis/wallets/browserwallet) | Browser wallet with Mesh convenience methods  | Frontend (browser) |
| [CardanoHeadlessWallet](/apis/wallets/meshwallet)       | Programmatic wallet control (low-level)       | Backend (Node.js)  |
| [MeshCardanoHeadlessWallet](/apis/wallets/meshwallet)   | Headless wallet with Mesh convenience methods | Backend (Node.js)  |

## Quick Start

### Browser Wallet (Frontend)

Connect to CIP-30 compatible wallets like Eternl, Nami, and Lace:

```tsx
import { MeshCardanoBrowserWallet } from "@meshsdk/wallet";

// Get installed wallets
const wallets = MeshCardanoBrowserWallet.getInstalledWallets();

// Connect to a wallet
const wallet = await MeshCardanoBrowserWallet.enable("eternl");

// Get balance (Mesh format)
const balance = await wallet.getBalanceMesh();
console.log(`Balance: ${balance.find(a => a.unit === 'lovelace')?.quantity}`);

// Get address (Bech32 format)
const address = await wallet.getChangeAddressBech32();
```

### Headless Wallet (Backend)

Create wallets programmatically for server-side applications:

```tsx
import { MeshCardanoHeadlessWallet } from "@meshsdk/wallet";
import { BlockfrostProvider } from "@meshsdk/core";
import { AddressType } from "@meshsdk/wallet";

const provider = new BlockfrostProvider("<YOUR_API_KEY>");

// Create from mnemonic
const wallet = await MeshCardanoHeadlessWallet.fromMnemonic({
  networkId: 0, // 0 = testnet, 1 = mainnet
  walletAddressType: AddressType.Base,
  fetcher: provider,
  submitter: provider,
  mnemonic: ["your", "24", "word", "mnemonic", "phrase", "..."],
});

// Or create from Bip32 root key
const wallet = await MeshCardanoHeadlessWallet.fromBip32Root({
  networkId: 0,
  walletAddressType: AddressType.Base,
  fetcher: provider,
  submitter: provider,
  bech32: "xprv1...",
});
```

## Choosing a Wallet Class

**Use Browser Wallet classes when:**

* Building frontend dApps
* Users need to connect their own wallets
* Transactions require user approval
* Working with CIP-30 features

**Use Headless Wallet classes when:**

* Running backend services
* Automating transactions
* Managing treasury wallets
* Building bots or scripts

**Use Mesh variants (`MeshCardanoBrowserWallet`, `MeshCardanoHeadlessWallet`) when:**

* You want UTxOs, balances, and addresses in Mesh-compatible formats
* You prefer Bech32 addresses directly
* You need convenience methods like `signTxReturnFullTx()`

**Use base variants (`CardanoBrowserWallet`, `CardanoHeadlessWallet`) when:**

* You want raw CIP-30 compliant CBOR hex responses
* You need maximum compatibility with the CIP-30 standard

## Common Operations

Both wallet types share similar APIs implementing the `ICardanoWallet` interface:

```tsx
// Get UTXOs (CBOR hex format)
const utxos = await wallet.getUtxos();

// Get change address (hex format)
const address = await wallet.getChangeAddress();

// Sign transaction
const signedTx = await wallet.signTx(unsignedTx, partialSign);

// Submit transaction
const txHash = await wallet.submitTx(signedTx);

// Get balance (CBOR hex format)
const balance = await wallet.getBalance();
```

Mesh wallet variants add convenience methods:

```tsx
// Get UTXOs in Mesh format
const utxos = await wallet.getUtxosMesh();

// Get change address in Bech32
const address = await wallet.getChangeAddressBech32();

// Get balance as Asset array
const balance = await wallet.getBalanceMesh();

// Sign and return full transaction (with witnesses merged)
const signedTx = await wallet.signTxReturnFullTx(unsignedTx);
```

## React Integration

For React applications, use `@meshsdk/react` for built-in components and hooks:

```tsx
import { CardanoWallet, useWallet } from "@meshsdk/react";

function App() {
  const { connected, wallet } = useWallet();

  return (
    <div>
      <CardanoWallet />
      {connected && <p>Balance: {wallet.getLovelace()}</p>}
    </div>
  );
}
```

See [React Getting Started](/react/getting-started) for full integration details.

## Available Wallet APIs

<div className="grid md:grid-cols-2 gap-6 items-stretch">
  {linksWallets.map((card) => (
      <Link key={card.title} href={card.link} className="no-underline">
        <Card className="h-full text-center hover:border-primary/50 transition-colors px-4 py-8">
          <CardTitle className="font-heading">{card.title}</CardTitle>
          <CardDescription>{card.desc}</CardDescription>
        </Card>
      </Link>
    ))}
</div>

## Related

* [React Integration](/react/getting-started) - Wallet components and hooks
* [Transaction Builder](/apis/txbuilder/basics) - Build transactions to sign
* [Prove Wallet Ownership](/guides/prove-wallet-ownership) - Authenticate users with signatures
