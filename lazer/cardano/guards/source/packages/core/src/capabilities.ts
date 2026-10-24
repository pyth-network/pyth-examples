import type { ChainCapabilities, ChainId, Role } from "./types.js";

export const roleModel: Role[] = [
  "governance",
  "risk_manager",
  "keeper",
  "viewer",
];

export const baseCapabilities: Record<ChainId, ChainCapabilities> = {
  cardano: {
    chainId: "cardano",
    live: true,
    supportsOracleVerifiedExecution: true,
    supportsHotColdBuckets: true,
    supportsAutoSwap: true,
    supportsAutoReentry: true,
    supportsLiveDeployments: true,
    notes: [
      "Cardano is the only live execution target in the MVP.",
      "Execution uses a two-step authorize-and-swap flow.",
    ],
  },
  svm: {
    chainId: "svm",
    live: false,
    supportsOracleVerifiedExecution: true,
    supportsHotColdBuckets: true,
    supportsAutoSwap: true,
    supportsAutoReentry: true,
    supportsLiveDeployments: false,
    notes: [
      "Scaffolding only in the MVP.",
      "Designed to share the same policy and role model.",
    ],
  },
  evm: {
    chainId: "evm",
    live: false,
    supportsOracleVerifiedExecution: true,
    supportsHotColdBuckets: true,
    supportsAutoSwap: true,
    supportsAutoReentry: true,
    supportsLiveDeployments: false,
    notes: [
      "Scaffolding only in the MVP.",
      "Connectors remain simulation-first until phase 2.",
    ],
  },
};
