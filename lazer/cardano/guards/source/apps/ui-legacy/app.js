const fallbackState = {
  source: "static-fallback",
  workspace: {
    name: "Anaconda Treasury Demo",
    label: "guards.one live desk",
    chain: "Cardano preprod",
    stage: "Normal",
    threshold: "3 governance signers",
    members: "1 risk manager · 2 keepers",
    hotWallet: "addr_test...hot_1",
    governanceWallet: "addr_test...gov_1",
    totalBalance: "$6,646",
    primaryAsset: "ADA",
    stableAsset: "USDM",
    vaultId: "vault-anaconda-demo",
  },
  topbarChips: [
    { label: "Network status", value: "Cardano preprod live", tone: "live" },
    { label: "Approved route", value: "Minswap · USDM", tone: "neutral" },
    { label: "Execution wallet", value: "addr_tes...hot_1", tone: "neutral" },
  ],
  heroMetrics: [
    {
      label: "Current stage",
      value: "Normal",
      copy: "Final policy state after the simulated breach and recovery run.",
      chip: "ok",
    },
    {
      label: "Treasury liquid value",
      value: "$6,646",
      copy: "Valued from the latest Pyth price and haircut-aware liquid value math.",
    },
    {
      label: "Stable protection",
      value: "36.0%",
      copy: "Current treasury share parked in the approved stable reserve.",
    },
    {
      label: "Oracle freshness",
      value: "20s",
      copy: "Age of the primary feed update relative to the latest policy evaluation.",
    },
  ],
  dashboardCards: [
    {
      label: "Protected floor",
      value: "$4,500",
      copy: "Minimum fiat-equivalent value the policy tries to keep defended at all times.",
      chip: "ok",
    },
    {
      label: "Emergency floor",
      value: "$3,400",
      copy: "Crossing this floor escalates the vault into a full stable exit or freeze path.",
      chip: "danger",
    },
    {
      label: "Primary reason",
      value: "Cooldown prevents an automatic state transition",
      copy: "Top reason emitted by the risk engine for the current snapshot set.",
      chip: "warn",
    },
    {
      label: "Execution policy",
      value: "CARDANO · Minswap · USDM",
      copy: "Only allowlisted routes can spend from the execution hot wallet.",
      chip: "ok",
    },
  ],
  chainCards: [
    {
      chain: "CARDANO",
      title: "Live execution surface",
      copy: "Cardano is the only live execution target in the MVP. Execution uses a two-step authorize-and-swap flow.",
      chip: "live",
    },
    {
      chain: "SVM",
      title: "Scaffolded adapter",
      copy: "Scaffolding only in the MVP. Designed to share the same policy and role model.",
      chip: "scaffold",
    },
    {
      chain: "EVM",
      title: "Scaffolded adapter",
      copy: "Scaffolding only in the MVP. Connectors remain simulation-first until phase 2.",
      chip: "scaffold",
    },
  ],
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
  executionTimeline: [
    {
      title: "Step 1 · Partial De-Risk",
      copy: "Intent intent-1 anchored and settled in tx tx-1.",
      status: "executed",
    },
    {
      title: "Step 2 · Full Stable Exit",
      copy: "Intent intent-2 anchored and settled in tx tx-2.",
      status: "executed",
    },
    {
      title: "Step 3 · Normal",
      copy: "Intent intent-3 anchored and settled in tx tx-3.",
      status: "executed",
    },
  ],
  auditTrail: [
    {
      title: "EXECUTION · tx-915d",
      copy: "Settled normal. Sold 4,440 and bought 5,553.",
      stamp: "0s",
    },
  ],
  accounts: [
    {
      label: "ADA risk bucket",
      address: "addr_tes...hot_1",
      balance: "5,553 ADA",
      fiatValue: "$4,266",
      weight: "64.2%",
      role: "Risk asset",
      bucket: "Execution hot",
    },
    {
      label: "USDM stable reserve",
      address: "addr_tes...hot_1",
      balance: "2,393 USDM",
      fiatValue: "$2,393",
      weight: "35.8%",
      role: "Stable reserve",
      bucket: "Execution hot",
    },
  ],
  portfolioSeries: [
    { label: "Watch", stage: "watch", value: 8400, displayValue: "$8,400" },
    { label: "Partial", stage: "partial_derisk", value: 7310, displayValue: "$7,310" },
    { label: "Exit", stage: "full_exit", value: 4580, displayValue: "$4,580" },
    { label: "Recovery", stage: "normal", value: 6646, displayValue: "$6,646" },
  ],
  demoFrames: [
    {
      label: "01",
      title: "Watchlist breach detected",
      copy: "ADA slips under its EMA while Pyth freshness and confidence remain healthy enough to authorize a policy action.",
      stage: "watch",
      balance: "$8,400",
      stableRatio: "17.9%",
      reason: "ADA liquid value fell below its protected floor",
    },
    {
      label: "02",
      title: "Partial de-risk executes",
      copy: "The keeper emits an intent, swaps only the bounded amount needed, and restores the defended stable floor.",
      stage: "partial_derisk",
      balance: "$7,310",
      stableRatio: "44.0%",
      reason: "Partial stable target restored.",
    },
    {
      label: "03",
      title: "Full stable exit after the second leg down",
      copy: "A deeper price break and thinner asset cushion push the vault into a full defensive configuration on the approved stable route.",
      stage: "full_exit",
      balance: "$4,580",
      stableRatio: "100.0%",
      reason: "Emergency floor forced the full stable path.",
    },
    {
      label: "04",
      title: "Auto re-entry restores exposure",
      copy: "Recovery clears the hysteresis band, cooldown expires, and the treasury re-enters risk according to the configured target ratio.",
      stage: "normal",
      balance: "$6,646",
      stableRatio: "36.0%",
      reason: "Recovery cleared the re-entry guardrails.",
    },
  ],
};

