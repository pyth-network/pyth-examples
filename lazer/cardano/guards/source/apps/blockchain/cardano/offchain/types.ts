import type {
  AssetType,
  Channel,
  JsonUpdate,
  PythLazerClient,
  SymbolResponse,
} from "@pythnetwork/pyth-lazer-sdk";
import type { OracleSnapshot } from "@anaconda/core";
import type { CardanoPythWitness } from "@anaconda/cardano";

export interface SnapshotAuditEvent {
  eventId: string;
  category: "snapshot";
  payload: Record<string, unknown>;
  createdAtUs: number;
}

export interface SnapshotAuditSink {
  recordSnapshot?(snapshot: OracleSnapshot): void;
  recordEvent?(event: SnapshotAuditEvent): void;
}

export interface PythLiveFeedRequest {
  assetId: string;
  feedId: string;
  symbol: string;
  symbolQuery?: string;
  priceFeedId?: number;
  assetType?: AssetType;
}

export interface PythSignedUpdateResult {
  snapshot: OracleSnapshot;
  witness: CardanoPythWitness;
  signedUpdateHex: string;
  resolvedPriceFeedId: number;
  raw: JsonUpdate;
}

export interface PythLiveCollectorConfig {
  channel: Channel;
  pythPolicyId: string;
  pythStateReference: string;
}

export interface PythLazerClientLike
  extends Pick<PythLazerClient, "getLatestPrice" | "getSymbols"> {}

export type PythSymbolMatch = Pick<
  SymbolResponse,
  "pyth_lazer_id" | "symbol" | "name" | "description" | "asset_type"
>;
