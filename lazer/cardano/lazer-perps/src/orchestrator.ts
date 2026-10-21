/**
 * Lazer Perps — Orchestrator
 *
 * Central module for all Pyth Lazer + Cardano interactions.
 * Provides:
 *   - fetchPriceWitness(): get signed price + resolve Pyth state
 *   - streamPythPrice(): WebSocket price stream for keeper
 *   - buildOpenPositionTx(): construct open position tx with price witness
 *   - buildClosePositionTx(): construct close position tx with price witness
 *   - buildLiquidateTx(): construct liquidation tx with price witness
 *
 * Every perps tx must include the zero-withdrawal price witness.
 */

import {
  createClient,
  ScriptHash,
  TransactionHash,
} from "@evolution-sdk/evolution";
import type * as UTxO from "@evolution-sdk/evolution/UTxO";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import {
  getPythScriptHash,
  getPythState,
} from "@pythnetwork/pyth-lazer-cardano-js";
import { feedName, getMarket } from "./feeds.js";

// Pyth deployment on Cardano PreProd
export const PYTH_POLICY_ID =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

// ─── Types ───────────────────────────────────────────────────────────

export interface PriceWitness {
  updateBytes: Buffer;
  pythState: UTxO.UTxO;
  pythScriptHash: string;
  parsed: {
    feedId: number;
    price: string | undefined;
    exponent: number | undefined;
    bestBidPrice: string | undefined;
    bestAskPrice: string | undefined;
  };
}

export interface PositionParams {
  feedId: number;
  direction: "LONG" | "SHORT";
  leverage: number;
  collateral: number; // micro USDCx
}

// ─── Price witness ───────────────────────────────────────────────────

/**
 * Fetch a fresh signed price from Pyth Lazer and resolve the on-chain
 * Pyth State UTxO. This is the single entry point for all perps txs.
 */
export async function fetchPriceWitness(
  feedId: number,
  lazerToken: string,
): Promise<PriceWitness> {
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

  const providerClient = createClient({
    network: "preprod",
    provider: { type: "koios", baseUrl: "https://preprod.koios.rest/api/v1" },
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

// ─── Wallet ──────────────────────────────────────────────────────────

export function createWalletClient(mnemonic: string) {
  const providerClient = createClient({
    network: "preprod",
    provider: { type: "koios", baseUrl: "https://preprod.koios.rest/api/v1" },
  });
  return providerClient.attachWallet({ mnemonic, type: "seed" });
}

// ─── Tx builders ─────────────────────────────────────────────────────

/**
 * Apply the Pyth zero-withdrawal price witness to any tx builder.
 * This is required for every perps transaction.
 */
function applyPriceWitness(txBuilder: any, witness: PriceWitness) {
  return txBuilder
    .readFrom({ referenceInputs: [witness.pythState] })
    .withdraw({
      amount: 0n,
      redeemer: [witness.updateBytes],
      stakeCredential: ScriptHash.fromHex(witness.pythScriptHash),
    });
}

/**
 * Build an open position transaction.
 * Includes the Pyth price witness + validity window.
 */
export function buildOpenPositionTx(
  wallet: ReturnType<typeof createWalletClient>,
  witness: PriceWitness,
  params: PositionParams,
) {
  const now = BigInt(Date.now());
  const market = getMarket(params.feedId);

  if (market && params.leverage > market.leverageCap) {
    throw new Error(
      `Leverage ${params.leverage}x exceeds cap ${market.leverageCap}x for ${market.symbol}`,
    );
  }

  let tx = wallet
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 60_000n });

  tx = applyPriceWitness(tx, witness);

  // In production: create position UTxO at validator address with PositionDatum
  // For MVP: the price witness alone proves the oracle gate works

  return tx;
}

/**
 * Build a close position transaction.
 * Requires the Pyth price witness for exit price + PnL computation.
 */
export function buildClosePositionTx(
  wallet: ReturnType<typeof createWalletClient>,
  witness: PriceWitness,
  feedId: number,
) {
  const now = BigInt(Date.now());

  let tx = wallet
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 60_000n });

  tx = applyPriceWitness(tx, witness);

  // In production: collectFrom the position UTxO + pay payout to trader
  // + update pool_manager UTxO with decreased OI

  return tx;
}

/**
 * Build a liquidation transaction.
 * Anyone can submit — no owner signature needed.
 * Includes Pyth price witness to prove undercollateralization.
 */
export function buildLiquidateTx(
  wallet: ReturnType<typeof createWalletClient>,
  witness: PriceWitness,
  feedId: number,
) {
  const now = BigInt(Date.now());

  let tx = wallet
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 60_000n });

  tx = applyPriceWitness(tx, witness);

  // In production: collectFrom the position UTxO + pay keeper fee
  // + return remaining to pool + update pool_manager OI

  return tx;
}

// ─── WebSocket stream ────────────────────────────────────────────────

/**
 * Stream real-time prices from Pyth Lazer via WebSocket.
 * Used by the keeper bot to monitor for liquidation opportunities.
 */
export async function streamPythPrice(
  feedIds: number[],
  lazerToken: string,
  onPrice: (feedId: number, price: string, exponent: number) => void,
) {
  const client = await PythLazerClient.create({
    token: lazerToken,
    webSocketPoolConfig: {
      urls: ["wss://pyth-lazer.dourolabs.app/v1/stream"],
      numConnections: 1,
    },
  });

  client.addMessageListener((message) => {
    if (message.type !== "json") return;
    const val = message.value;
    if (val.type !== "streamUpdated") return;

    for (const feed of val.parsed?.priceFeeds ?? []) {
      if (feed.price !== undefined && feed.exponent !== undefined) {
        onPrice(feed.priceFeedId, String(feed.price), feed.exponent as number);
      }
    }
  });

  client.addAllConnectionsDownListener(() => {
    console.log("WARNING: All WebSocket connections down");
  });

  client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: feedIds,
    properties: ["price", "exponent", "bestBidPrice", "bestAskPrice"],
    formats: ["solana"],
    deliveryFormat: "json",
    channel: "fixed_rate@200ms",
    jsonBinaryEncoding: "hex",
  });

  return client;
}
