import { type LucidEvolution, type Network, type UTxO } from "@lucid-evolution/lucid";
export interface PythContext {
    stateUtxo: UTxO;
    withdrawScriptHash: string;
    rewardAddress: string;
}
/**
 * Fetches the Pyth State UTxO and extracts the withdraw script hash.
 */
export declare function getPythContext(lucid: LucidEvolution, pythPolicyId: string, network: Network): Promise<PythContext>;
/**
 * Fetches the latest ADA/USD price update from Pyth Lazer in solana/cardano format.
 * Connects via WebSocket, subscribes to the feed, waits for one update, then disconnects.
 * Returns the raw update bytes as hex string.
 */
export declare function fetchPriceUpdate(lazerToken: string): Promise<string>;
/**
 * Builds the withdrawal redeemer containing the price update bytes.
 * The redeemer is a List<ByteArray> encoded as PlutusData.
 */
export declare function buildWithdrawRedeemer(priceUpdateHex: string): string;
