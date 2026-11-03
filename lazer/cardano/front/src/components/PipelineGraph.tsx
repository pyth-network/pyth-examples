"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type Edge,
} from "@xyflow/react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { initialNodes, initialEdges, edgeSourceMap } from "@/graph/initialGraph";
import { NODE_LAYER } from "@/types/nodes";
import type { NodeId } from "@/types/nodes";
import PythSourceNode from "@/components/nodes/PythSourceNode";
import NormalizeNode from "@/components/nodes/NormalizeNode";
import DecisionNode from "@/components/nodes/DecisionNode";
import TxBuilderNode from "@/components/nodes/TxBuilderNode";
import ExecutionResultNode from "@/components/nodes/ExecutionResultNode";
import AikenValidatorNode from "@/components/nodes/AikenValidatorNode";

const nodeTypes = {
  pythSource: PythSourceNode,
  normalize: NormalizeNode,
  decision: DecisionNode,
  txBuilder: TxBuilderNode,
  executionResult: ExecutionResultNode,
  aikenValidator: AikenValidatorNode,
};

export default function PipelineGraph() {
  const nodeStates = usePipelineStore((s) => s.nodeStates);
  const selectNode = usePipelineStore((s) => s.selectNode);

  const edges: Edge[] = useMemo(() => {
    return initialEdges.map((edge) => {
      const sourceNodeId = edgeSourceMap[edge.id] as NodeId | undefined;
      const sourceState = sourceNodeId
        ? nodeStates[sourceNodeId]
        : undefined;
      const isSuccess = sourceState?.state === "success";
      const isError = sourceState?.state === "error";

      // Layer-aware default color
      const layer = sourceNodeId ? NODE_LAYER[sourceNodeId] : "off-chain";
      const layerColor = layer === "on-chain"
        ? "rgba(179, 136, 255, 0.4)"
        : "rgba(0, 176, 255, 0.4)";

      return {
        ...edge,
        animated: isSuccess,
        style: {
          ...edge.style,
          stroke: isError
            ? "var(--accent-red)"
            : isSuccess
              ? "var(--accent-green)"
              : layerColor,
          strokeWidth: isSuccess || isError ? 2 : 1,
        },
      };
    });
  }, [nodeStates]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <ReactFlow
      nodes={initialNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} color="var(--border-default)" size={1} gap={20} />
      <Controls position="bottom-left" />
    </ReactFlow>
  );
}
