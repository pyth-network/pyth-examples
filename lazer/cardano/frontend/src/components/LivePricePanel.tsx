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
  const statusText = error
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
      className={`panel live-price-panel ${compact ? 'live-price-panel--compact panel--utility' : ''}`.trim()}
    >
      <header className="panel__header live-price-header">
        <h2>{compact ? 'ADA/USD' : 'Live ADA/USD'}</h2>
        <button
          type="button"
          className={`panel-icon-button ${isLoading ? 'is-loading' : ''}`.trim()}
          onClick={() => void onRefresh()}
          aria-label="Refresh ADA/USD quote"
          title="Refresh quote"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
            <polyline points="20 4 20 10 14 10" />
          </svg>
        </button>
      </header>
      <p className="live-price-value">{adaUsd ? formatAdaUsd(adaUsd) : '--'}</p>
      <p className={`muted ${error ? 'negative' : ''}`}>{statusText}</p>
    </section>
  );
}
