export type ChainId = "cardano" | "svm" | "evm";

export type Role = "governance" | "risk_manager" | "keeper" | "viewer";

export type RiskStage =
  | "normal"
  | "watch"
  | "partial_derisk"
  | "full_exit"
  | "frozen";

export type ExecutionKind = "derisk_swap" | "reentry_swap";

export interface RouteSpec {
  routeId: string;
  venue: string;
  chainId: ChainId;
  fromAssetId: string;
  toAssetId: string;
  maxSlippageBps: number;
  live: boolean;
  notes?: string;
}

export interface AssetRiskRule {
  assetId: string;
  symbol: string;
  feedId: string;
  protectedFloorFiat: number;
  emergencyExitFloorFiat: number;
  enabled: boolean;
}

export interface PolicyConfig {
  policyId: string;
  primaryAssetId: string;
  primaryFeedId: string;
  stableAssetId: string;
  approvedRouteIds: string[];
  haircutBps: number;
  maxStaleUs: number;
  maxConfidenceBps: number;
  cooldownUs: number;
  watchDrawdownBps: number;
  partialDrawdownBps: number;
  fullExitDrawdownBps: number;
  reentryDrawdownBps: number;
  portfolioFloorFiat: number;
  emergencyPortfolioFloorFiat: number;
  partialStableTargetRatio: number;
  reentryRiskTargetRatio: number;
  assetRules: AssetRiskRule[];
}

export interface OracleSnapshot {
  snapshotId: string;
  feedId: string;
  assetId: string;
  symbol: string;
  price: number;
  emaPrice: number;
  confidence: number;
  exponent: number;
  feedUpdateTimestampUs: number;
  observedAtUs: number;
  publisherCount?: number;
  marketSession?: string;
}

export interface TreasuryPosition {
  assetId: string;
  symbol: string;
  amount: number;
  decimals: number;
  role: "risk" | "stable";
  feedId: string;
  bucket: "cold" | "hot";
}

export interface TreasuryState {
  vaultId: string;
  name: string;
  chainId: ChainId;
  stage: RiskStage;
  positions: TreasuryPosition[];
  governanceSigners: string[];
  riskManagers: string[];
  keepers: string[];
  viewers: string[];
  safeAddresses: string[];
  executionHotWallet: string;
  governanceWallet: string;
  lastTransitionUs: number;
  currentIntentId?: string | undefined;
}

export interface PortfolioMetrics {
  totalLiquidValueFiat: number;
  stableLiquidValueFiat: number;
  riskLiquidValueFiat: number;
  stableRatio: number;
  drawdownBps: number;
  assetLiquidValues: Record<string, number>;
  priceMap: Record<string, number>;
}

export interface EvaluationReason {
  code: string;
  severity: RiskStage;
  message: string;
  details?: Record<string, number | string | boolean> | undefined;
}

export interface ExecutionIntent {
  intentId: string;
  vaultId: string;
  chainId: ChainId;
  kind: ExecutionKind;
  stage: RiskStage;
  sourceAssetId: string;
  destinationAssetId: string;
  routeId: string;
  maxSellAmount: number;
  minBuyAmount: number;
  expiryUs: number;
  reasonHash: string;
  snapshotIds: string[];
  createdAtUs: number;
}

export interface ExecutionResult {
  intentId: string;
  vaultId: string;
  chainId: ChainId;
  sourceAssetId: string;
  destinationAssetId: string;
  soldAmount: number;
  boughtAmount: number;
  averagePrice: number;
  txHash: string;
  executedAtUs: number;
  routeId: string;
}

export interface RiskAssessment {
  nowUs: number;
  currentStage: RiskStage;
  nextStage: RiskStage;
  metrics: PortfolioMetrics;
  reasons: EvaluationReason[];
  intent?: ExecutionIntent | undefined;
  cooldownRemainingUs: number;
  shouldFreeze: boolean;
}

export interface ChainCapabilities {
  chainId: ChainId;
  live: boolean;
  supportsOracleVerifiedExecution: boolean;
  supportsHotColdBuckets: boolean;
  supportsAutoSwap: boolean;
  supportsAutoReentry: boolean;
  supportsLiveDeployments: boolean;
  notes: string[];
}

export interface TreasuryConnector {
  chainId: ChainId;
  capabilities: ChainCapabilities;
  describeExecutionConstraints(): string[];
  simulateRoute(
    intent: ExecutionIntent,
    priceMap: Record<string, number>,
  ): Pick<
    ExecutionResult,
    | "sourceAssetId"
    | "destinationAssetId"
    | "soldAmount"
    | "boughtAmount"
    | "averagePrice"
    | "routeId"
  >;
}
