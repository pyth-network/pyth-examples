import {
  evaluateRiskLadder,
  type OracleSnapshot,
  type PolicyConfig,
  type RiskAssessment,
  type RouteSpec,
  type TreasuryState,
} from "@anaconda/core";

export class RiskEngine {
  evaluate(
    treasury: TreasuryState,
    policy: PolicyConfig,
    snapshots: Record<string, OracleSnapshot>,
    routes: RouteSpec[],
    nowUs: number,
  ): RiskAssessment {
    return evaluateRiskLadder(treasury, policy, snapshots, routes, nowUs);
  }
}
