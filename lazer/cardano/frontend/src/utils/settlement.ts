import type { PaymentRequest, SettlementResult } from '../types/payment';

export function computeLockAda(
  usdAmount: number,
  adaUsd: number,
  coverageMultiplier: number,
): number {
  if (adaUsd <= 0 || coverageMultiplier <= 0) {
    return 0;
  }

  const requiredAda = usdAmount / adaUsd;
  return requiredAda * coverageMultiplier;
}

export function executeSettlement(
  request: PaymentRequest,
  currentAdaUsd: number,
): SettlementResult {
  const requiredAda = request.usdAmount / currentAdaUsd;
  const sentAda = Math.min(requiredAda, request.lockAda);
  const sponsorChangeAda = Math.max(request.lockAda - requiredAda, 0);
  const wasUnderfunded = request.lockAda < requiredAda;
  const shortfallAda = Math.max(requiredAda - request.lockAda, 0);
  const shortfallUsd = shortfallAda * currentAdaUsd;

  return {
    executedAt: new Date().toISOString(),
    executedAdaUsd: currentAdaUsd,
    requiredAda,
    sentAda,
    sponsorChangeAda,
    wasUnderfunded,
    shortfallUsd,
  };
}
