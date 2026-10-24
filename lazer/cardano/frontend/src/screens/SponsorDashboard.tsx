import { RequestList } from '../components/RequestList';
import type { PaymentRequest } from '../types/payment';
import { formatAda, formatUsd } from '../utils/format';

interface SponsorDashboardProps {
  requests: PaymentRequest[];
  adaUsd: number;
  onCancel: (requestId: string) => void;
}

export function SponsorDashboard({ requests, adaUsd, onCancel }: SponsorDashboardProps): JSX.Element {
  const openRequests = requests.filter(
    (request) => request.status !== 'claimed' && request.status !== 'cancelled',
  );
  const totalLockedOpen = openRequests.reduce((sum, request) => sum + request.lockAda, 0);
  const requiredNowOpen = openRequests.reduce((sum, request) => sum + request.usdAmount / adaUsd, 0);
  const coverageBuffer = totalLockedOpen - requiredNowOpen;
  const openUsdLiability = openRequests.reduce((sum, request) => sum + request.usdAmount, 0);

  return (
    <div className="dashboard-grid dashboard-grid--single">
      <section className="panel summary-panel">
        <header className="panel__header">
          <h2>Sponsor Summary</h2>
        </header>
        <div className="summary-grid">
          <div className="metric-card">
            <span>Open USD liability</span>
            <strong>{formatUsd(openUsdLiability)}</strong>
          </div>
          <div className="metric-card">
            <span>Total locked ADA</span>
            <strong>{formatAda(totalLockedOpen)}</strong>
          </div>
          <div className="metric-card">
            <span>Required ADA now</span>
            <strong>{formatAda(requiredNowOpen)}</strong>
          </div>
          <div className="metric-card">
            <span>Coverage buffer</span>
            <strong className={coverageBuffer >= 0 ? 'positive' : 'negative'}>
              {formatAda(coverageBuffer)}
            </strong>
          </div>
        </div>
      </section>

      <RequestList
        title="Funded requests"
        items={requests}
        role="sponsor"
        adaUsd={adaUsd}
        emptyText="No requests available."
        onCancel={onCancel}
      />
    </div>
  );
}
