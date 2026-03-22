export type Role = 'user' | 'sponsor';

export type RequestStatus = 'created' | 'ready_to_claim' | 'claimed';

export type RequestFilter = 'all' | RequestStatus;

export interface SettlementResult {
  executedAt: string;
  executedAdaUsd: number;
  requiredAda: number;
  sentAda: number;
  sponsorChangeAda: number;
  wasUnderfunded: boolean;
  shortfallUsd: number;
}

export interface PaymentRequest {
  id: string;
  usdAmount: number;
  description: string;
  dueDate: string;
  createdAt: string;
  lockAda: number;
  status: RequestStatus;
  beneficiaryLabel: string;
  sponsorLabel: string;
  settlement?: SettlementResult;
}

export interface CreateRequestPayload {
  usdAmount: number;
  description: string;
  dueDate: string;
}
