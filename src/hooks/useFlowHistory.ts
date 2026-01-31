import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";

/**
 * Hook to manage undo/redo history for the flow
 */
export function useFlowHistory(
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>
) {
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save to history on changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHistory((prev) => [
        ...prev.slice(0, historyIndex + 1),
        { nodes, edges },
      ]);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [nodes, edges]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes as Node<ProtocolNodeData>[]);
      setEdges(prevState.edges);
      setHistoryIndex((prev) => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes as Node<ProtocolNodeData>[]);
      setEdges(nextState.edges);
      setHistoryIndex((prev) => prev + 1);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    history,
    historyIndex,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  };
}
