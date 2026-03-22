import { useEffect, useMemo, useState } from 'react';
import { createRequestApi, fetchRequestsApi } from './api/requests';
import { EternlWalletPanel } from './components/EternlWalletPanel';
import { LivePricePanel } from './components/LivePricePanel';
import { RoleSwitcher } from './components/RoleSwitcher';
import { createSeedRequests } from './data/seed';
import { useEternlWallet } from './hooks/useEternlWallet';
import { usePythAdaUsdPrice } from './hooks/usePythAdaUsdPrice';
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
import { executeSettlement } from './utils/settlement';

const COVERAGE_MULTIPLIER = 2;
const INITIAL_ADA_USD = 0.65;
const REQUIRED_NETWORK_ID = 0;

function countByStatus(requests: PaymentRequest[], status: RequestStatus): number {
  return requests.filter((request) => request.status === status).length;
}

export default function App(): JSX.Element {
  const [role, setRole] = useState<Role>('user');
  const [filter, setFilter] = useState<RequestFilter>('all');
  const wallet = useEternlWallet();
  const {
    adaUsd,
    isLoading: isPriceLoading,
    error: priceError,
    updatedAt,
    refreshNow,
  } = usePythAdaUsdPrice();
  const [requests, setRequests] = useState<PaymentRequest[]>(() => createSeedRequests(INITIAL_ADA_USD));
  const [isCreating, setIsCreating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const isRequiredNetwork = wallet.networkId === REQUIRED_NETWORK_ID;
  const canUseApp = wallet.isConnected && isRequiredNetwork;
  const canSettle = canUseApp && adaUsd !== null;

  useEffect(() => {
    let isSubscribed = true;

    const loadRequests = async (): Promise<void> => {
      try {
        const persistedRequests = await fetchRequestsApi();
        if (!isSubscribed || persistedRequests.length === 0) {
          return;
        }
        setRequests(persistedRequests);
      } catch (loadError) {
        if (!isSubscribed) {
          return;
        }
        setApiError(
          loadError instanceof Error
            ? `Could not load persisted requests: ${loadError.message}`
            : 'Could not load persisted requests.',
        );
      }
    };

    void loadRequests();

    return () => {
      isSubscribed = false;
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

  const handleCreate = async (payload: CreateRequestPayload): Promise<void> => {
    if (!adaUsd || !canUseApp) {
      throw new Error('Connect Eternl on Preprod with a live ADA/USD price before creating.');
    }
    if (!wallet.primaryAddressHex) {
      throw new Error('Eternl did not provide a primary address to create the lock transaction.');
    }

    setIsCreating(true);
    setApiError(null);

    try {
      const { request } = await createRequestApi({
        requesterAddressHex: wallet.primaryAddressHex,
        usdAmount: payload.usdAmount,
        description: payload.description,
        dueDate: payload.dueDate,
        adaUsd,
        coverageMultiplier: COVERAGE_MULTIPLIER,
      });

      setRequests((prev) => [request, ...prev]);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : 'Could not create request.';
      setApiError(message);
      throw new Error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClaim = (requestId: string): void => {
    if (!adaUsd || !canUseApp) {
      return;
    }
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
          <div className="hero-intro">
            <p className="eyebrow">Proof of Pyth</p>
            <h1>Pay With Pyth on Cardano</h1>
            <p className="hero-copy">
              A visual prototype where payment requests are quoted in USD, locked in ADA, and
              settled with live ADA/USD updates from Pyth Pro at claim time.
            </p>
          </div>
          <div className="hero-controls">
            {canUseApp ? (
              <div className="hero-controls__top">
                <RoleSwitcher value={role} onChange={setRole} />
              </div>
            ) : null}
            <div className="hero-controls__grid hero-controls__grid--utility">
              <EternlWalletPanel wallet={wallet} compact />
              <LivePricePanel
                adaUsd={adaUsd}
                isLoading={isPriceLoading}
                error={priceError}
                updatedAt={updatedAt}
                onRefresh={refreshNow}
                compact
              />
            </div>
          </div>
        </header>

        {!wallet.isConnected ? (
          <section className="panel">
            <h2>Connect Eternl to continue</h2>
            <p className="muted">Login is required before creating and claiming payment requests.</p>
          </section>
        ) : !isRequiredNetwork ? (
          <section className="panel">
            <h2>Wrong network selected</h2>
            <p className="muted">
              This dApp is configured for <strong>Preprod</strong>. Please switch Eternl from
              Mainnet to Preprod/Testnet and reconnect.
            </p>
          </section>
        ) : !canSettle ? (
          <section className="panel">
            <h2>Live price unavailable</h2>
            <p className="muted">
              Waiting for Pyth Pro ADA/USD quote. Configure <code>VITE_PYTH_LAZER_TOKEN</code> and
              click refresh.
            </p>
          </section>
        ) : (
          <>
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
                isCreating={isCreating}
              />
            ) : (
              <SponsorDashboard requests={requests} adaUsd={adaUsd} />
            )}
            {apiError ? <p className="error-text">{apiError}</p> : null}
          </>
        )}
      </main>
    </div>
  );
}
