import {
  buildSnapshots,
  samplePolicy,
  sampleRoutes,
  sampleTreasury,
} from "@anaconda/core";
import type { CardanoPythWitness } from "@anaconda/cardano";
import type { PythLiveFeedRequest } from "./types.js";
import { runtimeEnv } from "./env.js";

export const sampleWitness: CardanoPythWitness = {
  pythPolicyId: runtimeEnv.pythPreprodPolicyId,
  pythStateReference: runtimeEnv.cardanoPythStateReference,
  signedUpdateHex: "0xfeedbeef",
};

export function buildPrimaryLiveFeedRequest(): PythLiveFeedRequest {
  const primaryPosition = sampleTreasury.positions.find(
    (position) => position.assetId === samplePolicy.primaryAssetId,
  );

  const request: PythLiveFeedRequest = {
    assetId: samplePolicy.primaryAssetId,
    feedId: runtimeEnv.pythPrimaryFeedId,
    symbol: primaryPosition ? `${primaryPosition.symbol}/USD` : "ADA/USD",
    symbolQuery: runtimeEnv.pythPrimarySymbolQuery,
  };

  const assetType = runtimeEnv.pythPrimaryAssetType;
  if (assetType) {
    request.assetType = assetType as NonNullable<PythLiveFeedRequest["assetType"]>;
  }

  if (runtimeEnv.pythPrimaryPriceFeedId != null) {
    request.priceFeedId = runtimeEnv.pythPrimaryPriceFeedId;
  }

  return request;
}

export function buildDemoScenario() {
  return {
    treasury: structuredClone(sampleTreasury),
    policy: structuredClone(samplePolicy),
    routes: structuredClone(sampleRoutes),
    snapshots: buildSnapshots({
      ada: {
        snapshotId: "snapshot-ada-live",
        feedUpdateTimestampUs: 180_000_000,
        observedAtUs: 180_000_000,
      },
      usdm: {
        snapshotId: "snapshot-usdm-live",
        feedUpdateTimestampUs: 180_000_000,
        observedAtUs: 180_000_000,
      },
    }),
  };
}
