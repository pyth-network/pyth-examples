"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRightLeft } from "lucide-react";
import { getStageAppearance } from "@/lib/stage";
import {
  runScenario,
  scenarioPresets,
  type ScenarioDraft,
  type VaultBootstrapDraft,
} from "@/lib/vault-lab";

interface ScenarioLabProps {
  draft: VaultBootstrapDraft;
}

const inputClassName =
  "w-full rounded-2xl border border-line bg-bg-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent";

function labelFromStage(stage: ScenarioDraft["startingStage"]) {
  return stage.replace(/_/g, " ");
}

export function ScenarioLab({ draft }: ScenarioLabProps) {
  const [scenario, setScenario] = useState<ScenarioDraft>(scenarioPresets[0].draft);

  const result = useMemo(() => runScenario(scenario, draft), [scenario, draft]);
  const appearance = getStageAppearance(result.assessment.nextStage);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-sm font-semibold text-text">Scenario Lab</h3>
        <p className="mt-1 text-xs text-text-muted">
          Drive the browser-side policy lab with custom prices, cooldown, and treasury balances
          to inspect simulated stage transitions and intended actions.
        </p>
      </div>
      <div className="grid gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {scenarioPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setScenario(preset.draft)}
                className={`rounded-2xl border p-4 text-left transition ${
                  scenario.presetId === preset.id
                    ? "border-accent bg-accent/8"
                    : "border-line bg-bg-soft hover:border-accent/25"
                }`}
              >
                <p className="text-sm font-semibold text-text">{preset.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-muted">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="eyebrow">Starting stage</span>
              <select
                value={scenario.startingStage}
                onChange={(event) =>
                  setScenario((current) => ({
                    ...current,
                    startingStage: event.target.value as ScenarioDraft["startingStage"],
                  }))
                }
                className={inputClassName}
              >
                <option value="normal">normal</option>
                <option value="watch">watch</option>
                <option value="partial_derisk">partial_derisk</option>
                <option value="full_exit">full_exit</option>
                <option value="frozen">frozen</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="eyebrow">Seconds since update</span>
              <input
                type="number"
                value={scenario.secondsSinceUpdate}
                onChange={(event) =>
                  setScenario((current) => ({
                    ...current,
                    secondsSinceUpdate: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="eyebrow">Seconds since last transition</span>
              <input
                type="number"
                value={scenario.secondsSinceLastTransition}
                onChange={(event) =>
                  setScenario((current) => ({
                    ...current,
                    secondsSinceLastTransition: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="eyebrow">ADA price / EMA</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.001"
                  value={scenario.adaPrice}
                  onChange={(event) =>
                    setScenario((current) => ({
                      ...current,
                      adaPrice: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
                <input
                  type="number"
                  step="0.001"
                  value={scenario.adaEmaPrice}
                  onChange={(event) =>
                    setScenario((current) => ({
                      ...current,
                      adaEmaPrice: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className="eyebrow">Confidence / Stable price</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.0001"
                  value={scenario.adaConfidence}
                  onChange={(event) =>
                    setScenario((current) => ({
                      ...current,
                      adaConfidence: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
                <input
                  type="number"
                  step="0.0001"
                  value={scenario.stablePrice}
                  onChange={(event) =>
                    setScenario((current) => ({
                      ...current,
                      stablePrice: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className="eyebrow">ADA amount</span>
              <input
                type="number"
                value={scenario.adaAmount}
                onChange={(event) =>
                  setScenario((current) => ({
                    ...current,
                    adaAmount: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="eyebrow">Stable amount</span>
              <input
                type="number"
                value={scenario.stableAmount}
                onChange={(event) =>
                  setScenario((current) => ({
                    ...current,
                    stableAmount: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="eyebrow">Reference asset price ({draft.referenceSymbol})</span>
              <input
                type="number"
                value={scenario.xauUsd}
                onChange={(event) =>
                  setScenario((current) => ({
                    ...current,
                    xauUsd: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-bg-soft p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-text">
                  Engine output
                </span>
              </div>
              <span className={appearance.chipClass}>{appearance.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Current stage</p>
                <p className="mt-2 text-sm font-semibold capitalize text-text">
                  {labelFromStage(scenario.startingStage)}
                </p>
              </div>
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Next stage</p>
                <p className="mt-2 text-sm font-semibold capitalize text-text">
                  {appearance.label}
                </p>
              </div>
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Liquid value</p>
                <p className="mt-2 text-sm font-semibold text-text">
                  ${result.assessment.metrics.totalLiquidValueFiat.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Drawdown</p>
                <p className="mt-2 text-sm font-semibold text-text">
                  {result.assessment.metrics.drawdownBps.toFixed(0)} bps
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-bg-soft p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-text">
                Intended action
              </span>
            </div>
            {result.assessment.intent ? (
              <div className="space-y-3 text-sm text-text-secondary">
                <p>
                  {result.assessment.intent.kind} via{" "}
                  <span className="font-mono text-text">
                    {result.assessment.intent.routeId}
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line px-3 py-3">
                    <p className="eyebrow">Max sell</p>
                    <p className="mt-2 font-semibold text-text">
                      {result.assessment.intent.maxSellAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line px-3 py-3">
                    <p className="eyebrow">Min buy</p>
                    <p className="mt-2 font-semibold text-text">
                      {result.assessment.intent.minBuyAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                No swap intent is created in this state. The engine is watching,
                frozen, or waiting for another condition.
              </p>
            )}
          </div>

          {draft.useReferenceTarget && (
            <div className="rounded-2xl border border-line bg-bg-soft p-4">
              <p className="eyebrow">Reference target</p>
              <p className="mt-2 text-lg font-semibold text-text">
                {result.referenceTargetAda.toLocaleString()} ADA
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Equivalent to {draft.targetOunces} oz of {draft.referenceSymbol} at ${scenario.xauUsd}.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-bg-soft p-4">
            <p className="mb-3 text-sm font-semibold text-text">Reasons</p>
            <div className="space-y-2">
              {result.assessment.reasons.map((reason) => (
                <div
                  key={reason.code}
                  className="rounded-xl border border-line px-3 py-3 text-sm text-text-secondary"
                >
                  <p className="font-medium text-text">{reason.message}</p>
                  <p className="mt-1 font-mono text-xs text-text-muted">
                    {reason.code}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
