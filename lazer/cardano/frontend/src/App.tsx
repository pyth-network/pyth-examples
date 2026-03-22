import { useEffect, useMemo, useRef, useState } from 'react';
import { PricePanel } from './components/PricePanel';
import { RoleSwitcher } from './components/RoleSwitcher';
import { createSeedRequests } from './data/seed';
import { SponsorDashboard } from './screens/SponsorDashboard';
import { UserDashboard } from './screens/UserDashboard';
import type {
  CreateRequestPayload,
  PaymentRequest,
  RequestFilter,
  RequestStatus,
  Role,
} from './types/payment';
import { formatAda, formatUsd } from './utils/format';
import { computeLockAda, executeSettlement } from './utils/settlement';

const COVERAGE_MULTIPLIER = 2;
const INITIAL_ADA_USD = 0.65;

function countByStatus(requests: PaymentRequest[], status: RequestStatus): number {
  return requests.filter((request) => request.status === status).length;
}

export default function App(): JSX.Element {
  const [role, setRole] = useState<Role>('user');
  const [filter, setFilter] = useState<RequestFilter>('all');
  const [adaUsd, setAdaUsd] = useState(INITIAL_ADA_USD);
  const [requests, setRequests] = useState<PaymentRequest[]>(() => createSeedRequests(INITIAL_ADA_USD));
  const pendingReadyTimers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      pendingReadyTimers.current.forEach((timerId) => window.clearTimeout(timerId));
      pendingReadyTimers.current = [];
    };
  }, []);

  const claimableUsd = useMemo(
    () =>
      requests
        .filter((request) => request.status === 'ready_to_claim')
        .reduce((sum, request) => sum + request.usdAmount, 0),
    [requests],
  );

  const lockedAda = useMemo(
    () =>
      requests
        .filter((request) => request.status !== 'claimed')
        .reduce((sum, request) => sum + request.lockAda, 0),
    [requests],
  );

  const handleCreate = (payload: CreateRequestPayload): void => {
    const requestId = `request-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`;
    const nowIso = new Date().toISOString();
    const lockAda = computeLockAda(payload.usdAmount, adaUsd, COVERAGE_MULTIPLIER);

    const newRequest: PaymentRequest = {
      id: requestId,
      usdAmount: payload.usdAmount,
      description: payload.description,
      dueDate: payload.dueDate,
      createdAt: nowIso,
      lockAda,
      status: 'created',
      beneficiaryLabel: 'You',
      sponsorLabel: 'Sponsor Wallet A',
    };

    setRequests((prev) => [newRequest, ...prev]);

    const timerId = window.setTimeout(() => {
      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, status: 'ready_to_claim' } : request,
        ),
      );
    }, 800);
    pendingReadyTimers.current.push(timerId);
  };

  const handleClaim = (requestId: string): void => {
    setRequests((prev) =>
      prev.map((request) => {
        if (request.id !== requestId || request.status !== 'ready_to_claim') {
          return request;
        }
        return {
          ...request,
          status: 'claimed',
          settlement: executeSettlement(request, adaUsd),
        };
      }),
    );
  };

  return (
    <div className="app-root">
      <main className="app-shell">
        <header className="hero panel">
          <div>
            <p className="eyebrow">Proof of Pyth</p>
            <h1>Pay With Pyth on Cardano</h1>
            <p className="hero-copy">
              A visual prototype where payment requests are quoted in USD, locked in ADA, and
              settled with an oracle-driven ADA/USD price at claim time.
            </p>
          </div>
          <div className="hero-controls">
            <RoleSwitcher value={role} onChange={setRole} />
            <PricePanel value={adaUsd} onChange={setAdaUsd} />
          </div>
        </header>

        <section className="top-metrics">
          <article className="metric-card">
            <span>Total requests</span>
            <strong>{requests.length}</strong>
          </article>
          <article className="metric-card">
            <span>Ready to claim</span>
            <strong>{countByStatus(requests, 'ready_to_claim')}</strong>
          </article>
          <article className="metric-card">
            <span>Claimable value</span>
            <strong>{formatUsd(claimableUsd)}</strong>
          </article>
          <article className="metric-card">
            <span>Open locked collateral</span>
            <strong>{formatAda(lockedAda)}</strong>
          </article>
        </section>

        {role === 'user' ? (
          <UserDashboard
            requests={requests}
            filter={filter}
            adaUsd={adaUsd}
            coverageMultiplier={COVERAGE_MULTIPLIER}
            onFilterChange={setFilter}
            onCreate={handleCreate}
            onClaim={handleClaim}
          />
        ) : (
          <SponsorDashboard requests={requests} adaUsd={adaUsd} />
        )}
      </main>
    </div>
  );
}
