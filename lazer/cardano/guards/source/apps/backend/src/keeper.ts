import { randomUUID } from "node:crypto";
import {
  type ExecutionResult,
  type PolicyConfig,
  type RouteSpec,
  type TreasuryState,
} from "@anaconda/core";
import {
  CardanoExecutionError,
  PolicyVaultSimulator,
  createCardanoConnector,
  type CardanoPythWitness,
} from "@anaconda/cardano";
import { AuditStore } from "./storage.js";

export interface TickInput {
  treasury: TreasuryState;
  policy: PolicyConfig;
  routes: RouteSpec[];
  snapshots: ReturnType<import("./collector.js").PythCollector["current"]>;
  nowUs: number;
  keeperId: string;
  witness: CardanoPythWitness;
}

export interface TickResult {
  treasury: TreasuryState;
  intentId?: string;
  txHash?: string;
  stage: TreasuryState["stage"];
  rejected?: string;
}

export class CardanoKeeperService {
  private readonly simulator: PolicyVaultSimulator;

  constructor(
    pythPolicyId: string,
    private readonly auditStore: AuditStore,
  ) {
    this.simulator = new PolicyVaultSimulator(pythPolicyId);
  }

  tick(input: TickInput): TickResult {
    const connector = createCardanoConnector(input.routes);

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

      const simulated = connector.simulateRoute(
        authorization.intent,
        authorization.assessment.metrics.priceMap,
      );
      const result: ExecutionResult = {
        intentId: authorization.intent.intentId,
        vaultId: authorization.intent.vaultId,
        chainId: "cardano",
        sourceAssetId: simulated.sourceAssetId,
        destinationAssetId: simulated.destinationAssetId,
        soldAmount: simulated.soldAmount,
        boughtAmount: simulated.boughtAmount,
        averagePrice: simulated.averagePrice,
        txHash: `tx-${randomUUID()}`,
        executedAtUs: input.nowUs + 1_000,
        routeId: simulated.routeId,
      };

      const completion = this.simulator.completeExecution({
        treasury: authorization.treasury,
        policy: input.policy,
        intent: authorization.intent,
        result,
      });

      this.auditStore.recordExecution(result);
      this.auditStore.recordEvent({
        eventId: `execution:${result.txHash}`,
        category: "execution",
        payload: {
          intentId: result.intentId,
          txHash: result.txHash,
          soldAmount: result.soldAmount,
          boughtAmount: result.boughtAmount,
          stage: completion.treasury.stage,
        },
        createdAtUs: result.executedAtUs,
      });

      return {
        treasury: completion.treasury,
        intentId: authorization.intent.intentId,
        txHash: result.txHash,
        stage: completion.treasury.stage,
      };
    } catch (error) {
      const message =
        error instanceof CardanoExecutionError ? error.code : "UNKNOWN_ERROR";
      this.auditStore.recordEvent({
        eventId: `rejection:${randomUUID()}`,
        category: "rejection",
        payload: {
          code: message,
          keeperId: input.keeperId,
        },
        createdAtUs: input.nowUs,
      });

      return {
        treasury: input.treasury,
        stage: input.treasury.stage,
        rejected: message,
      };
    }
  }
}
