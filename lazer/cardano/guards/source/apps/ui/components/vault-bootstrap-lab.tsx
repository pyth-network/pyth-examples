"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Shield, Wallet } from "lucide-react";
import {
  buildBootstrapChecklist,
  computeReferenceTargetAda,
  referenceAssetOptions,
  type CustodyMode,
  type VaultBootstrapDraft,
} from "@/lib/vault-lab";
import { runtimeAvailability } from "@/lib/runtime";

interface VaultBootstrapLabProps {
  draft: VaultBootstrapDraft;
  setDraft: Dispatch<SetStateAction<VaultBootstrapDraft>>;
  currentAdaPrice: number;
  currentReferencePrice?: number;
}

const custodyOptions: Array<{
  id: CustodyMode;
  label: string;
  description: string;
  readiness: string;
}> = [
  {
    id: "native",
    label: "Cardano Native",
    description: "Governance and keeper rails managed directly on Cardano.",
    readiness: "Requires CIP-30 / signer wiring",
  },
  {
    id: "squads",
    label: "Squads compatible",
    description: "Cross-chain treasury policy can mirror existing Squads governance.",
    readiness: "Planned for SVM adapter",
  },
  {
    id: "safe",
    label: "Safe compatible",
    description: "Execution policy can map to Safe-controlled governance on EVM.",
    readiness: "Planned for EVM adapter",
  },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-line bg-bg-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent";

export function VaultBootstrapLab({
  draft,
  setDraft,
  currentAdaPrice,
  currentReferencePrice,
}: VaultBootstrapLabProps) {
  const liveReferenceAvailable =
    typeof currentReferencePrice === "number" && Number.isFinite(currentReferencePrice);
  const checklist = buildBootstrapChecklist(draft);
  const readyCount = checklist.filter((item) => item.ready).length;
  const targetAda = computeReferenceTargetAda(
    draft.targetOunces,
    draft.referencePrice,
    currentAdaPrice,
  );

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-sm font-semibold text-text">Vault Bootstrap Lab</h3>
        <p className="mt-1 text-xs text-text-muted">
          Prepare a preprod vault draft, choose custody rails, and generate the
          bootstrap envelope before wiring the real transaction builder.
        </p>
      </div>
      <div className="grid gap-6 p-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company profile">
              <input
                value={draft.companyName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    companyName: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Vault name">
              <input
                value={draft.vaultName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    vaultName: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Vault chain">
              <div className={`${inputClassName} flex items-center justify-between text-text-secondary`}>
                <span>{runtimeAvailability.cardanoNetworkLabel}</span>
                <span className="chip-accent">Cardano</span>
              </div>
            </Field>
            <Field label="Approved route id">
              <input
                value={draft.approvedRouteId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    approvedRouteId: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Governance wallet">
              <input
                value={draft.governanceWallet}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    governanceWallet: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Execution hot wallet">
              <input
                value={draft.executionHotWallet}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    executionHotWallet: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Custody mode</span>
              <span className="chip-yellow">Mainnet unavailable</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {custodyOptions.map((option) => {
                const active = draft.custodyMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        custodyMode: option.id,
                      }))
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-accent bg-accent/8"
                        : "border-line bg-bg-soft hover:border-accent/25"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-text">
                        {option.label}
                      </span>
                      <span className={active ? "chip-accent" : "chip"}>
                        {active ? "Selected" : "Available"}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {option.description}
                    </p>
                    <p className="mt-3 text-xs text-text-muted">
                      {option.readiness}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Protected floor (fiat/stables)">
              <input
                type="number"
                value={draft.portfolioFloorFiat}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    portfolioFloorFiat: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Emergency floor">
              <input
                type="number"
                value={draft.emergencyPortfolioFloorFiat}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    emergencyPortfolioFloorFiat: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Watch / Partial threshold (bps)">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={draft.watchDrawdownBps}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      watchDrawdownBps: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
                <input
                  type="number"
                  value={draft.partialDrawdownBps}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      partialDrawdownBps: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
              </div>
            </Field>
            <Field label="Full exit / Re-entry (bps)">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={draft.fullExitDrawdownBps}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      fullExitDrawdownBps: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
                <input
                  type="number"
                  value={draft.reentryDrawdownBps}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      reentryDrawdownBps: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-bg-soft p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-text">
                  Bootstrap readiness
                </span>
              </div>
              <span className="chip-accent">
                {readyCount}/{checklist.length}
              </span>
            </div>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-line px-3 py-2"
                >
                  <span className="text-sm text-text-secondary">{item.label}</span>
                  <span className={item.ready ? "chip-green" : "chip-yellow"}>
                    {item.ready ? "Ready" : "Needs work"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-bg-soft p-4">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-text">
                Reference target mode
              </span>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                <span className="text-sm text-text-secondary">
                  Keep ADA exposure linked to a reference asset
                </span>
                <input
                  type="checkbox"
                  checked={draft.useReferenceTarget}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      useReferenceTarget: event.target.checked,
                    }))
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Reference symbol">
                  <select
                    value={draft.referenceSymbol}
                    onChange={(event) => {
                      const next = referenceAssetOptions.find(
                        (option) => option.symbol === event.target.value,
                      );
                      setDraft((current) => ({
                        ...current,
                        referenceSymbol: event.target.value,
                        referencePrice: next?.defaultPrice ?? current.referencePrice,
                      }));
                    }}
                    className={inputClassName}
                  >
                    {referenceAssetOptions.map((option) => (
                      <option key={option.symbol} value={option.symbol}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reference price">
                  <input
                    type="number"
                    value={currentReferencePrice ?? draft.referencePrice}
                    disabled={liveReferenceAvailable}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        referencePrice: Number(event.target.value),
                      }))
                    }
                    className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                  />
                </Field>
                <Field label="Target ounces">
                  <input
                    type="number"
                    value={draft.targetOunces}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        targetOunces: Number(event.target.value),
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <div className="space-y-2">
                  <span className="eyebrow">Target ADA at current price</span>
                  <div className="rounded-2xl border border-line bg-panel px-4 py-3">
                    <div className="text-lg font-semibold text-text">
                      {draft.useReferenceTarget ? targetAda.toLocaleString() : "Disabled"}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      Uses {draft.referenceSymbol} (${(currentReferencePrice ?? draft.referencePrice).toFixed(3)}) and ADA (${currentAdaPrice.toFixed(3)}).
                    </p>
                    {liveReferenceAvailable && (
                      <p className="mt-1 text-xs text-accent">
                        Reference price is currently synced from the live Pyth quote.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-bg-soft p-4 text-sm text-text-secondary">
            <p className="font-semibold text-text">Current UI status</p>
            <ul className="mt-3 space-y-2">
              <li>- Wallet connect is not wired yet. Native, Squads, and Safe are modeled here for bootstrap planning only.</li>
              <li>- Policy editing is browser-side and feeds the simulator below.</li>
              <li>- Create-vault from frontend still needs CIP-30 or signer integration plus a real bootstrap tx builder.</li>
              <li>- {runtimeAvailability.warningBody}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
