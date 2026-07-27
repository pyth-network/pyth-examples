"use client";

import { useEffect, useState } from "react";

import { getTokenStatus, type TokenStatus } from "@/lib/pythToken";

const ANNOUNCEMENT_URL =
  "https://dev-forum.pyth.network/t/action-required-pyth-pro-history-api-auth-required-starting-july-24/808/2";
const FRONTEND_AUTH_DOCS_URL =
  "https://docs.pyth.network/price-feeds/pro/frontend-auth";

function formatRemaining(expiresAt: string): string {
  const ms = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) {
    return "expired";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Teaches the JWT auth flow these charts use, with a live view of the token
 * cache (expiry countdown, mints this session) so the flow is observable.
 */
export function AuthFlowPanel() {
  const [status, setStatus] = useState<TokenStatus | null>(null);

  useEffect(() => {
    const tick = () => setStatus(getTokenStatus());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  let statusLine = "No JWT minted yet. Waiting for the first chart request.";
  let statusFresh = false;
  if (status && status.expiresAt) {
    statusFresh = status.isFresh;
    const remaining = formatRemaining(status.expiresAt);
    statusLine = status.isFresh
      ? `JWT cached, expires in ${remaining}`
      : `JWT expiring, re-mints on the next request`;
    statusLine += ` · ${status.mintCount} mint${status.mintCount === 1 ? "" : "s"} this session`;
  }

  return (
    <section className="flow">
      <div className="flow__header">
        <h2 className="flow__title">How these charts authenticate</h2>
        <p className="flow__intro">
          The Pyth Pro API key is a long-lived secret that must never reach the
          browser. Instead, the server trades it for short-lived JWTs the charts
          can use safely:
        </p>
        <p className="flow__status">
          <span
            className={`flow__dot ${statusFresh ? "flow__dot--fresh" : ""}`}
          />
          {statusLine}
        </p>
      </div>
      <ol className="flow__steps">
        <li className="flow__step">
          <span className="flow__num">1</span>
          <div className="flow__body">
            <h3>The browser asks the backend for a token</h3>
            <p>
              Charts never touch the API key. They request a JWT from this
              app&apos;s backend and share one cached token.
            </p>
          </div>
        </li>
        <li className="flow__step">
          <span className="flow__num">2</span>
          <div className="flow__body">
            <h3>The backend mints a JWT</h3>
            <p>
              It calls <code>POST /auth/token</code> with the server-held API
              key, the only place the secret is ever used.
            </p>
          </div>
        </li>
        <li className="flow__step">
          <span className="flow__num">3</span>
          <div className="flow__body">
            <h3>The browser calls the Pyth Pro API directly</h3>
            <p>
              Candles are fetched with{" "}
              <code>Authorization: Bearer &lt;jwt&gt;</code>, with no proxy in
              the data path. A leaked JWT dies in minutes.
            </p>
          </div>
        </li>
        <li className="flow__step">
          <span className="flow__num">4</span>
          <div className="flow__body">
            <h3>Tokens rotate automatically</h3>
            <p>
              A new JWT is minted just before expiry (watch the countdown
              above), and any <code>401</code> triggers a re-mint and retry.
            </p>
          </div>
        </li>
      </ol>
      <p className="flow__footer">
        From the{" "}
        <a href={ANNOUNCEMENT_URL} target="_blank" rel="noreferrer">
          announcement
        </a>{" "}
        and{" "}
        <a href={FRONTEND_AUTH_DOCS_URL} target="_blank" rel="noreferrer">
          frontend-auth docs
        </a>
        . The README walks through the code behind each step.
      </p>
    </section>
  );
}
