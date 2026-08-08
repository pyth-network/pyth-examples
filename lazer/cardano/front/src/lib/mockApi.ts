import type { PipelineApiClient } from "./api";
import type {
  PriceUpdate,
  ActionDecision,
  TxBuildResult,
  OracleDatum,
  DecisionConfig,
  ServiceStatus,
} from "@/types";
import { randomAdaPrice, fakeTxHash, fakeWallet, delay } from "@/mock/data";
import { decide, buildDatumFromConfig } from "./price";
import { EXPLORER_URLS } from "./constants";

export const mockApiClient: PipelineApiClient = {
  async getPrice() {
    await delay(300 + Math.random() * 500);
    return randomAdaPrice();
  },

  async decide(
    price: PriceUpdate,
    config: DecisionConfig,
  ): Promise<ActionDecision> {
    await delay(200 + Math.random() * 200);
    const datum = buildDatumFromConfig(config);
    return decide(
      Number(price.priceUsdCents),
      price.timestamp,
      datum,
      config.maxAgeSeconds,
    );
  },

  async buildLockTx(
    datum: OracleDatum,
    dryRun: boolean,
    _mnemonic: string[],
    lovelace?: number,
  ): Promise<TxBuildResult> {
    await delay(500 + Math.random() * 500);
    const txHash = dryRun ? "(dry-run)" : fakeTxHash();
    const wallet = fakeWallet();
    return {
      txHash,
      kind: "lock",
      status: dryRun ? "dry-run" : "submitted",
      scriptAddress: wallet.scriptAddress,
      datum,
      lovelace: String(lovelace ?? 2_000_000),
      network: wallet.network,
      explorerUrl: dryRun
        ? undefined
        : `${EXPLORER_URLS.preprod}/${txHash}`,
    };
  },

  async buildSpendTx(
    datum: OracleDatum,
    dryRun: boolean,
    _mnemonic: string[],
  ): Promise<TxBuildResult> {
    await delay(500 + Math.random() * 500);
    const txHash = dryRun ? "(dry-run)" : fakeTxHash();
    const wallet = fakeWallet();
    return {
      txHash,
      kind: "spend",
      status: dryRun ? "dry-run" : "submitted",
      scriptAddress: wallet.scriptAddress,
      datum,
      network: wallet.network,
      explorerUrl: dryRun
        ? undefined
        : `${EXPLORER_URLS.preprod}/${txHash}`,
    };
  },

  async getWalletBalance(_address: string) {
    await delay(200);
    const w = fakeWallet();
    return {
      balanceLovelace: w.balanceLovelace,
      scriptAddress: w.scriptAddress,
      network: w.network,
      configured: true,
    };
  },

  async getStatus(): Promise<ServiceStatus> {
    await delay(100);
    return { pyth: true, blockfrost: true };
  },
};
