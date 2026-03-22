import type { RequestStatus } from '../types/payment';

interface StatusBadgeProps {
  status: RequestStatus;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  created: 'Created',
  ready_to_claim: 'Ready to claim',
  claimed: 'Claimed',
};

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  return <span className={`status-badge status-badge--${status}`}>{STATUS_LABELS[status]}</span>;
}
