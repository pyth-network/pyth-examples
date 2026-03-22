import { RequestForm } from '../components/RequestForm';
import { RequestList } from '../components/RequestList';
import type {
  CreateRequestPayload,
  PaymentRequest,
  RequestFilter,
  RequestStatus,
} from '../types/payment';
import { formatUsd } from '../utils/format';

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

function countByStatus(requests: PaymentRequest[], status: RequestStatus): number {
  return requests.filter((request) => request.status === status).length;
}

export function UserDashboard({
  requests,
  filter,
  adaUsd,
  coverageMultiplier,
  onFilterChange,
  onCreate,
  onClaim,
}: UserDashboardProps): JSX.Element {
  const filteredRequests =
    filter === 'all' ? requests : requests.filter((request) => request.status === filter);
  const totalClaimedUsd = requests
    .filter((request) => request.status === 'claimed')
    .reduce((sum, request) => sum + request.usdAmount, 0);

  return (
    <div className="dashboard-grid">
      <div className="left-column">
        <RequestForm
          adaUsd={adaUsd}
          coverageMultiplier={coverageMultiplier}
          onCreate={onCreate}
        />
        <section className="panel quick-kpis">
          <h2>User Snapshot</h2>
          <div className="kpi-row">
            <span>Claimable requests</span>
            <strong>{countByStatus(requests, 'ready_to_claim')}</strong>
          </div>
          <div className="kpi-row">
            <span>Already claimed</span>
            <strong>{countByStatus(requests, 'claimed')}</strong>
          </div>
          <div className="kpi-row">
            <span>Total claimed value</span>
            <strong>{formatUsd(totalClaimedUsd)}</strong>
          </div>
        </section>
      </div>

      <div className="right-column">
        <section className="filter-tabs panel">
          <header className="panel__header">
            <h2>Requests</h2>
          </header>
          <div className="filter-row">
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
          </div>
        </section>
        <RequestList
          title="Payment requests"
          items={filteredRequests}
          role="user"
          adaUsd={adaUsd}
          emptyText="No requests in this state."
          onClaim={onClaim}
        />
      </div>
    </div>
  );
}
