import type {
  ChainId,
  ExecutionKind,
  OracleSnapshot as CoreOracleSnapshot,
  PolicyConfig as CorePolicyConfig,
  RiskStage,
  TreasuryPosition as CoreTreasuryPosition,
} from "@anaconda/core";

export type { RiskStage };
export type { ChainId };

export type RiskLadderStep = RiskStage | "auto_reentry";

export type OracleSnapshot = Pick<
  CoreOracleSnapshot,
  "feedId" | "symbol" | "price" | "emaPrice" | "confidence" | "publisherCount"
> & {
  updatedAtMs: number;
};

export type TreasuryPosition = Pick<
  CoreTreasuryPosition,
  "assetId" | "symbol" | "amount" | "role"
> & {
  fiatValue: number;
  weight: number;
};

export interface ExecutionEvent {
  id: string;
  kind: ExecutionKind;
  stage: RiskStage;
  sourceSymbol: string;
  destinationSymbol: string;
  amount: number;
  route: string;
  timestamp: number;
  status: "executed" | "pending" | "failed";
}

export type PolicyConfig = Pick<
  CorePolicyConfig,
  | "policyId"
  | "primaryAssetId"
  | "primaryFeedId"
  | "stableAssetId"
  | "approvedRouteIds"
  | "haircutBps"
  | "maxStaleUs"
  | "maxConfidenceBps"
  | "cooldownUs"
  | "watchDrawdownBps"
  | "partialDrawdownBps"
  | "fullExitDrawdownBps"
  | "reentryDrawdownBps"
  | "portfolioFloorFiat"
  | "emergencyPortfolioFloorFiat"
  | "partialStableTargetRatio"
  | "reentryRiskTargetRatio"
>;

export interface DemoState {
  nowMs: number;
  vault: {
    id: string;
    name: string;
    chain: ChainId;
    stage: RiskStage;
    ladderStep?: RiskLadderStep;
    signers: string[];
    keepers: string[];
  };
  positions: TreasuryPosition[];
  oracle: OracleSnapshot;
  policy: PolicyConfig;
  events: ExecutionEvent[];
  metrics: {
    liquidValue: number;
    stableRatio: number;
    drawdownBps: number;
    oracleFreshness: string;
  };
  frames?: DemoFrame[];
}

export interface DemoFrame {
  index: number;
  balance: number;
  stableRatio: number;
  stage: RiskStage;
  trigger: string;
  explanation: string;
}
