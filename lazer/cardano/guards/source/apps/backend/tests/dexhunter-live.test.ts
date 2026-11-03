import { describe, expect, it, vi } from "vitest";
import { PolicyVaultSimulator } from "@anaconda/cardano";
import { buildDemoScenario, sampleWitness } from "../src/fixtures.js";
import {
  DexHunterLiveAdapter,
  DexHunterLiveError,
  type CardanoHotWallet,
} from "../src/dexhunter-live.js";
import { CardanoDexHunterKeeperService } from "../src/dexhunter-keeper.js";
import { AuditStore } from "../src/storage.js";
import { buildCardanoSwapVenueConfig } from "../src/swap-venue.js";

function createMockWallet(): CardanoHotWallet {
  return {
    address: "addr_test_hot_1",
    signTx: vi.fn(async () => "witness-set"),
    submitTx: vi.fn(async () => "tx-live-123"),
  };
}

function createFetchMock() {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = input.toString();
    const body = JSON.parse((init?.body as string | undefined) ?? "{}");

    if (url.endsWith("/swap/estimate")) {
      return new Response(
        JSON.stringify({
          total_output: 5100,
          total_output_without_slippage: 5150,
          possible_routes: [{ dex: "MINSWAPV2", amount_in: body.amount_in, expected_output: 5100 }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.endsWith("/swap/build")) {
      return new Response(
        JSON.stringify({
          cbor: "cbor-build-123",
          total_input: body.amount_in,
          total_output: 5100,
          splits: [{ dex: "MINSWAPV2", amount_in: body.amount_in, expected_output: 5100 }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.endsWith("/swap/sign")) {
      return new Response(
        JSON.stringify({ cbor: "cbor-signed-123" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("not found", { status: 404 });
  });
}

function createAdapter(fetchMock: typeof fetch) {
  return new DexHunterLiveAdapter(fetchMock, {
    venueConfig: buildCardanoSwapVenueConfig({
      provider: "dexhunter",
      protocolFeeBps: 30,
      dexHunterBaseUrl: "https://api-us.dexhunterv3.app",
      dexHunterPartnerId: "partner-live-test",
      dexHunterPartnerFeePercent: 0.3,
      minswapAggregatorUrl: "https://agg-api.minswap.org/aggregator",
      minswapPartnerCode: "guards-one",
    }),
    maxTotalFeeBps: 100,
    protocolFeeMode: "explicit_output",
  });
}

describe("dexhunter live adapter", () => {
  it("executes an authorized intent through estimate/build/sign/submit", async () => {
    const scenario = buildDemoScenario();
    const authorization = new PolicyVaultSimulator(sampleWitness.pythPolicyId).authorizeExecution({
      treasury: scenario.treasury,
      policy: scenario.policy,
      snapshots: scenario.snapshots,
      routes: scenario.routes,
      nowUs: 200_000_000,
      keeperId: "keeper-1",
      witness: sampleWitness,
    });
    const fetchMock = createFetchMock();
    const wallet = createMockWallet();
    const adapter = createAdapter(fetchMock as typeof fetch);

    const outcome = await adapter.executeIntent({
      intent: authorization.intent,
      routes: scenario.routes,
      wallet,
      assetTokenIds: { usdm: "usdm-token-id" },
      nowUs: 200_001_000,
    });

    expect(outcome.result.txHash).toBe("tx-live-123");
    expect(outcome.result.soldAmount).toBe(authorization.intent.maxSellAmount);
    expect(outcome.result.boughtAmount).toBe(5100);
    expect(outcome.revenueBreakdown.totalFeeBps).toBeGreaterThanOrEqual(30);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects a quote below the minimum buy amount", async () => {
    const scenario = buildDemoScenario();
    const authorization = new PolicyVaultSimulator(sampleWitness.pythPolicyId).authorizeExecution({
      treasury: scenario.treasury,
      policy: scenario.policy,
      snapshots: scenario.snapshots,
      routes: scenario.routes,
      nowUs: 200_000_000,
      keeperId: "keeper-1",
      witness: sampleWitness,
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total_output: 1,
          total_output_without_slippage: 1,
          possible_routes: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const wallet = createMockWallet();
    const adapter = createAdapter(fetchMock as typeof fetch);

    await expect(
      adapter.executeIntent({
        intent: authorization.intent,
        routes: scenario.routes,
        wallet,
        assetTokenIds: { usdm: "usdm-token-id" },
        nowUs: 200_001_000,
      }),
    ).rejects.toMatchObject({ code: "QUOTE_BELOW_MIN_BUY" } satisfies Partial<DexHunterLiveError>);
  });

  it("rejects execution when the intent has expired", async () => {
    const scenario = buildDemoScenario();
    const authorization = new PolicyVaultSimulator(sampleWitness.pythPolicyId).authorizeExecution({
      treasury: scenario.treasury,
      policy: scenario.policy,
      snapshots: scenario.snapshots,
      routes: scenario.routes,
      nowUs: 200_000_000,
      keeperId: "keeper-1",
      witness: sampleWitness,
    });
    const adapter = createAdapter(createFetchMock() as typeof fetch);

    await expect(
      adapter.executeIntent({
        intent: authorization.intent,
        routes: scenario.routes,
        wallet: createMockWallet(),
        assetTokenIds: { usdm: "usdm-token-id" },
        nowUs: authorization.intent.expiryUs + 1,
      }),
    ).rejects.toMatchObject({ code: "INTENT_EXPIRED" } satisfies Partial<DexHunterLiveError>);
  });

  it("rejects execution before the intent becomes valid", async () => {
    const scenario = buildDemoScenario();
    const authorization = new PolicyVaultSimulator(sampleWitness.pythPolicyId).authorizeExecution({
      treasury: scenario.treasury,
      policy: scenario.policy,
      snapshots: scenario.snapshots,
      routes: scenario.routes,
      nowUs: 200_000_000,
      keeperId: "keeper-1",
      witness: sampleWitness,
    });
    const adapter = createAdapter(createFetchMock() as typeof fetch);

    await expect(
      adapter.executeIntent({
        intent: authorization.intent,
        routes: scenario.routes,
        wallet: createMockWallet(),
        assetTokenIds: { usdm: "usdm-token-id" },
        nowUs: authorization.intent.createdAtUs - 1,
      }),
    ).rejects.toMatchObject({ code: "INTENT_NOT_YET_VALID" } satisfies Partial<DexHunterLiveError>);
  });

  it("records a live execution path in the keeper audit log", async () => {
    const scenario = buildDemoScenario();
    const auditStore = new AuditStore();
    const fetchMock = createFetchMock();
    const wallet = createMockWallet();
    const keeper = new CardanoDexHunterKeeperService(
      sampleWitness.pythPolicyId,
      auditStore,
      createAdapter(fetchMock as typeof fetch),
    );

    const result = await keeper.tick({
      treasury: scenario.treasury,
      policy: scenario.policy,
      routes: scenario.routes,
      snapshots: scenario.snapshots,
      nowUs: 200_000_000,
      keeperId: "keeper-1",
      witness: sampleWitness,
      wallet,
      assetTokenIds: { usdm: "usdm-token-id" },
    });

    expect(result.txHash).toBe("tx-live-123");
    const executionEvent = auditStore
      .listEvents()
      .find((event) => event.category === "execution");
    expect(executionEvent?.payload.totalFeeBps).toBeDefined();
  });
});
