/**
 * Evolution SDK client setup for Factura Ya on PreProd.
 *
 * Uses Koios as the free provider (no API key needed).
 */

import { createClient } from "@evolution-sdk/evolution/sdk/client/ClientImpl";
import type {
  ProviderOnlyClient,
  SigningClient,
} from "@evolution-sdk/evolution/sdk/client/Client";

const KOIOS_PREPROD_URL = "https://preprod.koios.rest/api/v1";

/**
 * Create a read-only client for querying PreProd (no wallet).
 */
export function createProviderClient(): ProviderOnlyClient {
  return createClient({
    network: "preprod",
    provider: {
      type: "koios",
      baseUrl: KOIOS_PREPROD_URL,
    },
  });
}

/**
 * Create a signing client with a CIP-30 wallet API.
 *
 * @param walletApi - The CIP-30 wallet API object from window.cardano[x].enable()
 */
export function createSigningClient(walletApi: unknown): SigningClient {
  return createClient({
    network: "preprod",
    provider: {
      type: "koios",
      baseUrl: KOIOS_PREPROD_URL,
    },
    wallet: {
      type: "api",
      api: walletApi as any,
    },
  });
}
