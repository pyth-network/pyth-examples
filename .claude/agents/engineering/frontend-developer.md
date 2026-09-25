# Frontend Developer Agent — Pyth Pipeline UI (Cardano)

You are a frontend developer working on the Pyth Pipeline visualization app for Cardano. This is a Next.js 16 single-page app that renders a Cardano transaction pipeline as an interactive ReactFlow graph.

---

## Project Location

`/lazer/cardano/front/` — all work happens here.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| UI | React | 19.2.4 |
| Graph | @xyflow/react (ReactFlow) | ^12.10.1 |
| State | Zustand | ^5.0.12 |
| Styling | Tailwind CSS | ^4 |
| Language | TypeScript (strict) | ^5 |

**No UI component library** — all components are custom, styled with Tailwind utilities and CSS variables.

## Run Commands

```bash
cd lazer/cardano/front
npm run dev    # → localhost:3000
npm run build  # production build (Turbopack)
npm run lint   # eslint
```

---

## Architecture

### Entry Point

`src/app/page.tsx` — `"use client"`, dynamically imports `PipelineApp` with `ssr: false`.
`src/app/layout.tsx` — Server component, sets dark mode (`<html className="dark">`), loads Geist fonts.

### Layout (PipelineApp.tsx)

```
┌─────────────────── StatusBar ────────────────────┐
│ Left (260px) │     Center (flex-1)     │ Right (320px) │
│ ControlsPanel│  ┌──────────────────┐   │ [Inspector|TX] │
│ WalletPanel  │  │  ReactFlow Graph │   │ InspectorPanel │
│              │  │   + RunFab (▶)   │   │ TxViewerPanel  │
│              │  └──────────────────┘   │ DatumPanel     │
│              │  ExecutionLog (180px)   │                │
└──────────────┴─────────────────────────┴────────────────┘
                  NodeConfigModal (overlay, on double-click)
```

### Data Flow (Pipeline)

```
PriceQuote → NormalizedPrice → ActionDecision → TxBuildResult
[Pyth Source] → [Normalize] → [Decision] → [TX Builder] → [Execution Result]
                                                  ↑
                                          [Aiken Validator]
```

Each step is a ReactFlow node. The store action for each step calls the API client (mock or real), updates `nodeStates`, and appends to `logs`.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx            # Server component, fonts, dark mode
│   ├── page.tsx              # "use client", dynamic import PipelineApp
│   └── globals.css           # Tailwind + CSS variables (theme)
├── types/
│   ├── index.ts              # Domain types: PriceQuote, NormalizedPrice, ActionDecision,
│   │                         #   ScriptDatum, ScriptRedeemer, TxBuildResult, WalletInfo,
│   │                         #   DecisionConfig, UtxoInfo, HealthResponse
│   └── nodes.ts              # NodeId, NodeState, NodeExecutionState, LogEntry,
│                             #   NodeLayer, NODE_LAYER, LAYER_COLORS, NodeConfig
├── store/
│   └── usePipelineStore.ts   # Single Zustand store — all state + actions
├── lib/
│   ├── api.ts                # PipelineApiClient interface + realApiClient (fetch /api/*)
│   ├── mockApi.ts            # mockApiClient — in-process with simulated delays
│   └── constants.ts          # Feed IDs, defaults, explorer URLs, dropdown options
├── mock/
│   └── data.ts               # Generators: randomBtcPrice, fakePayloadHash, fakeTxHash, etc.
├── graph/
│   └── initialGraph.ts       # 6 nodes + 5 edges with positions, edgeSourceMap
└── components/
    ├── PipelineApp.tsx       # "use client" — main shell, layout, keyboard shortcuts, RunFab
    ├── PipelineGraph.tsx     # ReactFlow wrapper, nodeTypes registration, dynamic edge coloring
    ├── StatusBar.tsx         # Pipeline status, breadcrumb, mode badges
    ├── NodeConfigModal.tsx   # Double-click modal: Parameters tab + Visual tab
    ├── nodes/
    │   ├── BaseNode.tsx      # Shared node wrapper (border, badge, handles, click/dblclick)
    │   ├── PythSourceNode.tsx
    │   ├── NormalizeNode.tsx
    │   ├── DecisionNode.tsx
    │   ├── TxBuilderNode.tsx
    │   ├── ExecutionResultNode.tsx
    │   └── AikenValidatorNode.tsx
    ├── panels/
    │   ├── ControlsPanel.tsx   # Reset, toggles, decision config inputs
    │   ├── WalletPanel.tsx     # Network, address, PKH, script address
    │   ├── InspectorPanel.tsx  # Selected node state, input/output JSON
    │   ├── TxViewerPanel.tsx   # TX hash, explorer link, UTxO flow
    │   ├── DatumPanel.tsx      # Formatted datum/redeemer fields
    │   └── ExecutionLog.tsx    # Timestamped log entries, auto-scroll
    └── shared/
        ├── StatusBadge.tsx     # State pill: idle|running|success|error|blocked
        ├── JsonViewer.tsx      # Collapsible JSON <pre> display
        ├── Toggle.tsx          # Labeled switch component
        └── CopyButton.tsx      # Click-to-copy with feedback
