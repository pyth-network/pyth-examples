import { describe, expect, it } from "vitest";
import {
  buildSnapshots,
  samplePolicy,
  sampleRoutes,
  sampleTreasury,
} from "@anaconda/core";
import {
  CardanoExecutionError,
  PolicyVaultSimulator,
  createCardanoConnector,
} from "../src/index.js";

const simulator = new PolicyVaultSimulator(
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6",
);

const witness = {
  pythPolicyId: "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6",
  pythStateReference: "pyth-state-ref",
  signedUpdateHex: "0xfeedbeef",
};

function expectCardanoError(action: () => void, expectedCode: string) {
  try {
    action();
    throw new Error(`Expected CardanoExecutionError(${expectedCode})`);
  } catch (error) {
    expect(error).toBeInstanceOf(CardanoExecutionError);
    expect((error as CardanoExecutionError).code).toBe(expectedCode);
  }
}

describe("cardano policy vault simulator", () => {
  it("authorizes a valid partial de-risk execution", () => {
    const result = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });

    expect(result.intent.stage).toBe("partial_derisk");
    expect(result.treasury.stage).toBe("partial_derisk");
    expect(result.tx.withdrawals).toHaveLength(1);
    expect(result.tx.referenceInputs).toEqual([witness.pythStateReference]);
    expect(result.tx.metadata.reason_hash).toBe(result.intent.reasonHash);
    expect(result.tx.validityEndUs).toBe(result.intent.expiryUs);
  });

  it("rejects stale snapshots", () => {
    expectCardanoError(
      () =>
        simulator.authorizeExecution({
          treasury: sampleTreasury,
          policy: samplePolicy,
          snapshots: buildSnapshots({
            ada: { feedUpdateTimestampUs: 1_000_000, observedAtUs: 1_000_000 },
          }),
          routes: sampleRoutes,
          nowUs: 500_000_000,
          keeperId: "keeper-1",
          witness,
        }),
      "STALE_FEED",
    );
  });

  it("rejects wide confidence intervals", () => {
    expectCardanoError(
      () =>
        simulator.authorizeExecution({
          treasury: sampleTreasury,
          policy: samplePolicy,
          snapshots: buildSnapshots({
            ada: { confidence: 0.04, exponent: 0, price: 1, emaPrice: 1 },
          }),
          routes: sampleRoutes,
          nowUs: 100_000_000,
          keeperId: "keeper-1",
          witness,
        }),
      "CONFIDENCE_GUARDRAIL",
    );
  });

  it("rejects execution during cooldown", () => {
    expectCardanoError(
      () =>
        simulator.authorizeExecution({
          treasury: {
            ...sampleTreasury,
            lastTransitionUs: 90_000_000,
          },
          policy: samplePolicy,
          snapshots: buildSnapshots(),
          routes: sampleRoutes,
          nowUs: 100_000_000,
          keeperId: "keeper-1",
          witness,
        }),
      "COOLDOWN_ACTIVE",
    );
  });

  it("rejects Pyth witness mismatches", () => {
    expectCardanoError(
      () =>
        simulator.authorizeExecution({
          treasury: sampleTreasury,
          policy: samplePolicy,
          snapshots: buildSnapshots(),
          routes: sampleRoutes,
          nowUs: 100_000_000,
          keeperId: "keeper-1",
          witness: {
            ...witness,
            pythPolicyId: "bad-policy-id",
          },
        }),
      "PYTH_POLICY_MISMATCH",
    );
  });

  it("rejects unauthorized keepers", () => {
    expectCardanoError(
      () =>
        simulator.authorizeExecution({
          treasury: sampleTreasury,
          policy: samplePolicy,
          snapshots: buildSnapshots(),
          routes: sampleRoutes,
          nowUs: 100_000_000,
          keeperId: "keeper-x",
          witness,
        }),
      "KEEPER_NOT_AUTHORIZED",
    );
  });

  it("rejects authorization while another intent is in flight", () => {
    expectCardanoError(
      () =>
        simulator.authorizeExecution({
          treasury: {
            ...sampleTreasury,
            currentIntentId: "intent-existing",
          },
          policy: samplePolicy,
          snapshots: buildSnapshots(),
          routes: sampleRoutes,
          nowUs: 100_000_000,
          keeperId: "keeper-1",
          witness,
        }),
      "INTENT_ALREADY_IN_FLIGHT",
    );
  });

  it("completes an authorized execution and updates treasury balances", () => {
    const authorization = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });
    const connector = createCardanoConnector(sampleRoutes);
    const simulated = connector.simulateRoute(
      authorization.intent,
      authorization.assessment.metrics.priceMap,
    );

    const completion = simulator.completeExecution({
      treasury: authorization.treasury,
      policy: samplePolicy,
      intent: authorization.intent,
      result: {
        intentId: authorization.intent.intentId,
        vaultId: sampleTreasury.vaultId,
        chainId: "cardano",
        sourceAssetId: simulated.sourceAssetId,
        destinationAssetId: simulated.destinationAssetId,
        soldAmount: simulated.soldAmount,
        boughtAmount: simulated.boughtAmount,
        averagePrice: simulated.averagePrice,
        txHash: "tx-good",
        executedAtUs: 100_001_000,
        routeId: simulated.routeId,
      },
    });

    expect(completion.treasury.currentIntentId).toBeUndefined();
    expect(
      completion.treasury.positions.find((position) => position.assetId === "ada")?.amount,
    ).toBeLessThan(10_000);
    expect(
      completion.treasury.positions.find((position) => position.assetId === "usdm")?.amount,
    ).toBeGreaterThan(1_500);
    expect(completion.tx.metadata.reason_hash).toBe(authorization.intent.reasonHash);
    expect(simulated.averagePrice).toBeCloseTo(
      simulated.boughtAmount / simulated.soldAmount,
      8,
    );
  });

  it("rejects executions that do not meet the minimum buy amount", () => {
    const authorization = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });

    expectCardanoError(
      () =>
        simulator.completeExecution({
          treasury: authorization.treasury,
          policy: samplePolicy,
          intent: authorization.intent,
          result: {
            intentId: authorization.intent.intentId,
            vaultId: sampleTreasury.vaultId,
            chainId: "cardano",
            sourceAssetId: authorization.intent.sourceAssetId,
            destinationAssetId: authorization.intent.destinationAssetId,
            soldAmount: authorization.intent.maxSellAmount,
            boughtAmount: authorization.intent.minBuyAmount - 10,
            averagePrice: 1,
            txHash: "tx-short",
            executedAtUs: 101_000_000,
            routeId: authorization.intent.routeId,
          },
        }),
      "MIN_BUY_NOT_MET",
    );
  });

  it("rejects unapproved route/asset pairs at completion time", () => {
    const authorized = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });

    expectCardanoError(
      () =>
        simulator.completeExecution({
          treasury: authorized.treasury,
          policy: samplePolicy,
          intent: authorized.intent,
          result: {
            intentId: authorized.intent.intentId,
            vaultId: sampleTreasury.vaultId,
            chainId: "cardano",
            sourceAssetId: "ada",
            destinationAssetId: "evil",
            soldAmount: authorized.intent.maxSellAmount,
            boughtAmount: authorized.intent.minBuyAmount + 1,
            averagePrice: 1,
            txHash: "tx-bad",
            executedAtUs: 101_000_000,
            routeId: authorized.intent.routeId,
          },
        }),
      "ASSET_NOT_APPROVED",
    );
  });

  it("rejects route mismatches even when the route is approved", () => {
    const authorized = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });

    expectCardanoError(
      () =>
        simulator.completeExecution({
          treasury: authorized.treasury,
          policy: samplePolicy,
          intent: authorized.intent,
          result: {
            intentId: authorized.intent.intentId,
            vaultId: sampleTreasury.vaultId,
            chainId: "cardano",
            sourceAssetId: authorized.intent.sourceAssetId,
            destinationAssetId: authorized.intent.destinationAssetId,
            soldAmount: authorized.intent.maxSellAmount,
            boughtAmount: authorized.intent.minBuyAmount + 1,
            averagePrice: 1,
            txHash: "tx-other-route",
            executedAtUs: 101_000_000,
            routeId: "cardano-minswap-usdm-ada",
          },
        }),
      "ROUTE_MISMATCH",
    );
  });

  it("rejects executions outside the intent window", () => {
    const authorized = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });

    expectCardanoError(
      () =>
        simulator.completeExecution({
          treasury: authorized.treasury,
          policy: samplePolicy,
          intent: authorized.intent,
          result: {
            intentId: authorized.intent.intentId,
            vaultId: sampleTreasury.vaultId,
            chainId: "cardano",
            sourceAssetId: authorized.intent.sourceAssetId,
            destinationAssetId: authorized.intent.destinationAssetId,
            soldAmount: authorized.intent.maxSellAmount,
            boughtAmount: authorized.intent.minBuyAmount + 1,
            averagePrice: 1,
            txHash: "tx-late",
            executedAtUs: authorized.intent.expiryUs + 1,
            routeId: authorized.intent.routeId,
          },
        }),
      "RESULT_OUT_OF_WINDOW",
    );
  });

  it("rejects cross-vault or cross-chain execution results", () => {
    const authorized = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });

    expectCardanoError(
      () =>
        simulator.completeExecution({
          treasury: authorized.treasury,
          policy: samplePolicy,
          intent: authorized.intent,
          result: {
            intentId: authorized.intent.intentId,
            vaultId: "vault-elsewhere",
            chainId: "evm",
            sourceAssetId: authorized.intent.sourceAssetId,
            destinationAssetId: authorized.intent.destinationAssetId,
            soldAmount: authorized.intent.maxSellAmount,
            boughtAmount: authorized.intent.minBuyAmount + 1,
            averagePrice: 1,
            txHash: "tx-wrong-domain",
            executedAtUs: 101_000_000,
            routeId: authorized.intent.routeId,
          },
        }),
      "RESULT_VAULT_MISMATCH",
    );
  });

  it("rejects results that sell more than the authorized intent", () => {
    const authorized = simulator.authorizeExecution({
      treasury: sampleTreasury,
      policy: samplePolicy,
      snapshots: buildSnapshots(),
      routes: sampleRoutes,
      nowUs: 100_000_000,
      keeperId: "keeper-1",
      witness,
    });

    expectCardanoError(
      () =>
        simulator.completeExecution({
          treasury: authorized.treasury,
          policy: samplePolicy,
          intent: authorized.intent,
          result: {
            intentId: authorized.intent.intentId,
            vaultId: sampleTreasury.vaultId,
            chainId: "cardano",
            sourceAssetId: authorized.intent.sourceAssetId,
            destinationAssetId: authorized.intent.destinationAssetId,
            soldAmount: authorized.intent.maxSellAmount + 1,
            boughtAmount: authorized.intent.minBuyAmount + 1,
            averagePrice: 1,
            txHash: "tx-oversold",
            executedAtUs: 101_000_000,
            routeId: authorized.intent.routeId,
          },
        }),
      "MAX_SELL_EXCEEDED",
    );
  });
});
