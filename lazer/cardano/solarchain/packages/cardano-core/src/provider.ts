import { readEnv } from "@packages/config";

export interface BlockfrostProviderConfig { network: "PreProd" | "Preview" | "Mainnet"; baseUrl: string; projectId: string; }

export function createBlockfrostProviderConfig(): BlockfrostProviderConfig { const env = readEnv(); return { network: env.CARDANO_NETWORK, baseUrl: env.BLOCKFROST_PREPROD_URL, projectId: env.BLOCKFROST_PROJECT_ID }; }