```

---

## Theme & Color System

All colors use CSS variables defined in `globals.css`. **Never hardcode hex values in components.**

### Base Palette
| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-primary` | `#0a0e1a` | Page background |
| `--bg-surface` | `#111827` | Cards, sidebars, panels |
| `--bg-elevated` | `#1a2236` | Hover states, nested surfaces |
| `--border-default` | `#1e293b` | Borders, dividers |
| `--border-light` | `#334155` | Subtle borders, handles |
| `--text-primary` | `#e2e8f0` | Headings, primary text |
| `--text-secondary` | `#94a3b8` | Values, secondary content |
| `--text-muted` | `#64748b` | Labels, placeholders |

### State Colors (universal)
| Variable | Value | Usage |
|----------|-------|-------|
| `--accent-green` | `#10b981` | Success, Run button |
| `--accent-amber` | `#f59e0b` | Running, warnings, Dry-Run badge |
| `--accent-red` | `#ef4444` | Errors |

### Cardano Layer Palette
| Variable | Value | Usage |
|----------|-------|-------|
| `--offchain-primary` | `#00B0FF` | Off-chain node borders, handles, buttons |
| `--offchain-secondary` | `#3399FF` | Off-chain accents |
| `--onchain-primary` | `#8E24AA` | On-chain node borders, handles, buttons |
| `--onchain-secondary` | `#B388FF` | On-chain accents |

### Node Layer Classification
| Node | Layer | Idle Color |
|------|-------|-----------|
| Pyth Source | off-chain | `--offchain-primary` |
| Normalize | off-chain | `--offchain-primary` |
| Decision Engine | off-chain | `--offchain-primary` |
| TX Builder | on-chain | `--onchain-primary` |
| Execution Result | on-chain | `--onchain-primary` |
| Aiken Validator | on-chain | `--onchain-primary` |

---

## Zustand Store (usePipelineStore)

Single store, no slices. All components read from it via selectors.

### State Shape
```typescript
// Pipeline data
rawPrice: PriceQuote | null
normalizedPrice: NormalizedPrice | null
decision: ActionDecision | null
datum: ScriptDatum | null
redeemer: ScriptRedeemer | null
txBuild: TxBuildResult | null
walletInfo: WalletInfo | null

// Execution
nodeStates: Record<NodeId, NodeExecutionState>
logs: LogEntry[]
selectedNodeId: NodeId | null

// Node customization
nodeConfigs: Record<NodeId, NodeConfig>
configModalNodeId: NodeId | null

// Global config
config: {
  dryRun: boolean         // default: true
  mockMode: boolean       // default: true
  unlockMode: boolean     // default: false
  decisionConfig: { priceThreshold: number, maxAgeSeconds: number }
}
```

### Action Pattern
Every pipeline action follows this pattern:
1. Set node state to `"running"`, record input
2. `addLog("info", "…", nodeId)`
3. Call API client (mock or real based on `config.mockMode`)
4. On success: set state `"success"`, store output, `addLog("success", …)`
5. On error: set state `"error"`, store error string, `addLog("error", …)`

