import { useState } from 'react';
import { RequestForm } from '../components/RequestForm';
import { RequestList } from '../components/RequestList';
import type {
  CreateRequestPayload,
  PaymentRequest,
  RequestFilter,
} from '../types/payment';

interface UserDashboardProps {
  requests: PaymentRequest[];
  filter: RequestFilter;
  adaUsd: number;
  coverageMultiplier: number;
  onFilterChange: (filter: RequestFilter) => void;
  onCreate: (payload: CreateRequestPayload) => void;
  onClaim: (requestId: string) => void;
}

const FILTERS: Array<{ value: RequestFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'created', label: 'Created' },
  { value: 'ready_to_claim', label: 'Ready' },
  { value: 'claimed', label: 'Claimed' },
];

export function UserDashboard({
  requests,
  filter,
  adaUsd,
  coverageMultiplier,
  onFilterChange,
  onCreate,
  onClaim,
}: UserDashboardProps): JSX.Element {
  const [isRequestsOpen, setIsRequestsOpen] = useState(true);
  const filteredRequests =
    filter === 'all' ? requests : requests.filter((request) => request.status === filter);

  return (
    <div className="user-dashboard-stack">
      <RequestForm
        adaUsd={adaUsd}
        coverageMultiplier={coverageMultiplier}
        onCreate={onCreate}
        className="panel--primary-action"
      />
      <section className="panel panel--secondary-action requests-collapsible">
        <header className="panel__header">
          <h2>Requests</h2>
          <button
            type="button"
            className="panel-toggle-button"
            onClick={() => setIsRequestsOpen((current) => !current)}
            aria-label={isRequestsOpen ? 'Collapse requests section' : 'Expand requests section'}
            title={isRequestsOpen ? 'Collapse section' : 'Expand section'}
          >
            {isRequestsOpen ? '▴' : '▾'}
          </button>
        </header>

        {isRequestsOpen ? (
          <RequestList
            title="Requests"
            items={filteredRequests}
            role="user"
            adaUsd={adaUsd}
            emptyText="No requests in this state."
            embedded
            filters={
              <>
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    className={`chip ${filter === item.value ? 'chip--active' : ''}`}
                    type="button"
                    onClick={() => onFilterChange(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            }
            onClaim={onClaim}
          />
        ) : (
          <p className="muted panel-summary">
            {filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'} in this
            filter.
          </p>
        )}
      </section>
    </div>
  );
}
