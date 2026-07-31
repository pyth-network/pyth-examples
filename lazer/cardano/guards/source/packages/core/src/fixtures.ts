import type {
  OracleSnapshot,
  PolicyConfig,
  RouteSpec,
  TreasuryState,
} from "./types.js";

export const samplePolicy: PolicyConfig = {
  policyId: "policy-treasury-guard-v4",
  primaryAssetId: "ada",
  primaryFeedId: "pyth-ada-usd",
  stableAssetId: "usdm",
  approvedRouteIds: [
    "cardano-minswap-ada-usdm",
    "cardano-minswap-usdm-ada",
  ],
  haircutBps: 300,
  maxStaleUs: 120_000_000,
  maxConfidenceBps: 150,
  cooldownUs: 30_000_000,
  watchDrawdownBps: 500,
  partialDrawdownBps: 900,
  fullExitDrawdownBps: 1_500,
  reentryDrawdownBps: 250,
  portfolioFloorFiat: 4_500,
  emergencyPortfolioFloorFiat: 3_400,
  partialStableTargetRatio: 0.55,
  reentryRiskTargetRatio: 0.65,
  assetRules: [
    {
      assetId: "ada",
      symbol: "ADA",
      feedId: "pyth-ada-usd",
      protectedFloorFiat: 2_700,
      emergencyExitFloorFiat: 2_050,
      enabled: true,
    },
  ],
};

export const sampleRoutes: RouteSpec[] = [
  {
    routeId: "cardano-minswap-ada-usdm",
    venue: "Minswap",
    chainId: "cardano",
    fromAssetId: "ada",
    toAssetId: "usdm",
    maxSlippageBps: 120,
    live: true,
    notes: "Primary approved route for Cardano execution bucket",
  },
  {
    routeId: "cardano-minswap-usdm-ada",
    venue: "Minswap",
    chainId: "cardano",
    fromAssetId: "usdm",
    toAssetId: "ada",
    maxSlippageBps: 120,
    live: true,
    notes: "Re-entry route for the same pair",
  },
];

export const sampleTreasury: TreasuryState = {
  vaultId: "vault-anaconda-demo",
  name: "Anaconda Treasury Demo",
  chainId: "cardano",
  stage: "normal",
  positions: [
    {
      assetId: "ada",
      symbol: "ADA",
      amount: 10_000,
      decimals: 6,
      role: "risk",
      feedId: "pyth-ada-usd",
      bucket: "hot",
    },
    {
      assetId: "usdm",
      symbol: "USDM",
      amount: 1_500,
      decimals: 6,
      role: "stable",
      feedId: "stable-usdm-usd",
      bucket: "hot",
    },
  ],
  governanceSigners: ["gov-1", "gov-2", "gov-3"],
  riskManagers: ["risk-1"],
  keepers: ["keeper-1", "keeper-2"],
  viewers: ["viewer-1"],
  safeAddresses: ["addr_test_safe_1"],
  executionHotWallet: "addr_test_hot_1",
  governanceWallet: "addr_test_gov_1",
  lastTransitionUs: 0,
};

export function buildSnapshots(
  overrides?: Partial<Record<"ada" | "usdm", Partial<OracleSnapshot>>>,
): Record<string, OracleSnapshot> {
  return {
    ada: {
      snapshotId: "snapshot-ada",
      feedId: "pyth-ada-usd",
      assetId: "ada",
      symbol: "ADA/USD",
      price: 72,
      emaPrice: 80,
      confidence: 0.4,
      exponent: -2,
      feedUpdateTimestampUs: 1_000_000,
      observedAtUs: 1_000_000,
      ...overrides?.ada,
    },
    usdm: {
      snapshotId: "snapshot-usdm",
      feedId: "stable-usdm-usd",
      assetId: "usdm",
      symbol: "USDM/USD",
      price: 1_000_000,
      emaPrice: 1_000_000,
      confidence: 500,
      exponent: -6,
      feedUpdateTimestampUs: 1_000_000,
      observedAtUs: 1_000_000,
      ...overrides?.usdm,
    },
  };
}
