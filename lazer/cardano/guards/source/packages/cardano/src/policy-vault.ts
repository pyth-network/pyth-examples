import {
  baseCapabilities,
  evaluateRiskLadder,
  type ExecutionIntent,
  type ExecutionResult,
  type PolicyConfig,
  type RouteSpec,
  type TreasuryState,
} from "@anaconda/core";
import type {
  AuthorizeExecutionParams,
  AuthorizeExecutionResult,
  CardanoPolicyVaultArtifact,
  CardanoTxEnvelope,
  CompleteExecutionParams,
  CompleteExecutionResult,
} from "./types.js";

export class CardanoExecutionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const policyVaultArtifact: CardanoPolicyVaultArtifact = {
  name: "PolicyVault",
  datumFields: [
    "vault_id",
    "stage",
    "last_transition_us",
    "governance_signers",
    "keepers",
    "approved_route_ids",
    "stable_asset_id",
    "primary_asset_id",
    "current_intent_id",
  ],
  redeemers: [
    "AuthorizeExecution",
    "CompleteExecution",
    "UpdatePolicy",
    "Resume",
    "EmergencyWithdraw",
  ],
  invariants: [
    "Pyth witness must be present in the same transaction for authorize execution",
    "Only approved keepers can authorize automatic execution",
    "Only approved routes and assets can be used by execution results",
    "Cooldown and guardrails are enforced before stage transitions",
  ],
};

function buildTxEnvelope(
  kind: CardanoTxEnvelope["kind"],
  reasonHash: string,
  startUs: number,
  validityEndUs: number,
  referenceInputs: string[],
  withdrawals: CardanoTxEnvelope["withdrawals"],
  spendingTargets: string[],
  metadata: Record<string, string> = {},
): CardanoTxEnvelope {
  return {
    kind,
    validityStartUs: startUs,
    validityEndUs,
    referenceInputs,
    withdrawals,
    spendingTargets,
    metadata: {
      reason_hash: reasonHash,
      tx_kind: kind,
      ...metadata,
    },
  };
}

function deriveValidityEndUs(
  startUs: number,
  expiryUs: number,
  maxValidityDurationUs: number,
): number {
  return Math.max(startUs, Math.min(expiryUs, startUs + maxValidityDurationUs));
}

function updatePositionAmount(
  treasury: TreasuryState,
  assetId: string,
  delta: number,
): TreasuryState["positions"] {
  let touched = false;
  const positions = treasury.positions.map((position) => {
    if (position.assetId !== assetId) {
      return position;
    }

    touched = true;
    const nextAmount = Number((position.amount + delta).toFixed(8));
    if (nextAmount < -1e-9) {
      throw new CardanoExecutionError(
        "NEGATIVE_BALANCE",
        `Asset ${assetId} would go negative after execution`,
      );
    }

    return {
      ...position,
      amount: Math.max(0, nextAmount),
    };
  });

  if (!touched) {
    throw new CardanoExecutionError("ASSET_NOT_FOUND", `Asset ${assetId} is not in treasury`);
  }

  return positions;
}

export class PolicyVaultSimulator {
  readonly pythPolicyId: string;
  readonly capabilities = baseCapabilities.cardano;

  constructor(pythPolicyId: string) {
    this.pythPolicyId = pythPolicyId;
  }

  authorizeExecution(params: AuthorizeExecutionParams): AuthorizeExecutionResult {
    const { treasury, policy, snapshots, routes, nowUs, keeperId, witness } = params;

    if (treasury.currentIntentId) {
      throw new CardanoExecutionError(
        "INTENT_ALREADY_IN_FLIGHT",
        "Treasury already has an in-flight execution intent",
      );
    }

    if (!treasury.keepers.includes(keeperId)) {
      throw new CardanoExecutionError(
        "KEEPER_NOT_AUTHORIZED",
        `Keeper ${keeperId} is not allowed to authorize automatic execution`,
      );
    }

    if (witness.pythPolicyId !== this.pythPolicyId) {
      throw new CardanoExecutionError(
        "PYTH_POLICY_MISMATCH",
        "The provided Pyth witness does not match the configured Cardano deployment",
      );
    }

    const assessment = evaluateRiskLadder(treasury, policy, snapshots, routes, nowUs);
    if (assessment.shouldFreeze) {
      const reason = assessment.reasons[0];
      throw new CardanoExecutionError(
        reason?.code?.toUpperCase() ?? "FREEZE_REQUIRED",
        reason?.message ?? "Oracle guardrails require a freeze instead of execution",
      );
    }

    if (assessment.cooldownRemainingUs > 0) {
      throw new CardanoExecutionError(
        "COOLDOWN_ACTIVE",
        "Cooldown is still active for this vault",
      );
    }

    const intent = assessment.intent;
    if (!intent) {
      throw new CardanoExecutionError(
        "NO_EXECUTABLE_INTENT",
        "Current policy evaluation did not produce an automatic execution intent",
      );
    }

    if (!policy.approvedRouteIds.includes(intent.routeId)) {
      throw new CardanoExecutionError(
        "ROUTE_NOT_APPROVED",
        `Route ${intent.routeId} is not approved by governance`,
      );
    }

    if (
      intent.destinationAssetId !== policy.stableAssetId &&
      intent.destinationAssetId !== policy.primaryAssetId
    ) {
      throw new CardanoExecutionError(
        "ASSET_NOT_APPROVED",
        `Destination asset ${intent.destinationAssetId} is not approved`,
      );
    }

    const nextTreasury: TreasuryState = {
      ...treasury,
      stage: assessment.nextStage,
      lastTransitionUs: nowUs,
      currentIntentId: intent.intentId,
    };

    const tx = buildTxEnvelope(
      "authorize_execution",
      intent.reasonHash,
      nowUs,
      deriveValidityEndUs(nowUs, intent.expiryUs, policy.maxStaleUs),
      [witness.pythStateReference],
      [
        {
          policyId: witness.pythPolicyId,
          amount: 0,
          redeemer: witness.signedUpdateHex,
        },
      ],
      ["policy-vault-utxo"],
    );

    return {
      treasury: nextTreasury,
      assessment,
      intent,
      tx,
    };
  }

