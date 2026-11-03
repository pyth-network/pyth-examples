import type {
  PriceUpdate,
  ActionDecision,
  TxBuildResult,
  WalletInfo,
  OracleDatum,
  DecisionConfig,
  ServiceStatus,
} from "@/types";
import { decide, buildDatumFromConfig } from "./price";

export interface PipelineApiClient {
  getPrice(): Promise<PriceUpdate>;
  decide(
    price: PriceUpdate,
    config: DecisionConfig,
  ): Promise<ActionDecision>;
  buildLockTx(
    datum: OracleDatum,
    dryRun: boolean,
    mnemonic: string[],
    lovelace?: number,
  ): Promise<TxBuildResult>;
  buildSpendTx(
    datum: OracleDatum,
    dryRun: boolean,
    mnemonic: string[],
    maxAgeSeconds?: number,
  ): Promise<TxBuildResult>;
  getWalletBalance(address: string): Promise<{ balanceLovelace?: string; scriptAddress: string; network: string; configured: boolean }>;
  getStatus(): Promise<ServiceStatus>;
}

async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ||
        `HTTP ${res.status}: ${res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

export const realApiClient: PipelineApiClient = {
  getPrice: () => fetchJson("/api/price"),

  decide: async (price, config) => {
    const datum = buildDatumFromConfig(config);
    return decide(
      Number(price.priceUsdCents),
      price.timestamp,
      datum,
      config.maxAgeSeconds,
    );
  },

  buildLockTx: (datum, dryRun, mnemonic, lovelace) =>
    fetchJson("/api/tx/lock", {
      method: "POST",
      body: JSON.stringify({ datum, dryRun, mnemonic, lovelace }),
    }),

  buildSpendTx: (datum, dryRun, mnemonic, maxAgeSeconds) =>
    fetchJson("/api/tx/spend", {
      method: "POST",
      body: JSON.stringify({ datum, dryRun, mnemonic, maxAgeSeconds }),
    }),

  getWalletBalance: (address) =>
    fetchJson("/api/wallet", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),

  getStatus: () => fetchJson("/api/status"),
};
