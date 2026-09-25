import type { PaymentRequest } from '../types/payment';
import { computeLockAda, executeSettlement } from '../utils/settlement';

function toDateString(dayDelta: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

export function createSeedRequests(initialAdaUsd: number): PaymentRequest[] {
  const requestA: PaymentRequest = {
    id: 'request-seed-01',
    usdAmount: 420,
    description: 'Product design sprint for website revamp',
    dueDate: toDateString(5),
    createdAt: new Date().toISOString(),
    lockAda: computeLockAda(420, initialAdaUsd, 2),
    status: 'ready_to_claim',
    beneficiaryLabel: 'You',
    sponsorLabel: 'Sponsor Wallet A',
  };

  const readyAtCreation: PaymentRequest = {
    id: 'request-seed-02',
    usdAmount: 180,
    description: 'Brand motion package',
    dueDate: toDateString(-2),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    lockAda: computeLockAda(180, 0.58, 2),
    status: 'ready_to_claim',
    beneficiaryLabel: 'You',
    sponsorLabel: 'Sponsor Wallet A',
  };

  const requestB: PaymentRequest = {
    ...readyAtCreation,
    id: 'request-seed-03',
    status: 'claimed',
    settlement: executeSettlement(readyAtCreation, 0.66),
  };

  const requestC: PaymentRequest = {
    id: 'request-seed-04',
    usdAmount: 95,
    description: 'QA support batch',
    dueDate: toDateString(10),
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lockAda: computeLockAda(95, initialAdaUsd, 2),
    status: 'ready_to_claim',
    beneficiaryLabel: 'You',
    sponsorLabel: 'Sponsor Wallet A',
  };

  return [requestA, requestB, requestC];
}
