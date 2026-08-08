import type { PaymentRequest, Role } from '../types/payment';
import { formatAda, formatDate, formatUsd } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface RequestCardProps {
  request: PaymentRequest;
  role: Role;
  adaUsd: number;
  onClaim?: (id: string) => void | Promise<void>;
  onCancel?: (id: string) => void;
}

export function RequestCard({
  request,
  role,
  adaUsd,
  onClaim,
  onCancel,
}: RequestCardProps): JSX.Element {
  const currentRequiredAda = request.usdAmount / adaUsd;
  const isClaimable = request.status === 'ready_to_claim';
  const isCancelable = request.status === 'created' || request.status === 'ready_to_claim';
  const isUnderfundedNow = request.lockAda < currentRequiredAda;

  return (
    <article className="request-card">
      <header className="request-card__header">
        <div>
          <h3>{request.description}</h3>
          <p className="muted">
            Request #{request.id.slice(-4)} • Due {formatDate(request.dueDate)}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </header>

      <div className="request-card__grid">
        <div>
          <span className="meta-label">Amount</span>
          <strong>{formatUsd(request.usdAmount)}</strong>
        </div>
        <div>
          <span className="meta-label">Locked</span>
          <strong>{formatAda(request.lockAda)}</strong>
        </div>
        <div>
          <span className="meta-label">Current required</span>
          <strong>{formatAda(currentRequiredAda)}</strong>
        </div>
        <div>
          <span className="meta-label">Sponsor</span>
          <strong>{request.sponsorLabel}</strong>
        </div>
      </div>

      {isUnderfundedNow && isClaimable ? (
        <p className="warning-text">
          Warning: if claimed now, all locked ADA will be sent and there will be a shortfall.
        </p>
      ) : null}

      {role === 'applicant' && isClaimable ? (
        <button className="button button--primary" type="button" onClick={() => onClaim?.(request.id)}>
          Claim now
        </button>
      ) : null}
      {role === 'sponsor' && isCancelable ? (
        <button
          className="button button--secondary"
          type="button"
          onClick={() => onCancel?.(request.id)}
        >
          Cancel request
        </button>
      ) : null}

      {request.settlement ? (
        <section className="settlement-result">
          <h4>Settlement result</h4>
          <p>
            Sent to user: <strong>{formatAda(request.settlement.sentAda)}</strong>
          </p>
          {request.settlement.wasUnderfunded ? (
            <p>
              Underfunded claim. Locked collateral fully sent. Shortfall:{' '}
              <strong>{formatUsd(request.settlement.shortfallUsd)}</strong>
            </p>
          ) : (
            <p>
              Returned to sponsor: <strong>{formatAda(request.settlement.sponsorChangeAda)}</strong>
            </p>
          )}
          <p className="muted">Executed with ADA/USD {request.settlement.executedAdaUsd.toFixed(2)}</p>
        </section>
      ) : null}

      {request.lockTxId || request.unlockTxId || request.cancelTxId ? (
        <section className="tx-meta">
          {request.lockTxId ? (
            <p className="muted">
              Lock tx: <code>{request.lockTxId}</code>
            </p>
          ) : null}
          {request.unlockTxId ? (
            <p className="muted">
              Claim tx: <code>{request.unlockTxId}</code>
            </p>
          ) : null}
          {request.cancelTxId ? (
            <p className="muted">
              Cancel tx: <code>{request.cancelTxId}</code>
            </p>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
