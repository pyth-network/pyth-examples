# guards.one Landing and Frontend Spec

## Goal
Create a static but high-signal frontend shell that communicates the product in under one minute:
- What guards.one is
- Why Pyth is required
- How the risk ladder works
- What is live today versus planned later

## Information Architecture
1. App-shell overview
2. Simulation and replay panel
3. Accounts table
4. Policy guardrails
5. Risk ladder
6. Execution timeline
7. Audit log
8. Documentation links

## Visual Direction
- Dark, high-contrast treasury shell inspired by `squads.xyz`
- Flat charcoal panels with restrained borders and premium spacing
- White action pills and muted operator chrome
- Minimal accent colors only for state, risk, and execution tone
- Mobile-friendly layout with stacked panels and responsive sidebar collapse

## Key Messages
- guards.one is a policy enforcement layer, not just an alert board.
- Cardano is the live MVP chain.
- The business logic is multichain-native from the start.
- The system uses price, confidence, freshness, and fiat floors.
- Partial de-risk and full stable exit are the core execution actions.
- Hedge and perps are roadmap items, not MVP scope.

## Required UI Blocks

### App Shell
- Branded sidebar with workspace card
- Primary nav for overview, accounts, policy, risk, execution, and audit
- Topbar chips for network, route, and wallet status
- Main overview panel with total liquid treasury value and action buttons

### Simulation Panel
- Demo replay control
- Per-frame copy for watch, partial de-risk, full exit, and recovery
- SVG chart driven by backend series data
- Summary boxes for frame balance, stable ratio, and trigger reason

### Accounts Table
- Hot bucket and stable reserve rows
- Address, balance, fiat value, and weight
- Clear distinction between risk and stable roles

### Policy Cards
- Protected floor
- Emergency floor
- Primary reason
- Current execution route / policy

### Risk Ladder
- Normal
- Watch
- Partial DeRisk
- Full Stable Exit
- Auto Re-entry

Each stage must explain the trigger and the resulting action.

### Execution Timeline
Show the simulated runbook steps emitted by the backend demo state:
- partial de-risk execution
- full stable exit
- re-entry execution

### Multichain Positioning
Explain that Cardano is the live deployment target while SVM and EVM are first-class future connectors.

### Audit Log
- Recent snapshots, intents, and execution events
- Human-readable summaries generated from the backend event log

## Interaction Notes
- The page stays build-free, but it is not static in presentation.
- A small JS file renders backend demo data into the shell and powers replay controls.
- The UI should prefer `/api/demo-state` and fall back to a committed demo JSON export.
- No build step required.
- All content should render without network access except the font import, which is optional.

## Copy Constraints
- Keep explanations concrete.
- Mention `Pyth` as the oracle evidence layer.
- Avoid generic “AI agent” or “dashboard app” language.
- Make it clear that hedge/perps are planned later, not part of the live MVP.

## Acceptance Criteria
- The landing reads clearly on desktop and mobile.
- The visual hierarchy is obvious.
- The docs match the product direction in the functional spec.
- A reviewer can understand the product and the roadmap without talking to the team.
- The replay demo clearly shows the breach lifecycle without needing a live blockchain connection.
