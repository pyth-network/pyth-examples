import type { LockTransactionDraft, PaymentRequest, RequestStatus } from '../types/payment';

interface CreateRequestApiPayload {
  requesterAddressHex: string;
  sponsorAddressHex?: string | null;
  usdAmount: number;
  description: string;
  dueDate: string;
  adaUsd: number;
  coverageMultiplier?: number;
}

interface ApiRequestRecord {
  id: string;
  requesterAddressHex: string;
  sponsorAddressHex: string | null;
  usdAmount: number;
  lockAda: number;
  lockLovelace: number;
  adaUsd: number;
  coverageMultiplier: number;
  status: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  lockTxId?: string;
  lockTxDraft?: LockTransactionDraft;
}

interface CreateRequestApiResponse {
  request: ApiRequestRecord;
  lockTxDraft: LockTransactionDraft;
}

interface ListRequestsApiResponse {
  requests: ApiRequestRecord[];
}

const VALID_STATUSES: RequestStatus[] = ['created', 'ready_to_claim', 'claimed'];

function shortHex(value: string, keep = 8): string {
  if (value.length <= keep * 2) {
    return value;
  }
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) {
      return data.error;
    }
  } catch {
    // noop
  }
  return `Request failed with status ${response.status}.`;
}

function toPaymentRequest(record: ApiRequestRecord): PaymentRequest {
  const status = VALID_STATUSES.includes(record.status as RequestStatus)
    ? (record.status as RequestStatus)
    : 'created';

  return {
    id: record.id,
    usdAmount: record.usdAmount,
    description: record.description?.trim() || 'Untitled request',
    dueDate: record.dueDate || new Date().toISOString().slice(0, 10),
    createdAt: record.createdAt,
    lockAda: record.lockAda,
    status,
    beneficiaryLabel: `Eternl ${shortHex(record.requesterAddressHex)}`,
    sponsorLabel: record.sponsorAddressHex
      ? `Sponsor ${shortHex(record.sponsorAddressHex)}`
      : 'Sponsor Wallet A',
    requesterAddressHex: record.requesterAddressHex,
    sponsorAddressHex: record.sponsorAddressHex,
    lockLovelace: record.lockLovelace,
    adaUsdAtCreation: record.adaUsd,
    coverageMultiplier: record.coverageMultiplier,
    lockTxId: record.lockTxId,
    lockTxDraft: record.lockTxDraft,
  };
}

export async function fetchRequestsApi(): Promise<PaymentRequest[]> {
  const response = await fetch('/api/requests');
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const data = (await response.json()) as ListRequestsApiResponse;
  return (data.requests ?? []).map(toPaymentRequest);
}

export async function createRequestApi(
  payload: CreateRequestApiPayload,
): Promise<{ request: PaymentRequest; lockTxDraft: LockTransactionDraft }> {
  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const data = (await response.json()) as CreateRequestApiResponse;
  return {
    request: toPaymentRequest({
      ...data.request,
      lockTxDraft: data.lockTxDraft,
    }),
    lockTxDraft: data.lockTxDraft,
  };
}
