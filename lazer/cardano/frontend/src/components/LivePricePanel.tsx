import { formatAdaUsd, formatDateTime } from '../utils/format';

interface LivePricePanelProps {
  adaUsd: number | null;
  isLoading: boolean;
  error: string | null;
  updatedAt: Date | null;
  onRefresh: () => Promise<void>;
}

export function LivePricePanel({
  adaUsd,
  isLoading,
  error,
  updatedAt,
  onRefresh,
}: LivePricePanelProps): JSX.Element {
  const statusText = error
    ? error
    : updatedAt
      ? `Last update: ${formatDateTime(updatedAt.toISOString())}`
      : 'Waiting for first quote...';

  return (
    <section className="panel live-price-panel">
      <header className="panel__header">
        <h2>Live ADA/USD</h2>
        <span className="source-tag">Pyth Pro · Feed 16</span>
      </header>
      <p className="live-price-value">{adaUsd ? formatAdaUsd(adaUsd) : '--'}</p>
      <p className={`muted ${error ? 'negative' : ''}`}>{statusText}</p>
      <button className="button live-price-refresh" type="button" onClick={() => void onRefresh()}>
        {isLoading ? 'Loading...' : 'Refresh now'}
      </button>
    </section>
  );
}
