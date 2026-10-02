/** biome-ignore-all lint/suspicious/noConsole: code example */
import type { ProviderOnlyClient } from "@evolution-sdk/evolution";
import type { NetworkId } from "@evolution-sdk/evolution/sdk/client/Client";
/** Cardano network identifier. */
export type Network = Exclude<NetworkId, number>;
/** Provider configuration for connecting to a Cardano node. */
export type Provider = {
    type: "blockfrost";
    projectId: string;
} | {
    type: "koios";
    token?: string;
} | {
    type: "maestro";
    apiKey: string;
};
/**
 * Create Cardano client using Evolution SDK.
 * @param network public network to use
 * @param provider API provider and token
 * @returns
 */
export declare function createEvolutionClient(network: Network, provider: Provider): ProviderOnlyClient;