const workspaceCard = document.querySelector("#workspace-card");
const topbarChips = document.querySelector("#topbar-chips");
const heroMetrics = document.querySelector("#hero-metrics");
const dashboardCards = document.querySelector("#dashboard-cards");
const chainList = document.querySelector("#chain-list");
const ladderList = document.querySelector("#risk-ladder-list");
const executionTimeline = document.querySelector("#execution-timeline");
const auditTrail = document.querySelector("#audit-trail");
const accountsBody = document.querySelector("#accounts-body");
const overviewStage = document.querySelector("#overview-stage");
const overviewBalance = document.querySelector("#overview-balance");
const overviewCopy = document.querySelector("#overview-copy");
const demoTitle = document.querySelector("#demo-title");
const demoStage = document.querySelector("#demo-stage");
const demoCopy = document.querySelector("#demo-copy");
const frameStrip = document.querySelector("#frame-strip");
const portfolioChart = document.querySelector("#portfolio-chart");
const frameBalance = document.querySelector("#frame-balance");
const frameStableRatio = document.querySelector("#frame-stable-ratio");
const frameReason = document.querySelector("#frame-reason");
const replayButton = document.querySelector("#replay-button");

const allowedTones = new Set(["ok", "warn", "danger", "live", "neutral", "executed", "rejected"]);
const allowedStages = new Set(["normal", "watch", "partial_derisk", "full_exit", "frozen"]);
const allowedLadderTones = new Set(["", "partial", "full", "reentry"]);
const stageFramesToLadderCount = [2, 3, 4, 5];
let replayTimer = null;
let currentState = fallbackState;
let activeFrameIndex = Math.max(0, fallbackState.demoFrames.length - 1);

