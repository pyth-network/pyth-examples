export type NodeId =
  | "pyth-source"
  | "normalize"
  | "decision"
  | "tx-builder"
  | "execution-result"
  | "aiken-validator";

export type NodeState = "idle" | "running" | "success" | "error" | "blocked";

export interface NodeExecutionState {
  state: NodeState;
  lastRun: number | null;
  error: string | null;
  input: unknown;
  output: unknown;
}

export type LogLevel = "info" | "success" | "error" | "warn";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  nodeId?: NodeId;
}

export const NODE_IDS: NodeId[] = [
  "pyth-source",
  "normalize",
  "decision",
  "tx-builder",
  "execution-result",
  "aiken-validator",
];

export const NODE_LABELS: Record<NodeId, string> = {
  "pyth-source": "Pyth Lazer",
  normalize: "Normalize",
  decision: "Decision Engine",
  "tx-builder": "TX Builder",
  "execution-result": "Execution Result",
  "aiken-validator": "Aiken Validator",
};

export type NodeLayer = "off-chain" | "on-chain";

export const NODE_LAYER: Record<NodeId, NodeLayer> = {
  "pyth-source": "off-chain",
  normalize: "off-chain",
  decision: "off-chain",
  "tx-builder": "on-chain",
  "execution-result": "on-chain",
  "aiken-validator": "on-chain",
};

export const LAYER_COLORS: Record<NodeLayer, { primary: string; secondary: string }> = {
  "off-chain": { primary: "var(--offchain-primary)", secondary: "var(--offchain-secondary)" },
  "on-chain":  { primary: "var(--onchain-primary)",  secondary: "var(--onchain-secondary)" },
};

/** Per-node color overrides — takes precedence over the layer color. */
export const NODE_ACCENT_OVERRIDE: Partial<Record<NodeId, { primary: string; secondary: string }>> = {
  "pyth-source":      { primary: "var(--source-primary)",  secondary: "var(--source-secondary)" },
  "execution-result": { primary: "var(--outcome-primary)", secondary: "var(--outcome-secondary)" },
};

export interface NodeConfig {
  customLabel?: string;
  customColor?: string;
  notes?: string;
  maxAgeSeconds?: number;
  lockAmount?: string;
  dryRun?: boolean;
  network?: string;
}
