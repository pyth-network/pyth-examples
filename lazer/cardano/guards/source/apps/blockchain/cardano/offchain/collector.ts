import { PythLazerClient, type Channel } from "@pythnetwork/pyth-lazer-sdk";
import type { OracleSnapshot } from "@anaconda/core";
import type { CardanoPythWitness } from "@anaconda/cardano";
import { runtimeEnv } from "./env.js";
import type {
  PythLazerClientLike,
  PythLiveCollectorConfig,
  PythLiveFeedRequest,
  PythSignedUpdateResult,
  PythSymbolMatch,
  SnapshotAuditSink,
} from "./types.js";

export class PythLiveCollectorError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function normalizeSymbol(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function parseRequiredNumber(
  value: number | string | undefined,
  field: string,
): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new PythLiveCollectorError(
      "PYTH_FIELD_MISSING",
      `Pyth update is missing numeric field ${field}`,
    );
  }

  return parsed as number;
}

function normalizeTimestampUs(value: number): number {
  if (value >= 1_000_000_000_000_000) {
    return Math.trunc(value);
  }

  if (value >= 1_000_000_000_000) {
    return Math.trunc(value * 1_000);
  }

  if (value >= 1_000_000_000) {
    return Math.trunc(value * 1_000_000);
  }

  return Math.trunc(value);
}

function buildSnapshotId(assetId: string, observedAtUs: number): string {
  return `snapshot:${assetId}:${observedAtUs}`;
}

function normalizeSignedUpdateHex(value: string): string {
  if (value.startsWith("0x") || value.startsWith("0X")) {
    return value;
  }

  return `0x${value}`;
}

function createWitness(
  signedUpdateHex: string,
  config: Pick<PythLiveCollectorConfig, "pythPolicyId" | "pythStateReference">,
): CardanoPythWitness {
  return {
    pythPolicyId: config.pythPolicyId,
    pythStateReference: config.pythStateReference,
    signedUpdateHex,
  };
}

function selectBestSymbolMatch(
  matches: PythSymbolMatch[],
  request: PythLiveFeedRequest,
): PythSymbolMatch | undefined {
  const query = normalizeSymbol(request.symbolQuery ?? request.symbol);
  const exact = matches.find((candidate) => {
    const fields = [candidate.symbol, candidate.name, candidate.description].map(normalizeSymbol);
    return fields.includes(query);
  });
  if (exact) {
    return exact;
  }

  return matches.find((candidate) => {
    const candidateSymbol = normalizeSymbol(candidate.symbol);
    return candidateSymbol.endsWith(query) || candidateSymbol.includes(query);
  });
}

export class PythCollector {
  private readonly snapshots = new Map<string, OracleSnapshot>();

  constructor(protected readonly auditSink?: SnapshotAuditSink) {}

  publish(snapshot: OracleSnapshot) {
    this.snapshots.set(snapshot.assetId, snapshot);
    this.auditSink?.recordSnapshot?.(snapshot);
    this.auditSink?.recordEvent?.({
      eventId: `snapshot:${snapshot.snapshotId}`,
      category: "snapshot",
      payload: {
        assetId: snapshot.assetId,
        snapshotId: snapshot.snapshotId,
        observedAtUs: snapshot.observedAtUs,
      },
      createdAtUs: snapshot.observedAtUs,
    });
  }

  current(): Record<string, OracleSnapshot> {
    return Object.fromEntries(this.snapshots.entries());
  }
}

export class PythLiveCollector extends PythCollector {
  private readonly priceFeedIdCache = new Map<string, number>();

  constructor(
    private readonly client: PythLazerClientLike,
    private readonly config: PythLiveCollectorConfig,
    auditSink?: SnapshotAuditSink,
  ) {
    super(auditSink);
  }

