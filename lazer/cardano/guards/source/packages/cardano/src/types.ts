import type {
  ExecutionIntent,
  ExecutionResult,
  OracleSnapshot,
  PolicyConfig,
  RiskAssessment,
  RouteSpec,
  TreasuryState,
} from "@anaconda/core";

export interface CardanoPythWitness {
  pythPolicyId: string;
  pythStateReference: string;
  signedUpdateHex: string;
}

export interface CardanoTxEnvelope {
  kind: "authorize_execution" | "complete_execution";
  validityStartUs: number;
  validityEndUs: number;
  referenceInputs: string[];
  withdrawals: Array<{
    policyId: string;
    amount: number;
    redeemer: string;
  }>;
  spendingTargets: string[];
  metadata: Record<string, string>;
}

export interface AuthorizeExecutionParams {
  treasury: TreasuryState;
  policy: PolicyConfig;
  snapshots: Record<string, OracleSnapshot>;
  routes: RouteSpec[];
  nowUs: number;
  keeperId: string;
  witness: CardanoPythWitness;
}

export interface AuthorizeExecutionResult {
  treasury: TreasuryState;
  assessment: RiskAssessment;
  intent: ExecutionIntent;
  tx: CardanoTxEnvelope;
}

export interface CompleteExecutionParams {
  treasury: TreasuryState;
  policy: PolicyConfig;
  intent: ExecutionIntent;
  result: ExecutionResult;
}

export interface CompleteExecutionResult {
  treasury: TreasuryState;
  tx: CardanoTxEnvelope;
}

export interface CardanoPolicyVaultArtifact {
  name: string;
  datumFields: string[];
  redeemers: string[];
  invariants: string[];
}
