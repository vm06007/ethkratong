import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";

/**
 * Hook to manage drag/drop and node addition logic
 */
export function useFlowEditor(
  reactFlowInstance: any,
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>,
  nodes: Node[],
  setNodes: Dispatch<SetStateAction<Node[]>>
) {
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const protocol = event.dataTransfer.getData(
        "application/reactflow-protocol"
      );
      const label = event.dataTransfer.getData("application/reactflow-label");

      if (!protocol || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Ensure new node id never conflicts with existing nodes (avoid replacing on drop)
      const existingIds = new Set(nodes.map((n) => n.id));
      const maxN = nodes.reduce((max, n) => {
        const m = n.id.match(/^node-(\d+)$/);
        const num = m ? parseInt(m[1], 10) : 0;
        return Math.max(max, num);
      }, 0);
      let nextNum = maxN + 1;
      while (existingIds.has(`node-${nextNum}`)) nextNum++;
      const nextNodeId = `node-${nextNum}`;

      // Find the highest sequence number among existing nodes
      const maxSequence = Math.max(
        0,
        ...nodes
          .filter((n) => (n.data as ProtocolNodeData).sequenceNumber !== undefined)
          .map((n) => (n.data as ProtocolNodeData).sequenceNumber || 0)
      );

      const newNode: Node<ProtocolNodeData> = {
        id: nextNodeId,
        type: "protocol",
        position,
        data: {
          protocol: protocol as any,
          label: label,
          sequenceNumber: maxSequence + 1, // Add to the end
          // Set default action for Uniswap nodes
          ...(protocol === "uniswap" ? { action: "swap" as const } : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, nodes]
  );

  const handleAddNodeFromSidebar = useCallback(
    (protocol: string, label: string) => {
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const position = reactFlowInstance.screenToFlowPosition({
        x: centerX,
        y: centerY,
      });

      const existingIds = new Set(nodes.map((n) => n.id));
      const maxN = nodes.reduce((max, n) => {
        const m = n.id.match(/^node-(\d+)$/);
        const num = m ? parseInt(m[1], 10) : 0;
        return Math.max(max, num);
      }, 0);
      let nextNum = maxN + 1;
      while (existingIds.has(`node-${nextNum}`)) nextNum++;
      const nextNodeId = `node-${nextNum}`;

      const maxSequence = Math.max(
        0,
        ...nodes
          .filter((n) => (n.data as ProtocolNodeData).sequenceNumber !== undefined)
          .map((n) => (n.data as ProtocolNodeData).sequenceNumber || 0)
      );

      const newNode: Node<ProtocolNodeData> = {
        id: nextNodeId,
        type: "protocol",
        position,
        data: {
          protocol: protocol as any,
          label: label,
          sequenceNumber: maxSequence + 1,
          ...(protocol === "uniswap" ? { action: "swap" as const } : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, reactFlowWrapper, setNodes, nodes]
  );

  return {
    onDragOver,
    onDrop,
    handleAddNodeFromSidebar,
  };
}
