import type { UTxO } from "@evolution-sdk/evolution";
import type { ProviderOnlyClient } from "@evolution-sdk/evolution/sdk/client/Client";
export declare function getPythState(policyId: string, client: ProviderOnlyClient): Promise<UTxO.UTxO>;
/**
 * Returns the hex-encoded hash of the withdraw script currently stored in the
 * on-chain Pyth state for the given deployment.
 *
 * The withdraw script hash is read from the inline datum attached to the
 * State NFT UTxO identified by `policyId`.
 *
 * @param pythState - fetched Pyth State UTxO
 * @returns The withdraw script hash as a hex string.
 */
export declare function getPythScriptHash(pythState: UTxO.UTxO): string;
