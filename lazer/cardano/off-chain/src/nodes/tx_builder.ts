import {
  BlockfrostProvider,
  MeshWallet,
  Transaction,
  PlutusScript,
  resolveScriptHash,
  applyCborEncoding,
} from "@meshsdk/core";
import {
  BLOCKFROST_API_KEY,
  BLOCKFROST_URL,
  NETWORK,
  VALIDATOR_SCRIPT_HASH,
  WALLET_MNEMONIC,
} from "../config";
import type { OracleDatum, PriceUpdate, SpendParams } from "../types/index";

// ──────────────────────────────────────────────
// Providers & wallet (lazy-initialised)
// ──────────────────────────────────────────────

let _provider: BlockfrostProvider | null = null;
let _wallet: MeshWallet | null = null;

function getProvider(): BlockfrostProvider {
  if (!_provider) {
    _provider = new BlockfrostProvider(BLOCKFROST_URL, BLOCKFROST_API_KEY);
  }
  return _provider;
}

export async function getWallet(): Promise<MeshWallet> {
  if (!_wallet) {
    _wallet = new MeshWallet({
      networkId: NETWORK === "mainnet" ? 1 : 0,
      fetcher: getProvider(),
      submitter: getProvider(),
      key: {
        type: "mnemonic",
        words: WALLET_MNEMONIC.split(" "),
      },
    });
  }
  return _wallet;
}

// ──────────────────────────────────────────────
// Datum helpers (Aiken constructor indices)
// ──────────────────────────────────────────────

function encodeDatum(datum: OracleDatum): object {
  switch (datum.kind) {
    case "AnyPrice":
      return { alternative: 0, fields: [] };
    case "MinPrice":
      return { alternative: 1, fields: [datum.minPriceUsdCents.toString()] };
    case "MaxPrice":
      return { alternative: 2, fields: [datum.maxPriceUsdCents.toString()] };
    case "PriceRange":
      return {
        alternative: 3,
        fields: [datum.loCents.toString(), datum.hiCents.toString()],
      };
  }
}

// ──────────────────────────────────────────────
// Lock UTxO (create oracle datum on-chain)
// ──────────────────────────────────────────────

export async function lockOracleUtxo(datum: OracleDatum, lovelace = 2_000_000n): Promise<string> {
  const wallet = await getWallet();
  const address = await wallet.getChangeAddress();

  const script: PlutusScript = {
    version: "V3",
    code: applyCborEncoding(VALIDATOR_SCRIPT_HASH),
  };
  const scriptAddress = resolveScriptHash(script.code, "V3");

  const tx = new Transaction({ initiator: wallet }).sendLovelace(
    { address: scriptAddress, datum: { value: encodeDatum(datum), inline: true } },
    lovelace.toString(),
  );

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`[tx_builder] Locked oracle UTxO: ${txHash}`);
  return txHash;
}

// ──────────────────────────────────────────────
// Spend UTxO (provide Pyth payload as redeemer)
// ──────────────────────────────────────────────

export async function spendOracleUtxo(params: SpendParams): Promise<string> {
  const { datum, priceUpdate } = params;
  const wallet = await getWallet();

  const script: PlutusScript = {
    version: "V3",
    code: applyCborEncoding(VALIDATOR_SCRIPT_HASH),
  };
  const scriptAddress = resolveScriptHash(script.code, "V3");

  const utxos = await getProvider().fetchAddressUTxOs(scriptAddress);
  if (utxos.length === 0) throw new Error("No UTxOs at oracle script address");

  // Encode raw Pyth payload as hex for the redeemer ByteArray
  const redeemerHex = Buffer.from(priceUpdate.payload).toString("hex");

  const tx = new Transaction({ initiator: wallet })
    .redeemValue({
      value: utxos[0],
      script,
      datum: encodeDatum(datum),
      redeemer: { data: { alternative: 0, fields: [redeemerHex] } },
    })
    .setTimeToExpire(Math.floor((Date.now() + 60_000) / 1000)); // validity window

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`[tx_builder] Spent oracle UTxO: ${txHash}`);
  return txHash;
}