  static async create(
    auditSink?: SnapshotAuditSink,
    config: Partial<PythLiveCollectorConfig> = {},
  ) {
    if (!runtimeEnv.pythApiKey) {
      throw new PythLiveCollectorError(
        "PYTH_API_KEY_MISSING",
        "PYTH_API_KEY must be configured before creating the live collector",
      );
    }

    const client = await PythLazerClient.create({
      token: runtimeEnv.pythApiKey,
      webSocketPoolConfig: {},
      ...(runtimeEnv.pythMetadataServiceUrl
        ? { metadataServiceUrl: runtimeEnv.pythMetadataServiceUrl }
        : {}),
      ...(runtimeEnv.pythPriceServiceUrl
        ? { priceServiceUrl: runtimeEnv.pythPriceServiceUrl }
        : {}),
    });

    return new PythLiveCollector(
      client,
      {
        channel: (config.channel ?? runtimeEnv.pythStreamChannel) as Channel,
        pythPolicyId: config.pythPolicyId ?? runtimeEnv.pythPreprodPolicyId,
        pythStateReference:
          config.pythStateReference ?? runtimeEnv.cardanoPythStateReference,
      },
      auditSink,
    );
  }

  async resolvePriceFeedId(request: PythLiveFeedRequest): Promise<number> {
    if (request.priceFeedId != null) {
      return request.priceFeedId;
    }

    const cacheKey = `${request.assetType ?? ""}:${request.symbolQuery ?? request.symbol}`;
    const cached = this.priceFeedIdCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const matches = await this.client.getSymbols({
      query: request.symbolQuery ?? request.symbol,
      ...(request.assetType ? { asset_type: request.assetType } : {}),
    });

    const match = selectBestSymbolMatch(matches, request);
    if (!match) {
      throw new PythLiveCollectorError(
        "PYTH_SYMBOL_NOT_FOUND",
        `Unable to resolve a Pyth Lazer price feed for ${request.symbolQuery ?? request.symbol}`,
      );
    }

    this.priceFeedIdCache.set(cacheKey, match.pyth_lazer_id);
    return match.pyth_lazer_id;
  }

  async fetchSignedUpdate(request: PythLiveFeedRequest): Promise<PythSignedUpdateResult> {
    const resolvedPriceFeedId = await this.resolvePriceFeedId(request);
    const raw = await this.client.getLatestPrice({
      channel: this.config.channel,
      priceFeedIds: [resolvedPriceFeedId],
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

    const rawSignedUpdateHex = raw.solana?.data;
    if (!rawSignedUpdateHex) {
      throw new PythLiveCollectorError(
        "PYTH_SIGNED_UPDATE_MISSING",
        `Pyth response for ${request.symbol} did not include a solana/Cardano signed update`,
      );
    }
    const signedUpdateHex = normalizeSignedUpdateHex(rawSignedUpdateHex);

    const parsed = raw.parsed?.priceFeeds.find(
      (candidate) => candidate.priceFeedId === resolvedPriceFeedId,
    );
    if (!parsed) {
      throw new PythLiveCollectorError(
        "PYTH_PARSED_FEED_MISSING",
        `Pyth response did not include parsed payload for feed ${resolvedPriceFeedId}`,
      );
    }

    const observedAtUs = normalizeTimestampUs(
      parseRequiredNumber(raw.parsed?.timestampUs, "timestampUs"),
    );
    const feedUpdateTimestampUs = normalizeTimestampUs(
      parseRequiredNumber(parsed.feedUpdateTimestamp, "feedUpdateTimestamp"),
    );

    const snapshot: OracleSnapshot = {
      snapshotId: buildSnapshotId(request.assetId, observedAtUs),
      feedId: request.feedId,
      assetId: request.assetId,
      symbol: request.symbol,
      price: parseRequiredNumber(parsed.price, "price"),
      emaPrice: parseRequiredNumber(parsed.emaPrice, "emaPrice"),
      confidence: parseRequiredNumber(parsed.confidence, "confidence"),
      exponent: parseRequiredNumber(parsed.exponent, "exponent"),
      feedUpdateTimestampUs,
      observedAtUs,
      ...(parsed.publisherCount != null
        ? { publisherCount: parsed.publisherCount }
        : {}),
      ...(parsed.marketSession ? { marketSession: parsed.marketSession } : {}),
    };

    const witness = createWitness(signedUpdateHex, this.config);

    return {
      snapshot,
      witness,
      signedUpdateHex,
      resolvedPriceFeedId,
      raw,
    };
  }

  async fetchAndPublish(request: PythLiveFeedRequest): Promise<PythSignedUpdateResult> {
    const result = await this.fetchSignedUpdate(request);
    this.publish(result.snapshot);
    return result;
  }
}
