/**
 * Lazer Perps — Price Orchestrator
 *
 * Central module that handles all Pyth Lazer interactions:
 *   1. Fetches the latest signed price update for a given feed
 *   2. Resolves the on-chain Pyth State UTxO and withdraw script hash
 *   3. Provides a reusable "price witness" builder for any perps transaction
 *
 * Every perps action (open, close, liquidate) must go through the orchestrator
 * to embed a fresh Pyth price witness in the transaction.
 *
 * Usage:
 *   Imported by open_position.ts, close_position.ts, liquidate.ts, keeper.ts
 */

import {
  createClient,
  ScriptHash,
  type TransactionHash,
} from "@evolution-sdk/evolution";
import type * as UTxO from "@evolution-sdk/evolution/UTxO";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import {
  getPythScriptHash,
  getPythState,
} from "@pythnetwork/pyth-lazer-cardano-js";

// Pyth deployment on Cardano PreProd
export const PYTH_POLICY_ID =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

export interface PriceWitness {
  /** Raw signed bytes to include as withdraw redeemer */
  updateBytes: Buffer;
  /** Pyth State UTxO to include as reference input */
  pythState: UTxO.UTxO;
  /** Pyth withdraw script hash for the zero-withdrawal */
  pythScriptHash: string;
  /** Parsed price data from Pyth Lazer */
  parsed: {
    feedId: number;
    price: string | undefined;
    exponent: number | undefined;
    bestBidPrice: string | undefined;
    bestAskPrice: string | undefined;
  };
}

/**
 * Fetch a fresh price witness from Pyth Lazer and resolve the on-chain state.
 * This is the single entry point for all perps transactions.
 */
export async function fetchPriceWitness(
  feedId: number,
  lazerToken: string,
): Promise<PriceWitness> {
  // Fetch latest signed price from Pyth Lazer
  const lazer = await PythLazerClient.create({ token: lazerToken });
  const latestPrice = await lazer.getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: [feedId],
    properties: ["price", "bestBidPrice", "bestAskPrice", "exponent"],
  });

  if (!latestPrice.solana?.data) {
    throw new Error("No update payload from Pyth Lazer");
  }

  const updateBytes = Buffer.from(latestPrice.solana.data, "hex");
  const feedData = latestPrice.parsed?.priceFeeds?.[0];

  // Resolve Pyth State on-chain
  const providerClient = createClient({
    network: "preprod",
    provider: {
      type: "koios",
      baseUrl: "https://preprod.koios.rest/api/v1",
    },
  });

  const pythState = await getPythState(PYTH_POLICY_ID, providerClient);
  const pythScriptHash = getPythScriptHash(pythState);

  return {
    updateBytes,
    pythState,
    pythScriptHash,
    parsed: {
      feedId: feedData?.priceFeedId ?? feedId,
      price: feedData?.price as string | undefined,
      exponent: feedData?.exponent as number | undefined,
      bestBidPrice: feedData?.bestBidPrice as string | undefined,
      bestAskPrice: feedData?.bestAskPrice as string | undefined,
    },
  };
}

/**
 * Create a Cardano client connected to PreProd with a signing wallet.
 */
export function createWalletClient(mnemonic: string) {
  const providerClient = createClient({
    network: "preprod",
    provider: {
      type: "koios",
      baseUrl: "https://preprod.koios.rest/api/v1",
    },
  });

  return providerClient.attachWallet({ mnemonic, type: "seed" });
}

/**
 * Apply the Pyth price witness to a transaction builder.
 * This adds the zero-withdrawal pattern that every perps tx needs.
 */
export function applyPriceWitness(
  txBuilder: any,
  witness: PriceWitness,
) {
  return txBuilder
    .readFrom({ referenceInputs: [witness.pythState] })
    .withdraw({
      amount: 0n,
      redeemer: [witness.updateBytes],
      stakeCredential: ScriptHash.fromHex(witness.pythScriptHash),
    });
}