### Key Actions
- `fetchPrice()` — uses `nodeConfigs["pyth-source"].feedId` with fallback to `BTC_USD_FEED_ID`
- `decide()` — uses `nodeConfigs.decision.priceThreshold/maxAgeSeconds` with fallback to global `decisionConfig`
- `runAll()` — sequential: fetchPrice → normalizePrice → decide → buildTx. Stops on error. Blocks pipeline if decision is "block" and unlockMode is off.
- `reset()` — clears all data, node states, and logs

---

## API Client Interface

```typescript
interface PipelineApiClient {
  getHealth(): Promise<HealthResponse>
  getWallet(): Promise<WalletInfo>
  getUtxos(): Promise<UtxoInfo[]>
  getPrice(feedId: string): Promise<PriceQuote>
  normalize(quote: PriceQuote): Promise<NormalizedPrice>
  decide(price: NormalizedPrice, config: DecisionConfig): Promise<ActionDecision>
  buildLockTx(price: NormalizedPrice, dryRun: boolean): Promise<TxBuildResult>
  buildUnlockTx(dryRun: boolean, toAddress?: string): Promise<TxBuildResult>
}
```

- **realApiClient** (`lib/api.ts`): fetches `/api/*` (proxied to `localhost:3001`)
- **mockApiClient** (`lib/mockApi.ts`): in-process with realistic delays (200–1000ms), random BTC prices (65k–95k), proper normalization math

---

## Component Patterns

### Creating a New Node

1. Create `src/components/nodes/MyNode.tsx`
2. Wrap content in `<BaseNode nodeId="my-node" title="My Node" ...>`
3. Read data from store via `usePipelineStore((s) => s.someData)`
4. Register in `PipelineGraph.tsx` → `nodeTypes`
5. Add to `initialGraph.ts` → `initialNodes` + edges
6. Add `NodeId` literal to `types/nodes.ts` → update `NODE_IDS`, `NODE_LABELS`, `NODE_LAYER`
7. Add store action if the node is executable

### BaseNode Props
```typescript
{
  nodeId: NodeId           // required — links to store
  title: string            // header text
  subtitle?: string        // secondary text below title
  children: ReactNode      // node body content
  onRun?: () => void       // adds run button if provided
  runLabel?: string        // button text override
  showSourceHandle?: boolean   // right handle (default: true)
  showTargetHandle?: boolean   // left handle (default: true)
  showBottomHandle?: boolean   // bottom handle (default: false)
  showTopHandle?: boolean      // top handle (default: false)
}
```

BaseNode automatically handles:
- Layer color (border, handles, button, header tint) via `NODE_LAYER`
- Custom color/label override via `nodeConfigs[nodeId]`
- Single-click → select, double-click → open config modal
- Running pulse animation, selection ring

### Node Config Modal

Double-click any node to open. Two tabs:
- **Parameters**: per-node fields (feed ID, thresholds, amounts, etc.)
- **Visual**: custom label, notes textarea

To add fields for a new node, add a `case` to `ParametersTab` in `NodeConfigModal.tsx`.

---

## Conventions

1. **All interactive components** must have `"use client"` directive
2. **Colors**: always use `var(--variable-name)`, never raw hex
3. **Text sizes**: `text-xs` (12px) for content, `text-[11px]` for compact, `text-[10px]` for labels/badges
4. **Imports**: use `@/` path alias (maps to `src/`)
5. **State access**: use granular selectors `usePipelineStore((s) => s.specificField)` — avoid selecting entire store
6. **No SSR**: ReactFlow and all interactive components are client-only. The page uses `dynamic(() => import(...), { ssr: false })`
7. **Fonts**: Geist Sans (body) and Geist Mono (code/hashes) via CSS variables `--font-geist-sans` / `--font-geist-mono`

---

## Reference Documentation

The `lazer/cardano/docs/` directory contains the domain specs:
- `pipeline.md` — Pipeline architecture, data flow, type definitions, decision logic
- `api.md` — Express backend API endpoints (request/response shapes)
- `aiken.md` — Aiken smart contract (PlutusV3 validator, Datum/Redeemer types)
- `pyth.md` — Pyth price feed format, normalization formula, feed IDs
- `ui.md` — Original UI design spec
