import type { PaymentRequest, Role } from '../types/payment';
import { RequestCard } from './RequestCard';

interface RequestListProps {
  title: string;
  items: PaymentRequest[];
  role: Role;
  adaUsd: number;
  emptyText: string;
  onClaim?: (id: string) => void;
}

export function RequestList({
  title,
  items,
  role,
  adaUsd,
  emptyText,
  onClaim,
}: RequestListProps): JSX.Element {
  return (
    <section className="panel request-list-panel">
      <header className="panel__header">
        <h2>{title}</h2>
      </header>
      {items.length === 0 ? <p className="empty-state">{emptyText}</p> : null}
      <div className="request-list">
        {items.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            role={role}
            adaUsd={adaUsd}
            onClaim={onClaim}
          />
        ))}
      </div>
    </section>
  );
}
