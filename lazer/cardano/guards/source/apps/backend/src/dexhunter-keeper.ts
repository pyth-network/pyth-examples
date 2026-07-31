import { randomUUID } from "node:crypto";
import type { PolicyConfig, RouteSpec, TreasuryState } from "@anaconda/core";
import {
  CardanoExecutionError,
  PolicyVaultSimulator,
  type CardanoPythWitness,
} from "@anaconda/cardano";
import { AuditStore } from "./storage.js";
import {
  DexHunterLiveAdapter,
  DexHunterLiveError,
  type CardanoHotWallet,
} from "./dexhunter-live.js";

export interface LiveTickInput {
  treasury: TreasuryState;
  policy: PolicyConfig;
  routes: RouteSpec[];
  snapshots: ReturnType<import("./collector.js").PythCollector["current"]>;
  nowUs: number;
  keeperId: string;
  witness: CardanoPythWitness;
  wallet: CardanoHotWallet;
  assetTokenIds: Record<string, string>;
  blacklistedDexes?: string[];
}

export interface LiveTickResult {
  treasury: TreasuryState;
  intentId?: string;
  txHash?: string;
  stage: TreasuryState["stage"];
  rejected?: string;
}

export class CardanoDexHunterKeeperService {
  private readonly simulator: PolicyVaultSimulator;
  private readonly adapter: DexHunterLiveAdapter;

  constructor(
    pythPolicyId: string,
    private readonly auditStore: AuditStore,
    adapter = new DexHunterLiveAdapter(),
  ) {
    this.simulator = new PolicyVaultSimulator(pythPolicyId);
    this.adapter = adapter;
  }

  async tick(input: LiveTickInput): Promise<LiveTickResult> {
    try {
      const authorization = this.simulator.authorizeExecution({
        treasury: input.treasury,
        policy: input.policy,
        snapshots: input.snapshots,
        routes: input.routes,
        nowUs: input.nowUs,
        keeperId: input.keeperId,
        witness: input.witness,
      });

      this.auditStore.recordIntent(authorization.intent);
      this.auditStore.recordEvent({
        eventId: `intent:${authorization.intent.intentId}`,
        category: "intent",
        payload: {
          stage: authorization.intent.stage,
          kind: authorization.intent.kind,
          reasonHash: authorization.intent.reasonHash,
        },
        createdAtUs: authorization.intent.createdAtUs,
      });

      const execution = await this.adapter.executeIntent({
        intent: authorization.intent,
        routes: input.routes,
        wallet: input.wallet,
        assetTokenIds: input.assetTokenIds,
        nowUs: input.nowUs + 1_000,
        ...(input.blacklistedDexes
          ? { blacklistedDexes: input.blacklistedDexes }
          : {}),
      });

      const completion = this.simulator.completeExecution({
        treasury: authorization.treasury,
        policy: input.policy,
        intent: authorization.intent,
        result: execution.result,
      });

      this.auditStore.recordExecution(execution.result);
      this.auditStore.recordEvent({
        eventId: `execution:${execution.result.txHash}`,
        category: "execution",
        payload: {
          intentId: execution.result.intentId,
          txHash: execution.result.txHash,
          soldAmount: execution.result.soldAmount,
          boughtAmount: execution.result.boughtAmount,
          stage: completion.treasury.stage,
          venueFeeAmount: execution.revenueBreakdown.venueFeeAmount,
          protocolFeeAmount: execution.revenueBreakdown.protocolFeeAmount,
          totalFeeBps: execution.revenueBreakdown.totalFeeBps,
        },
        createdAtUs: execution.result.executedAtUs,
      });

      return {
        treasury: completion.treasury,
        intentId: authorization.intent.intentId,
        txHash: execution.result.txHash,
        stage: completion.treasury.stage,
      };
    } catch (error) {
      const code =
        error instanceof CardanoExecutionError || error instanceof DexHunterLiveError
          ? error.code
          : "UNKNOWN_ERROR";
      this.auditStore.recordEvent({
        eventId: `rejection:${randomUUID()}`,
        category: "rejection",
        payload: {
          code,
          keeperId: input.keeperId,
        },
        createdAtUs: input.nowUs,
      });

      return {
        treasury: input.treasury,
        stage: input.treasury.stage,
        rejected: code,
      };
    }
  }
}
