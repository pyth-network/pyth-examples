import { readEnv } from "@packages/config";
import { createBlockfrostProviderConfig } from "./provider.js";

export interface LucidRuntimeConfig { network: "PreProd" | "Preview" | "Mainnet"; provider: ReturnType<typeof createBlockfrostProviderConfig>; mnemonicConfigured: boolean; }

export async function createLucidClientConfig(): Promise<LucidRuntimeConfig> { const env = readEnv(); return { network: env.CARDANO_NETWORK, provider: createBlockfrostProviderConfig(), mnemonicConfigured: Boolean(env.CARDANO_MNEMONIC) }; }

export async function getWalletAddress(): Promise<string> { throw new Error("Lucid runtime no está incluido en este paquete de demo. Agrega lucid-cardano en el entorno de despliegue antes de construir el flujo de firma real."); }
export async function getUtxos(): Promise<never> { throw new Error("Lucid runtime no está incluido en este paquete de demo. Agrega lucid-cardano en el entorno de despliegue antes de consultar UTxOs reales."); }
