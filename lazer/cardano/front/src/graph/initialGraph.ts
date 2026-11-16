import type { Node, Edge } from "@xyflow/react";

export const initialNodes: Node[] = [
  {
    id: "pyth-source",
    type: "pythSource",
    position: { x: 0, y: 80 },
    data: {},
  },
  {
    id: "normalize",
    type: "normalize",
    position: { x: 320, y: 80 },
    data: {},
  },
  {
    id: "decision",
    type: "decision",
    position: { x: 620, y: 60 },
    data: {},
  },
  {
    id: "tx-builder",
    type: "txBuilder",
    position: { x: 940, y: 60 },
    data: {},
  },
  {
    id: "execution-result",
    type: "executionResult",
    position: { x: 1260, y: 80 },
    data: {},
  },
  {
    id: "aiken-validator",
    type: "aikenValidator",
    position: { x: 940, y: 340 },
    data: {},
  },
];

// Default edge colors by layer
const OFFCHAIN_EDGE = "rgba(0, 176, 255, 0.4)";
const ONCHAIN_EDGE = "rgba(179, 136, 255, 0.4)";
const CROSS_EDGE = "rgba(179, 136, 255, 0.5)";

export const initialEdges: Edge[] = [
  {
    id: "e-pyth-norm",
    source: "pyth-source",
    target: "normalize",
    animated: false,
    style: { stroke: OFFCHAIN_EDGE },
  },
  {
    id: "e-norm-dec",
    source: "normalize",
    target: "decision",
    animated: false,
    style: { stroke: OFFCHAIN_EDGE },
  },
  {
    id: "e-dec-tx",
    source: "decision",
    target: "tx-builder",
    animated: false,
    style: { stroke: OFFCHAIN_EDGE },
  },
  {
    id: "e-tx-exec",
    source: "tx-builder",
    target: "execution-result",
    animated: false,
    style: { stroke: ONCHAIN_EDGE },
  },
  {
    id: "e-aiken-tx",
    source: "aiken-validator",
    target: "tx-builder",
    sourceHandle: "top",
    targetHandle: "bottom",
    animated: false,
    label: "validates",
    style: { stroke: CROSS_EDGE, strokeDasharray: "6 3" },
  },
];

// Map edge id → source node id (for dynamic coloring)
export const edgeSourceMap: Record<string, string> = {
  "e-pyth-norm": "pyth-source",
  "e-norm-dec": "normalize",
  "e-dec-tx": "decision",
  "e-tx-exec": "tx-builder",
  "e-aiken-tx": "aiken-validator",
};
