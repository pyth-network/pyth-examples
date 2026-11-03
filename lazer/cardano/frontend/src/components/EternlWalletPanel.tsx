import type { EternlWalletState } from '../types/wallet';

interface EternlWalletPanelProps {
  wallet: EternlWalletState;
  compact?: boolean;
}

function shortHex(value: string, keep = 10): string {
  if (value.length <= keep * 2) {
    return value;
  }
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

export function EternlWalletPanel({ wallet, compact = false }: EternlWalletPanelProps): JSX.Element {
  return (
    <section
      className={`panel wallet-panel ${compact ? 'wallet-panel--compact panel--utility' : ''}`.trim()}
    >
      <header className="wallet-panel__header">
        <div className="wallet-panel__title">
          {wallet.walletIcon ? (
            <img src={wallet.walletIcon} alt={wallet.walletName} className="wallet-icon" />
          ) : null}
          <h2>{compact ? 'Eternl' : wallet.walletName}</h2>
        </div>
        <span className={`status-pill ${wallet.isConnected ? 'status-pill--ok' : ''}`}>
          {wallet.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </header>

      {!wallet.isInstalled ? (
        <p className="muted">
          {compact
            ? 'Eternl not detected.'
            : 'Eternl wallet not detected. Install the browser extension and reload this page.'}
        </p>
      ) : null}

      {wallet.isInstalled && wallet.isConnected ? (
        <div className="wallet-meta">
          <div className="wallet-meta__item">
            <span>Network</span>
            <strong>{wallet.networkName}</strong>
          </div>
          <div className="wallet-meta__item">
            <span>Address (hex)</span>
            <strong>{wallet.primaryAddressHex ? shortHex(wallet.primaryAddressHex) : '--'}</strong>
          </div>
        </div>
      ) : null}

      {wallet.error ? (
        <p className="error-text">{compact ? 'Wallet connection failed.' : wallet.error}</p>
      ) : null}

      <div className="wallet-actions">
        {wallet.isConnected ? (
          <button
            type="button"
            className={`button ${compact ? 'button--tertiary' : 'button--secondary'}`}
            onClick={wallet.disconnect}
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className={`button ${compact ? 'button--tertiary' : 'button--primary'}`}
            onClick={() => void wallet.connect()}
            disabled={!wallet.isInstalled || wallet.isConnecting}
          >
            {wallet.isConnecting ? 'Connecting...' : compact ? 'Connect' : 'Connect Eternl'}
          </button>
        )}
      </div>
    </section>
  );
}
