import {
  baseCapabilities,
  computePositionLiquidValue,
  evaluateRiskLadder,
  type OracleSnapshot,
  type PolicyConfig,
  type RouteSpec,
  type TreasuryState,
} from "@anaconda/core";
import type { TickResult } from "./keeper.js";
import type { AuditEvent } from "./storage.js";

export interface DashboardSeriesPoint {
  label: string;
  stage: TreasuryState["stage"];
  valueFiat: number;
}

export interface DashboardDemoFrame {
  label: string;
  title: string;
  copy: string;
  stage: TreasuryState["stage"];
  valueFiat: number;
  stableRatio: number;
  reason: string;
}

export interface DashboardPayload {
  generatedAtUs: number;
  source: string;
  workspace: {
    name: string;
    label: string;
    chain: string;
    stage: string;
    threshold: string;
    members: string;
    hotWallet: string;
    governanceWallet: string;
    totalBalance: string;
    primaryAsset: string;
    stableAsset: string;
    vaultId: string;
  };
  topbarChips: Array<{
    label: string;
    value: string;
    tone: string;
  }>;
  heroMetrics: Array<{
    label: string;
    value: string;
    copy: string;
    chip?: string;
  }>;
  dashboardCards: Array<{
    label: string;
    value: string;
    copy: string;
    chip: string;
  }>;
  chainCards: Array<{
    chain: string;
    title: string;
    copy: string;
    chip: string;
  }>;
  riskLadder: Array<{
    stage: string;
    title: string;
    copy: string;
    tone?: string;
  }>;
  executionTimeline: Array<{
    title: string;
    copy: string;
    status: string;
  }>;
  auditTrail: Array<{
    title: string;
    copy: string;
    stamp: string;
  }>;
  accounts: Array<{
    label: string;
    address: string;
    balance: string;
    fiatValue: string;
    weight: string;
    role: string;
    bucket: string;
  }>;
  portfolioSeries: Array<{
    label: string;
    stage: string;
    value: number;
    displayValue: string;
  }>;
  demoFrames: Array<{
    label: string;
    title: string;
    copy: string;
    stage: string;
    balance: string;
    stableRatio: string;
    reason: string;
  }>;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatAgeUs(nowUs: number, thenUs: number): string {
  const seconds = Math.max(0, Math.round((nowUs - thenUs) / 1_000_000));
  return `${seconds}s`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function shortAddress(value: string): string {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function stageLabel(stage: TreasuryState["stage"]): string {
  switch (stage) {
    case "normal":
      return "Normal";
    case "watch":
      return "Watch";
    case "partial_derisk":
      return "Partial De-Risk";
    case "full_exit":
      return "Full Stable Exit";
    case "frozen":
      return "Frozen";
  }
}

function stageChip(stage: TreasuryState["stage"]): string {
  switch (stage) {
    case "normal":
      return "ok";
    case "watch":
      return "warn";
    case "partial_derisk":
      return "warn";
    case "full_exit":
      return "danger";
    case "frozen":
      return "danger";
  }
}

function formatAuditCopy(event: AuditEvent): string {
  switch (event.category) {
    case "snapshot": {
      const assetId = typeof event.payload.assetId === "string" ? event.payload.assetId : "asset";
      const snapshotId =
        typeof event.payload.snapshotId === "string" ? event.payload.snapshotId : "unknown snapshot";
      return `Observed ${assetId.toUpperCase()} from ${snapshotId}.`;
    }
    case "intent": {
      const kind = typeof event.payload.kind === "string" ? event.payload.kind.replaceAll("_", " ") : "intent";
      const stage = typeof event.payload.stage === "string" ? event.payload.stage.replaceAll("_", " ") : "n/a";
      return `Authorized ${kind} at stage ${stage}.`;
    }
    case "execution": {
      const sold = typeof event.payload.soldAmount === "number" ? formatAmount(event.payload.soldAmount) : "n/a";
      const bought = typeof event.payload.boughtAmount === "number" ? formatAmount(event.payload.boughtAmount) : "n/a";
      const stage = typeof event.payload.stage === "string" ? event.payload.stage.replaceAll("_", " ") : "n/a";
      return `Settled ${stage}. Sold ${sold} and bought ${bought}.`;
    }
    case "rejection": {
      const code = typeof event.payload.code === "string" ? event.payload.code : "unknown";
      const keeperId = typeof event.payload.keeperId === "string" ? event.payload.keeperId : "keeper";
      return `Rejected with ${code} for ${keeperId}.`;
    }
  }
}

export function buildDashboardPayload(input: {
  treasury: TreasuryState;
  policy: PolicyConfig;
  routes: RouteSpec[];
  snapshots: Record<string, OracleSnapshot>;
  operations: TickResult[];
  events: AuditEvent[];
  nowUs: number;
  portfolioSeries: DashboardSeriesPoint[];
  demoFrames: DashboardDemoFrame[];
}): DashboardPayload {
  const assessment = evaluateRiskLadder(
    input.treasury,
    input.policy,
    input.snapshots,
    input.routes,
    input.nowUs,
  );
  const latestSnapshot = input.snapshots[input.policy.primaryAssetId];
  const route = input.routes.find((candidate) =>
    input.policy.approvedRouteIds.includes(candidate.routeId),
  );
  const topReason = assessment.reasons[0]?.message ?? "Policy is currently inside the safe band.";
  const liveChains = Object.values(baseCapabilities);
  const riskPosition = input.treasury.positions.find((position) => position.role === "risk");
  const stablePosition = input.treasury.positions.find((position) => position.role === "stable");
  const accounts = input.treasury.positions.map((position) => {
    const snapshot = input.snapshots[position.assetId];
    const liquidValue = computePositionLiquidValue(position, snapshot, input.policy);
    const weight =
      assessment.metrics.totalLiquidValueFiat === 0
        ? 0
        : liquidValue / assessment.metrics.totalLiquidValueFiat;
    const wallet =
      position.bucket === "hot" ? input.treasury.executionHotWallet : input.treasury.governanceWallet;

    return {
      label: `${position.symbol} ${position.role === "risk" ? "risk bucket" : "stable reserve"}`,
      address: shortAddress(wallet),
      balance: `${formatAmount(position.amount)} ${position.symbol}`,
      fiatValue: formatUsd(liquidValue),
      weight: formatPercent(weight),
      role: position.role === "risk" ? "Risk asset" : "Stable reserve",
      bucket: position.bucket === "hot" ? "Execution hot" : "Governance cold",
    };
  });

  return {
    generatedAtUs: input.nowUs,
    source: "backend-demo",
    workspace: {
      name: input.treasury.name,
      label: "guards.one live desk",
      chain: "Cardano preprod",
      stage: stageLabel(input.treasury.stage),
      threshold: `${input.treasury.governanceSigners.length} governance signers`,
      members: `${input.treasury.riskManagers.length} risk manager · ${input.treasury.keepers.length} keepers`,
      hotWallet: shortAddress(input.treasury.executionHotWallet),
      governanceWallet: shortAddress(input.treasury.governanceWallet),
      totalBalance: formatUsd(assessment.metrics.totalLiquidValueFiat),
      primaryAsset: riskPosition?.symbol ?? input.policy.primaryAssetId.toUpperCase(),
      stableAsset: stablePosition?.symbol ?? input.policy.stableAssetId.toUpperCase(),
      vaultId: input.treasury.vaultId,
    },
    topbarChips: [
      {
        label: "Network status",
        value: "Cardano preprod live",
        tone: "live",
      },
      {
        label: "Approved route",
        value: route ? `${route.venue} · ${route.toAssetId.toUpperCase()}` : "No route",
        tone: route?.live ? "neutral" : "warn",
      },
      {
        label: "Execution wallet",
        value: shortAddress(input.treasury.executionHotWallet),
        tone: "neutral",
      },
    ],
    heroMetrics: [
      {
        label: "Current stage",
        value: stageLabel(input.treasury.stage),
        copy: "Final policy state after the simulated breach and recovery run.",
        chip: stageChip(input.treasury.stage),
      },
      {
        label: "Treasury liquid value",
        value: formatUsd(assessment.metrics.totalLiquidValueFiat),
        copy: "Valued from the latest Pyth price and haircut-aware liquid value math.",
      },
      {
        label: "Stable protection",
        value: formatPercent(assessment.metrics.stableRatio),
        copy: "Current treasury share parked in the approved stable reserve.",
      },
      {
        label: "Oracle freshness",
        value: latestSnapshot
          ? formatAgeUs(input.nowUs, latestSnapshot.feedUpdateTimestampUs)
          : "missing",
        copy: "Age of the primary feed update relative to the latest policy evaluation.",
      },
    ],
    dashboardCards: [
      {
        label: "Protected floor",
        value: formatUsd(input.policy.portfolioFloorFiat),
        copy: "Minimum fiat-equivalent value the policy tries to keep defended at all times.",
        chip: "ok",
      },
      {
        label: "Emergency floor",
        value: formatUsd(input.policy.emergencyPortfolioFloorFiat),
        copy: "Crossing this floor escalates the vault into a full stable exit or freeze path.",
        chip: "danger",
      },
      {
        label: "Primary reason",
        value: topReason,
        copy: "Top reason emitted by the risk engine for the current snapshot set.",
        chip: assessment.reasons.length > 0 ? "warn" : "ok",
      },
      {
        label: "Execution policy",
        value: route
          ? `${route.chainId.toUpperCase()} · ${route.venue} · ${route.toAssetId.toUpperCase()}`
          : "No approved route",
        copy: "Only allowlisted routes can spend from the execution hot wallet.",
        chip: route?.live ? "ok" : "warn",
      },
    ],
    chainCards: liveChains.map((capability) => ({
      chain: capability.chainId.toUpperCase(),
      title: capability.live ? "Live execution surface" : "Scaffolded adapter",
      copy: capability.notes.join(" "),
      chip: capability.live ? "live" : "scaffold",
    })),
    riskLadder: [
      {
        stage: "Normal",
        title: "Operate with full permissions",
        copy: "Fresh oracle, healthy confidence, and no forced action path active.",
      },
      {
        stage: "Watch",
        title: "Increase monitoring",
        copy: "The drawdown or fiat floor approaches the first trigger band.",
        tone: "partial",
      },
      {
        stage: "Partial De-Risk",
        title: "Sell only what restores the safe floor",
        copy: "The keeper sells a bounded slice of the risky bucket into the approved stable route.",
        tone: "partial",
      },
      {
        stage: "Full Stable Exit",
        title: "Move the vault fully defensive",
        copy: "A deeper breach exits the risk bucket and keeps the hot wallet on one stable rail.",
        tone: "full",
      },
      {
        stage: "Auto Re-entry",
        title: "Re-risk only after hysteresis clears",
        copy: "Recovery must clear a separate band and cooldown before exposure comes back.",
        tone: "reentry",
      },
    ],
    executionTimeline: input.operations.map((operation, index) => ({
      title: `Step ${index + 1} · ${stageLabel(operation.stage)}`,
      copy: operation.rejected
        ? `Execution rejected with ${operation.rejected}.`
        : `Intent ${operation.intentId ?? "n/a"} anchored and settled in tx ${operation.txHash ?? "n/a"}.`,
      status: operation.rejected ? "rejected" : "executed",
    })),
    auditTrail: input.events.slice(-6).map((event) => ({
      title: `${event.category.toUpperCase()} · ${event.eventId}`,
      copy: formatAuditCopy(event),
      stamp: formatAgeUs(input.nowUs, event.createdAtUs),
    })),
    accounts,
    portfolioSeries: input.portfolioSeries.map((point) => ({
      label: point.label,
      stage: point.stage,
      value: point.valueFiat,
      displayValue: formatUsd(point.valueFiat),
    })),
    demoFrames: input.demoFrames.map((frame) => ({
      label: frame.label,
      title: frame.title,
      copy: frame.copy,
      stage: frame.stage,
      balance: formatUsd(frame.valueFiat),
      stableRatio: formatPercent(frame.stableRatio),
      reason: frame.reason,
    })),
  };
}