  completeExecution(params: CompleteExecutionParams): CompleteExecutionResult {
    const { treasury, policy, intent, result } = params;

    if (result.vaultId !== treasury.vaultId || result.vaultId !== intent.vaultId) {
      throw new CardanoExecutionError(
        "RESULT_VAULT_MISMATCH",
        "Execution result does not belong to this vault",
      );
    }

    if (result.chainId !== treasury.chainId || result.chainId !== intent.chainId) {
      throw new CardanoExecutionError(
        "RESULT_CHAIN_MISMATCH",
        "Execution result does not belong to this chain",
      );
    }

    if (treasury.currentIntentId !== intent.intentId) {
      throw new CardanoExecutionError(
        "INTENT_MISMATCH",
        "Treasury does not hold the provided execution intent",
      );
    }

    if (result.intentId !== intent.intentId) {
      throw new CardanoExecutionError(
        "RESULT_INTENT_MISMATCH",
        "Execution result does not match the current intent",
      );
    }

    if (!policy.approvedRouteIds.includes(result.routeId)) {
      throw new CardanoExecutionError(
        "ROUTE_NOT_APPROVED",
        `Route ${result.routeId} is not approved by governance`,
      );
    }

    if (result.routeId !== intent.routeId) {
      throw new CardanoExecutionError(
        "ROUTE_MISMATCH",
        "Execution result route does not match the authorized intent",
      );
    }

    if (
      result.sourceAssetId !== intent.sourceAssetId ||
      result.destinationAssetId !== intent.destinationAssetId
    ) {
      throw new CardanoExecutionError(
        "ASSET_NOT_APPROVED",
        "Execution result asset pair differs from the approved intent",
      );
    }

    if (result.executedAtUs < intent.createdAtUs || result.executedAtUs > intent.expiryUs) {
      throw new CardanoExecutionError(
        "RESULT_OUT_OF_WINDOW",
        "Execution result falls outside the authorized intent window",
      );
    }

    if (result.soldAmount - intent.maxSellAmount > 1e-8) {
      throw new CardanoExecutionError(
        "MAX_SELL_EXCEEDED",
        "Execution result sold more than the authorized intent",
      );
    }

    if (result.boughtAmount + 1e-8 < intent.minBuyAmount) {
      throw new CardanoExecutionError(
        "MIN_BUY_NOT_MET",
        "Execution result under-delivered against the minimum buy amount",
      );
    }

    let nextPositions = updatePositionAmount(treasury, result.sourceAssetId, -result.soldAmount);
    nextPositions = updatePositionAmount(
      { ...treasury, positions: nextPositions },
      result.destinationAssetId,
      result.boughtAmount,
    );

    const nextTreasury: TreasuryState = {
      ...treasury,
      positions: nextPositions,
      stage: intent.kind === "reentry_swap" ? "normal" : intent.stage,
      currentIntentId: undefined,
      lastTransitionUs: result.executedAtUs,
    };

    return {
      treasury: nextTreasury,
      tx: buildTxEnvelope(
        "complete_execution",
        intent.reasonHash,
        result.executedAtUs,
        deriveValidityEndUs(result.executedAtUs, intent.expiryUs, policy.maxStaleUs),
        [],
        [],
        ["policy-vault-utxo", "execution-hot-wallet"],
        {
          intent_id: intent.intentId,
          tx_hash: result.txHash,
        },
      ),
    };
  }
}

export function createCardanoConnector(routes: RouteSpec[]) {
  return {
    chainId: "cardano" as const,
    capabilities: baseCapabilities.cardano,
    describeExecutionConstraints() {
      return [
        "Cardano executes live in the MVP via a two-step authorize and swap flow.",
        "Only approved routes can consume the execution hot bucket.",
        "Oracle verification must be present in the same authorization transaction.",
      ];
    },
    simulateRoute(intent: ExecutionIntent, priceMap: Record<string, number>) {
      const route = routes.find((candidate) => candidate.routeId === intent.routeId);
      if (!route) {
        throw new CardanoExecutionError(
          "ROUTE_NOT_FOUND",
          `Missing route definition for ${intent.routeId}`,
        );
      }

      const sourcePrice = priceMap[intent.sourceAssetId];
      const destinationPrice = priceMap[intent.destinationAssetId];
      if (!sourcePrice || !destinationPrice) {
        throw new CardanoExecutionError(
          "PRICE_MAP_INCOMPLETE",
          "Price map is missing one or more assets for route simulation",
        );
      }

      const soldAmount = intent.maxSellAmount;
      const grossDestination = soldAmount * sourcePrice / destinationPrice;
      const boughtAmount = grossDestination * (1 - route.maxSlippageBps / 10_000);

      return {
        sourceAssetId: intent.sourceAssetId,
        destinationAssetId: intent.destinationAssetId,
        soldAmount: Number(soldAmount.toFixed(8)),
        boughtAmount: Number(boughtAmount.toFixed(8)),
        averagePrice: Number((boughtAmount / soldAmount).toFixed(8)),
        routeId: route.routeId,
      };
    },
  };
}
