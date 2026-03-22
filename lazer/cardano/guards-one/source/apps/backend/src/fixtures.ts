import {
  buildSnapshots,
  samplePolicy,
  sampleRoutes,
  sampleTreasury,
} from "@anaconda/core";
import { runtimeEnv } from "./env.js";

export const sampleWitness = {
  pythPolicyId: runtimeEnv.pythPreprodPolicyId,
  pythStateReference: runtimeEnv.cardanoPythStateReference,
  signedUpdateHex: "0xfeedbeef",
};

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
