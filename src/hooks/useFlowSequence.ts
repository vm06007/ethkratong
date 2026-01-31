import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import { calculateExecutionOrder } from "@/lib/flow";

/**
 * Hook to manage sequence number calculations and node reordering
 */
export function useFlowSequence(
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  edgeType: "default" | "straight" | "step" | "smoothstep"
) {
  // Calculate sequence numbers based on graph topology when edges change
  useEffect(() => {
    const orderMap = calculateExecutionOrder(nodes, edges);

    // Update nodes with calculated sequence numbers
    setNodes((nds) =>
      nds.map((node) => {
        const sequenceNumber = orderMap.get(node.id);
        if (sequenceNumber !== undefined && sequenceNumber !== node.data.sequenceNumber) {
          return {
            ...node,
            data: {
              ...node.data,
              sequenceNumber,
            },
          };
        }
        return node;
      })
    );
  }, [edges]); // Recalculate when edges change

  // Initialize sequence numbers for nodes that don't have them
  useEffect(() => {
    const needsInitialization = nodes.some(
      (node) => {
        const data = node.data as any;
        return data.sequenceNumber === undefined && data.protocol !== "wallet";
      }
    );

    if (needsInitialization) {
      setNodes((nds) =>
        nds.map((node) => {
          const nodeData = node.data as any;
          if (nodeData.sequenceNumber === undefined && nodeData.protocol !== "wallet") {
            // Find max sequence and add to end
            const maxSeq = Math.max(
              0,
              ...nds
                .filter((n) => (n.data as any).sequenceNumber !== undefined)
                .map((n) => (n.data as any).sequenceNumber || 0)
            );
            return {
              ...node,
              data: {
                ...node.data,
                sequenceNumber: maxSeq + 1,
              },
            };
          }
          return node;
        })
      );
    }
  }, [nodes, setNodes]); // Only initialize missing sequence numbers

  const handleReorderNodes = (newOrder: string[]) => {
    if (newOrder.length === 0) return;

    // Find wallet node
    const walletNode = nodes.find((n) => n.data.protocol === "wallet");
    if (!walletNode) return;

    const firstNodeId = newOrder[0];

    // Update sequence numbers
    setNodes((nds) =>
      nds.map((node) => {
        const orderIndex = newOrder.indexOf(node.id);
        if (orderIndex !== -1) {
          return {
            ...node,
            data: {
              ...node.data,
              sequenceNumber: orderIndex + 1, // +1 because sequence starts at 1
            },
          };
        }
        return node;
      })
    );

    // Ensure the first node is connected ONLY to wallet
    setEdges((eds) => {
      // Remove ALL incoming edges to the first node
      const filteredEdges = eds.filter((edge) => edge.target !== firstNodeId);

      // Add single edge from wallet to first node
      return [
        ...filteredEdges,
        {
          id: `${walletNode.id}-${firstNodeId}`,
          source: walletNode.id,
          target: firstNodeId,
          type: edgeType,
        },
      ];
    });
  };

  return {
    handleReorderNodes,
  };
}