async function loadState() {
  const candidates = ["/api/demo-state", "./data/demo-state.json"];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Try the next source.
    }
  }

  return fallbackState;
}

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeToken(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function toneForStage(stage) {
  switch (safeToken(stage, allowedStages, "watch")) {
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
    default:
      return "neutral";
  }
}

function humanizeStage(stage) {
  return String(stage).replaceAll("_", " ");
}

function renderWorkspace(workspace) {
  return `
    <div class="workspace-head">
      <div class="workspace-avatar">G1</div>
      <div>
        <p class="workspace-kicker">${escapeHTML(workspace.label)}</p>
        <strong>${escapeHTML(workspace.name)}</strong>
      </div>
    </div>
    <div class="workspace-balance-row">
      <span>Total balance</span>
      <strong>${escapeHTML(workspace.totalBalance)}</strong>
    </div>
    <div class="workspace-meta-grid">
      <article>
        <span>Stage</span>
        <strong>${escapeHTML(workspace.stage)}</strong>
      </article>
      <article>
        <span>Chain</span>
        <strong>${escapeHTML(workspace.chain)}</strong>
      </article>
      <article>
        <span>Primary</span>
        <strong>${escapeHTML(workspace.primaryAsset)}</strong>
      </article>
      <article>
        <span>Stable</span>
        <strong>${escapeHTML(workspace.stableAsset)}</strong>
      </article>
    </div>
    <div class="workspace-foot">
      <p>${escapeHTML(workspace.threshold)}</p>
      <p>${escapeHTML(workspace.members)}</p>
      <p>Hot wallet ${escapeHTML(workspace.hotWallet)}</p>
      <p>Vault ${escapeHTML(workspace.vaultId)}</p>
    </div>
  `;
}

function renderTopbarChip({ label, value, tone }) {
  const safeTone = safeToken(tone, allowedTones, "neutral");
  return `
    <div class="status-chip tone-${safeTone}">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `;
}

function renderMetric({ label, value, copy, chip }) {
  const safeChip = safeToken(chip ?? "neutral", allowedTones, "neutral");
  return `
    <article class="metric-card">
      <div class="metric-top">
        <span>${escapeHTML(label)}</span>
        ${chip ? `<span class="mini-dot tone-${safeChip}"></span>` : ""}
      </div>
      <strong>${escapeHTML(value)}</strong>
      <p>${escapeHTML(copy)}</p>
    </article>
  `;
}

function renderPolicyCard({ label, value, copy, chip }) {
  const safeChip = safeToken(chip, allowedTones, "neutral");
  return `
    <article class="policy-card">
      <div class="card-top">
        <span>${escapeHTML(label)}</span>
        <span class="mini-dot tone-${safeChip}"></span>
      </div>
      <strong>${escapeHTML(value)}</strong>
      <p>${escapeHTML(copy)}</p>
    </article>
  `;
}

function renderChain({ chain, title, copy, chip }) {
  const safeChip = chip === "live" ? "live" : "warn";
  return `
    <article class="chain-card">
      <div class="card-top">
        <span>${escapeHTML(chain)}</span>
        <span class="chip chip-${safeChip}">${escapeHTML(chip === "live" ? "Live" : "Scaffold")}</span>
      </div>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(copy)}</p>
    </article>
  `;
}

function renderLadder({ stage, title, copy, tone = "" }, index) {
  const safeTone = safeToken(tone ?? "", allowedLadderTones, "");
  const toneClass = safeTone ? ` ladder-${safeTone}` : "";
  return `
    <article class="ladder-card${toneClass}" data-ladder-index="${index}">
      <span class="ladder-stage">${escapeHTML(stage)}</span>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(copy)}</p>
    </article>
  `;
}

function renderTimelineItem({ title, copy, status }, index) {
  const safeStatus = status === "rejected" ? "rejected" : "executed";
  return `
    <article class="timeline-item status-${safeStatus}" data-timeline-index="${index}">
      <div class="card-top">
        <span>${escapeHTML(title)}</span>
        <span class="chip chip-${safeStatus === "executed" ? "live" : "warn"}">${escapeHTML(safeStatus)}</span>
      </div>
      <p>${escapeHTML(copy)}</p>
    </article>
  `;
}

function renderAuditItem({ title, copy, stamp }) {
  return `
    <article class="audit-item">
      <div class="card-top">
        <span>${escapeHTML(title)}</span>
        <span class="audit-stamp">${escapeHTML(stamp)} ago</span>
      </div>
      <p>${escapeHTML(copy)}</p>
    </article>
  `;
}

function renderAccountRow({ label, address, balance, fiatValue, weight, role, bucket }) {
  return `
    <tr>
      <td>
        <div class="account-cell">
          <strong>${escapeHTML(label)}</strong>
          <span>${escapeHTML(role)} · ${escapeHTML(bucket)} · ${escapeHTML(address)}</span>
        </div>
      </td>
      <td>${escapeHTML(balance)}</td>
      <td>${escapeHTML(fiatValue)}</td>
      <td>${escapeHTML(weight)}</td>
    </tr>
  `;
}

function renderFramePill(frame, index, activeIndex) {
  const safeTone = toneForStage(frame.stage);
  const activeClass = index === activeIndex ? " active" : "";
  return `
    <button class="frame-pill${activeClass}" type="button" data-frame-index="${index}">
      <span class="frame-label">${escapeHTML(frame.label)}</span>
      <strong>${escapeHTML(frame.title)}</strong>
      <small class="tone-${safeTone}">${escapeHTML(humanizeStage(frame.stage))}</small>
    </button>
  `;
}

function renderChart(series, activeIndex) {
  if (!Array.isArray(series) || series.length === 0) {
    return "";
  }

  const width = 640;
  const height = 280;
  const padX = 36;
  const padTop = 18;
  const padBottom = 44;
  const values = series.map((point) => Number(point.value) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;

  const x = (index) => padX + (innerWidth * index) / Math.max(1, series.length - 1);
  const y = (value) => padTop + (1 - (value - min) / span) * innerHeight;

  const linePath = series
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(series.length - 1).toFixed(2)} ${(height - padBottom).toFixed(2)} L ${x(0).toFixed(2)} ${(height - padBottom).toFixed(2)} Z`;

  const grid = Array.from({ length: 3 }, (_, index) => {
    const yPos = padTop + (innerHeight * index) / 2;
    return `<line class="chart-grid-line" x1="${padX}" y1="${yPos}" x2="${width - padX}" y2="${yPos}" />`;
  }).join("");

  const points = series
    .map((point, index) => {
      const tone = toneForStage(point.stage);
      const activeClass = index === activeIndex ? " active" : "";
      return `
        <g class="chart-node${activeClass}">
          <circle class="chart-point tone-${tone}${activeClass}" cx="${x(index)}" cy="${y(point.value)}" r="${index === activeIndex ? 6 : 4}" />
          <text class="chart-label" x="${x(index)}" y="${height - 14}" text-anchor="middle">${escapeHTML(point.label)}</text>
        </g>
      `;
    })
    .join("");

  const activeValue = series[activeIndex]?.displayValue ?? "";
  const activeX = x(activeIndex);
  const activeY = y(series[activeIndex]?.value ?? 0);

  return `
    <defs>
      <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.24)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    ${grid}
    <path class="chart-area" d="${areaPath}" />
    <path class="chart-line" d="${linePath}" />
    ${points}
    <g class="chart-bubble">
      <rect x="${Math.max(24, activeX - 58)}" y="${Math.max(8, activeY - 40)}" width="116" height="30" rx="15" ry="15"></rect>
      <text class="chart-value" x="${activeX}" y="${Math.max(28, activeY - 20)}" text-anchor="middle">${escapeHTML(activeValue)}</text>
    </g>
  `;
}

function setStagePill(element, label, stage) {
  const tone = toneForStage(stage);
  element.textContent = label;
  element.className = `status-pill tone-${tone}`;
}

function applyFrame(state, index) {
  const frames = Array.isArray(state.demoFrames) ? state.demoFrames : [];
  if (frames.length === 0) {
    return;
  }

  activeFrameIndex = Math.max(0, Math.min(index, frames.length - 1));
  const frame = frames[activeFrameIndex];
  demoTitle.textContent = frame.title;
  demoCopy.textContent = frame.copy;
  setStagePill(demoStage, humanizeStage(frame.stage), frame.stage);
  frameBalance.textContent = frame.balance;
  frameStableRatio.textContent = frame.stableRatio;
  frameReason.textContent = frame.reason;
  frameStrip.innerHTML = frames.map((item, frameIndex) => renderFramePill(item, frameIndex, activeFrameIndex)).join("");
  portfolioChart.innerHTML = renderChart(state.portfolioSeries ?? [], activeFrameIndex);

  const timelineItems = executionTimeline.querySelectorAll(".timeline-item");
  timelineItems.forEach((item, timelineIndex) => {
    item.classList.toggle("is-complete", timelineIndex < activeFrameIndex - 1);
    item.classList.toggle("is-active", timelineIndex === activeFrameIndex - 1);
  });

  const ladderCards = ladderList.querySelectorAll(".ladder-card");
  const activeCount = stageFramesToLadderCount[Math.min(activeFrameIndex, stageFramesToLadderCount.length - 1)] ?? ladderCards.length;
  ladderCards.forEach((item, ladderIndex) => {
    item.classList.toggle("is-active", ladderIndex < activeCount);
  });
}

function startReplay() {
  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }

  applyFrame(currentState, 0);
  replayTimer = window.setInterval(() => {
    const nextIndex = activeFrameIndex + 1;
    if (nextIndex >= currentState.demoFrames.length) {
      clearInterval(replayTimer);
      replayTimer = null;
      return;
    }

    applyFrame(currentState, nextIndex);
  }, 1400);
}

function renderState(state) {
  currentState = state;
  workspaceCard.innerHTML = renderWorkspace(state.workspace);
  topbarChips.innerHTML = state.topbarChips.map(renderTopbarChip).join("");
  heroMetrics.innerHTML = state.heroMetrics.map(renderMetric).join("");
  dashboardCards.innerHTML = state.dashboardCards.map(renderPolicyCard).join("");
  chainList.innerHTML = state.chainCards.map(renderChain).join("");
  ladderList.innerHTML = state.riskLadder.map(renderLadder).join("");
  executionTimeline.innerHTML = state.executionTimeline.map(renderTimelineItem).join("");
  auditTrail.innerHTML = (state.auditTrail ?? []).map(renderAuditItem).join("");
  accountsBody.innerHTML = state.accounts.map(renderAccountRow).join("");

  overviewBalance.textContent = state.workspace.totalBalance;
  overviewCopy.textContent = state.dashboardCards[2]?.value ?? "Policy is currently inside the safe band.";
  setStagePill(overviewStage, state.workspace.stage, state.demoFrames.at(-1)?.stage ?? "normal");
  applyFrame(state, Math.max(0, state.demoFrames.length - 1));
}

frameStrip.addEventListener("click", (event) => {
  const target = event.target.closest("[data-frame-index]");
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const index = Number(target.dataset.frameIndex);
  if (!Number.isFinite(index)) {
    return;
  }

  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }

  applyFrame(currentState, index);
});

replayButton.addEventListener("click", () => {
  startReplay();
});

loadState().then((state) => {
  renderState(state);
});
