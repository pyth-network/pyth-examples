import type { EternlWalletState } from '../types/wallet';

interface EternlWalletPanelProps {
  wallet: EternlWalletState;
}

function shortHex(value: string, keep = 10): string {
  if (value.length <= keep * 2) {
    return value;
  }
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

export function EternlWalletPanel({ wallet }: EternlWalletPanelProps): JSX.Element {
  return (
    <section className="panel wallet-panel">
      <header className="wallet-panel__header">
        <div className="wallet-panel__title">
          {wallet.walletIcon ? (
            <img src={wallet.walletIcon} alt={wallet.walletName} className="wallet-icon" />
          ) : null}
          <h2>{wallet.walletName}</h2>
        </div>
        <span className={`status-pill ${wallet.isConnected ? 'status-pill--ok' : ''}`}>
          {wallet.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </header>

      {!wallet.isInstalled ? (
        <p className="muted">
          Eternl wallet not detected. Install the browser extension and reload this page.
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

      {wallet.error ? <p className="error-text">{wallet.error}</p> : null}

      <div className="wallet-actions">
        {wallet.isConnected ? (
          <button type="button" className="button button--secondary" onClick={wallet.disconnect}>
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="button button--primary"
            onClick={() => void wallet.connect()}
            disabled={!wallet.isInstalled || wallet.isConnecting}
          >
            {wallet.isConnecting ? 'Connecting...' : 'Connect Eternl'}
          </button>
        )}
      </div>
    </section>
  );
}
