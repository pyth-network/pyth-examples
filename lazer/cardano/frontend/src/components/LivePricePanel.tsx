import { formatAdaUsd, formatDateTime } from '../utils/format';

interface LivePricePanelProps {
  adaUsd: number | null;
  isLoading: boolean;
  error: string | null;
  updatedAt: Date | null;
  onRefresh: () => Promise<void>;
  compact?: boolean;
}

export function LivePricePanel({
  adaUsd,
  isLoading,
  error,
  updatedAt,
  onRefresh,
  compact = false,
}: LivePricePanelProps): JSX.Element {
  const statusText = isLoading
    ? 'Refreshing ADA/USD...'
    : error
    ? compact
      ? 'Price unavailable'
      : error
    : updatedAt
      ? compact
        ? `Updated ${formatDateTime(updatedAt.toISOString())}`
        : `Last update: ${formatDateTime(updatedAt.toISOString())}`
      : 'Waiting for first quote...';

  return (
    <section
      className={`panel live-price-panel ${compact ? 'live-price-panel--compact panel--utility' : ''} ${isLoading ? 'live-price-panel--loading' : ''}`.trim()}
    >
      <header className="panel__header live-price-header">
        <h2>{compact ? 'ADA/USD' : 'Live ADA/USD'}</h2>
        <button
          type="button"
          className={`panel-icon-button ${isLoading ? 'is-loading' : ''}`.trim()}
          onClick={() => void onRefresh()}
          aria-label="Refresh ADA/USD quote"
          title="Refresh quote"
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12a9 9 0 0 1 15.36-6.36" />
            <polyline points="19 3 18.36 7.64 13.72 7" />
            <path d="M21 12a9 9 0 0 1-15.36 6.36" />
            <polyline points="5 21 5.64 16.36 10.28 17" />
          </svg>
        </button>
      </header>
      <p className="live-price-value">{adaUsd ? formatAdaUsd(adaUsd) : '--'}</p>
      <p className={`muted ${error ? 'negative' : ''} ${isLoading ? 'loading-text' : ''}`}>{statusText}</p>
    </section>
  );
}
