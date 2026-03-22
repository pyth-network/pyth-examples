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

export interface LockTransactionDraft {
  txId: string;
  network: string;
  kind: 'lock';
  fromAddressHex: string;
  toScriptAddress: string;
  amount: {
    lovelace: number;
  };
  metadata: {
    requestId: string;
    usdAmount: number;
    adaUsd: number;
    coverageMultiplier: number;
  };
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
  requesterAddressHex?: string;
  sponsorAddressHex?: string | null;
  lockLovelace?: number;
  adaUsdAtCreation?: number;
  coverageMultiplier?: number;
  lockTxId?: string;
  lockTxDraft?: LockTransactionDraft;
  settlement?: SettlementResult;
}

export interface CreateRequestPayload {
  usdAmount: number;
  description: string;
  dueDate: string;
}
