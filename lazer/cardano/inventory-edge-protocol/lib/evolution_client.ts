import { createClient } from "@evolution-sdk/evolution";

/** Blockfrost: evaluación de scripts vía `/utils/txs/evaluate/utxos` (más estable que Koios → ogmios). */
const BLOCKFROST_PREPROD = "https://cardano-preprod.blockfrost.io/api/v0";
/** Maestro Preprod (misma familia de API que usa Lucid con `Maestro({ network: "Preprod" })`). */
const MAESTRO_PREPROD = "https://preprod.gomaestro-api.org/v1";
const KOIOS_PREPROD = "https://preprod.koios.rest/api/v1";

export type PreprodChainBackend = "blockfrost" | "maestro" | "koios";

/**
 * Misma prioridad que Lucid (`withLucidPreprod`): Blockfrost → Maestro → Koios.
 * Koios depende de `/ogmios` en el servidor; sin token o con carga, suele fallar en evaluateTx.
 */
export function preprodEvolutionProviderConfig():
  | { type: "blockfrost"; baseUrl: string; projectId: string }
  | { type: "maestro"; baseUrl: string; apiKey: string }
  | { type: "koios"; baseUrl: string; token?: string } {
  const bf = process.env.BLOCKFROST_PROJECT_ID?.trim();
  if (bf) {
    return { type: "blockfrost", baseUrl: BLOCKFROST_PREPROD, projectId: bf };
  }
  const maestro = process.env.MAESTRO_API_KEY?.trim();
  if (maestro) {
    return { type: "maestro", baseUrl: MAESTRO_PREPROD, apiKey: maestro };
  }
  const koiosToken =
    process.env.KOIOS_TOKEN?.trim() || process.env.KOIOS_API_TOKEN?.trim();
  return { type: "koios", baseUrl: KOIOS_PREPROD, token: koiosToken || undefined };
}

export function preprodChainBackendLabel(): PreprodChainBackend {
  const c = preprodEvolutionProviderConfig();
  return c.type;
}

export function createPreprodSigningClient(mnemonic: string) {
  return createClient({
    network: "preprod",
    provider: preprodEvolutionProviderConfig(),
  }).attachWallet({ mnemonic, type: "seed" });
}

export function createPreprodReadClient() {
  return createClient({
    network: "preprod",
    provider: preprodEvolutionProviderConfig(),
  });
}
