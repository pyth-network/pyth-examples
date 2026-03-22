import type { ReactNode } from 'react';
import type { PaymentRequest, Role } from '../types/payment';
import { RequestCard } from './RequestCard';

interface RequestListProps {
  title: string;
  items: PaymentRequest[];
  role: Role;
  adaUsd: number;
  emptyText: string;
  filters?: ReactNode;
  className?: string;
  embedded?: boolean;
  onClaim?: (id: string) => void;
}

export function RequestList({
  title,
  items,
  role,
  adaUsd,
  emptyText,
  filters,
  className,
  embedded = false,
  onClaim,
}: RequestListProps): JSX.Element {
  const content = (
    <>
      {filters ? <div className="filter-row request-list-filters">{filters}</div> : null}
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
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className={`panel request-list-panel ${className ?? ''}`.trim()}>
      <header className="panel__header">
        <h2>{title}</h2>
      </header>
      {content}
    </section>
  );
}
