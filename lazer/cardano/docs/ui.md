# Pipeline UI

Interactive dashboard that visualizes the pipeline as a node graph and allows
step-by-step or full execution.

## Run

```bash
cd front
cp .env.example .env.local   # fill in secrets
npm install
npm run dev
# → http://localhost:3000
```

Mock Mode (default) requires no backend secrets or Cardano connection.
Live Mode requires `PYTH_ACCESS_TOKEN`, `BLOCKFROST_API_KEY`, `WALLET_MNEMONIC`,
and `VALIDATOR_SCRIPT_HASH` in `.env.local`.

## Stack

- **Next.js** (App Router) — UI + API routes in one project
- **React 19** + **Zustand** (state management)
- **@xyflow/react** (interactive graph)
- **Lucide React** (icons)
- **Tailwind CSS v4**
- **@meshsdk/core** (Cardano TX building, server-side)
- **@pythnetwork/pyth-lazer-sdk** (Pyth Lazer WebSocket, server-side)

## Code structure

```
front/src/
  app/
    page.tsx                    ← entry point
    layout.tsx                  ← fonts + metadata
    globals.css                 ← theme vars, ReactFlow overrides
    api/
      price/route.ts            ← GET latest ADA/USD from Pyth Lazer
      wallet/route.ts           ← GET wallet + script address info
      utxos/route.ts            ← GET UTxOs at script address
      tx/lock/route.ts          ← POST build + sign + submit lock TX
      tx/spend/route.ts         ← POST build + sign + submit spend TX
  types/
    index.ts                    ← shared types (mirrors on-chain OracleDatum)
    nodes.ts                    ← NodeId, NodeState, layers, colors
  store/
    usePipelineStore.ts         ← Zustand store + pipeline actions
  lib/
    api.ts                      ← PipelineApiClient interface + realApiClient
    mockApi.ts                  ← mock implementation (no backend needed)
    price.ts                    ← pure: decision logic + datum builder
    constants.ts                ← feed IDs, defaults, explorer URLs
    cardano.ts                  ← server-only: Mesh SDK wallet + TX building
    pyth.ts                     ← server-only: Pyth Lazer WebSocket client
  mock/
    data.ts                     ← mock price generator + fake wallet
  graph/
    initialGraph.ts             ← node positions and edges
  components/
    PipelineApp.tsx             ← main layout (sidebars, graph, log, modal)
    PipelineGraph.tsx           ← ReactFlow container + edge coloring
    StatusBar.tsx               ← status breadcrumb bar
    NodeConfigModal.tsx         ← per-node config modal (double-click)
    nodes/                      ← node components (Pyth, Normalize, Decision, TX, Result, Aiken)
    panels/                     ← sidebar panels (Controls, Wallet, Inspector, TX Viewer, Datum, Log)
    shared/                     ← StatusBadge, Toggle, JsonViewer, CopyButton
```

## Modes

### Mock Mode (default: ON)

Runs entirely in-process with simulated ADA/USD prices. No backend secrets or
Cardano network required. The decision logic runs the same pure functions as
Live Mode.

### Live Mode (Mock Mode OFF)

Each step calls the Next.js API routes (`/api/*`), which connect to Pyth Lazer
and Blockfrost. Transactions are built, signed, and submitted server-side using
a mnemonic wallet.

### Dry Run (default: ON)

Transactions are built but not submitted to the network.

### Spend Mode

Forces the TX Builder to construct a spend TX regardless of the decision
engine's output.

## The graph

```
[Pyth Lazer] → [Normalize] → [Decision] → [TX Builder] → [Execution Result]
                                               ↑
                                      [Aiken Validator]
```

Each node has a status badge (idle | running | success | error | blocked), can
be run individually, shows input/output in the Inspector on click, and can be
configured via double-click.

## Controls

| Control | Description |
|---|---|
| Reset | Clear all data and logs |
| Mock Mode | Toggle between mock and live |
| Dry Run | Toggle between submit and dry-run |
| Spend Mode | Force spend TX |
| Datum condition | AnyPrice, MinPrice, MaxPrice, or PriceRange |
| Min/Max/Range values | USD cents thresholds |
| Max age | Staleness limit in seconds |

**Run All**: FAB button over the graph, or `Cmd+Enter`.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Enter` | Run All |
| `Escape` | Close modal or deselect node |
| Double-click node | Open config modal |
