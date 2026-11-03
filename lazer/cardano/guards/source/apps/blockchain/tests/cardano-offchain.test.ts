import { describe, expect, it, vi } from "vitest";
import {
  PythCollector,
  PythLiveCollector,
  PythLiveCollectorError,
  type PythLiveFeedRequest,
  type SnapshotAuditSink,
} from "@anaconda/blockchain/cardano/offchain";
import type { OracleSnapshot } from "@anaconda/core";
import type { SymbolResponse } from "@pythnetwork/pyth-lazer-sdk";

const request: PythLiveFeedRequest = {
  assetId: "ada",
  feedId: "pyth-ada-usd",
  symbol: "ADA/USD",
  symbolQuery: "ADA/USD",
  assetType: "crypto",
};

function buildCollectorPayload() {
  return {
    parsed: {
      timestampUs: "1700000000200000",
      priceFeeds: [
        {
          priceFeedId: 17,
          price: "45230000",
          emaPrice: "46000000",
          confidence: 1200,
          exponent: -8,
          publisherCount: 14,
          marketSession: "active",
          feedUpdateTimestamp: 1_700_000_000,
        },
      ],
    },
    solana: {
      encoding: "hex" as const,
      data: "deadbeef",
    },
  };
}

function buildSymbolMatch(): SymbolResponse {
  return {
    pyth_lazer_id: 17,
    symbol: "Crypto.ADA/USD",
    name: "ADA/USD",
    description: "Cardano spot",
    asset_type: "crypto",
    exponent: -8,
    min_publishers: 1,
    min_channel: "fixed_rate@200ms",
    state: "active",
    schedule: "24/7",
  };
}

describe("PythCollector", () => {
  it("stores snapshots and emits snapshot audit events", () => {
    const sink: SnapshotAuditSink = {
      recordSnapshot: vi.fn(),
      recordEvent: vi.fn(),
    };
    const collector = new PythCollector(sink);
    const snapshot: OracleSnapshot = {
      snapshotId: "snapshot:ada:1",
      assetId: "ada",
      feedId: "pyth-ada-usd",
      symbol: "ADA/USD",
      price: 1,
      emaPrice: 1,
      confidence: 0,
      exponent: 0,
      feedUpdateTimestampUs: 1,
      observedAtUs: 1,
    };

    collector.publish(snapshot);

    expect(collector.current()).toEqual({ ada: snapshot });
    expect(sink.recordSnapshot).toHaveBeenCalledWith(snapshot);
    expect(sink.recordEvent).toHaveBeenCalledWith({
      eventId: "snapshot:snapshot:ada:1",
      category: "snapshot",
      payload: {
        assetId: "ada",
        snapshotId: "snapshot:ada:1",
        observedAtUs: 1,
      },
      createdAtUs: 1,
    });
  });
});

describe("PythLiveCollector", () => {
  it("resolves a symbol, fetches a signed update, and publishes a snapshot", async () => {
    const sink: SnapshotAuditSink = {
      recordSnapshot: vi.fn(),
      recordEvent: vi.fn(),
    };
    const client = {
      getSymbols: vi.fn(async () => [buildSymbolMatch()]),
      getLatestPrice: vi.fn(async () => buildCollectorPayload()),
    };

    const collector = new PythLiveCollector(
      client,
      {
        channel: "fixed_rate@200ms",
        pythPolicyId: "policy-id",
        pythStateReference: "state-ref",
      },
      sink,
    );

    const result = await collector.fetchAndPublish(request);

    expect(client.getSymbols).toHaveBeenCalledTimes(1);
    expect(client.getLatestPrice).toHaveBeenCalledWith({
      channel: "fixed_rate@200ms",
      priceFeedIds: [17],
      properties: [
        "price",
        "emaPrice",
        "confidence",
        "publisherCount",
        "exponent",
        "marketSession",
        "feedUpdateTimestamp",
      ],
      formats: ["solana"],
      parsed: true,
      jsonBinaryEncoding: "hex",
    });
    expect(result.witness).toEqual({
      pythPolicyId: "policy-id",
      pythStateReference: "state-ref",
      signedUpdateHex: "0xdeadbeef",
    });
    expect(result.snapshot).toMatchObject({
      assetId: "ada",
      feedId: "pyth-ada-usd",
      symbol: "ADA/USD",
      price: 45_230_000,
      emaPrice: 46_000_000,
      confidence: 1200,
      exponent: -8,
      publisherCount: 14,
      marketSession: "active",
      observedAtUs: 1_700_000_000_200_000,
      feedUpdateTimestampUs: 1_700_000_000_000_000,
    });
    expect(collector.current().ada?.snapshotId).toBe(
      result.snapshot.snapshotId,
    );
    expect(sink.recordSnapshot).toHaveBeenCalledOnce();
    expect(sink.recordEvent).toHaveBeenCalledOnce();
  });

  it("caches symbol resolution across multiple fetches", async () => {
    const client = {
      getSymbols: vi.fn(async () => [buildSymbolMatch()]),
      getLatestPrice: vi.fn(async () => buildCollectorPayload()),
    };

    const collector = new PythLiveCollector(client, {
      channel: "fixed_rate@200ms",
      pythPolicyId: "policy-id",
      pythStateReference: "state-ref",
    });

    await collector.fetchSignedUpdate(request);
    await collector.fetchSignedUpdate(request);

    expect(client.getSymbols).toHaveBeenCalledTimes(1);
    expect(client.getLatestPrice).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the signed update payload is missing", async () => {
    const client = {
      getSymbols: vi.fn(async () => [buildSymbolMatch()]),
      getLatestPrice: vi.fn(async () => ({
        parsed: buildCollectorPayload().parsed,
      })),
    };

    const collector = new PythLiveCollector(client, {
      channel: "fixed_rate@200ms",
      pythPolicyId: "policy-id",
      pythStateReference: "state-ref",
    });

    await expect(collector.fetchSignedUpdate(request)).rejects.toMatchObject({
      code: "PYTH_SIGNED_UPDATE_MISSING",
    } satisfies Partial<PythLiveCollectorError>);
  });
});
