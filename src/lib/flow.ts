import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";

/**
 * Calculate execution order starting from wallet using topological sort (Kahn's algorithm).
 * Returns a Map of node IDs to their sequence numbers.
 */
export function calculateExecutionOrder(nodes: Node[], edges: Edge[]): Map<string, number> {
  const orderMap = new Map<string, number>();
  const walletNode = nodes.find((n) => n.data.protocol === "wallet");

  if (!walletNode) return orderMap;

  // Build adjacency list and in-degree map
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize all nodes
  nodes.forEach((node) => {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph
  edges.forEach((edge) => {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Topological sort using Kahn's algorithm
  const queue: string[] = [walletNode.id];
  const result: string[] = [];
  let sequenceCounter = 0;

  orderMap.set(walletNode.id, 0); // Wallet is always 0

  while (queue.length > 0) {
    // Sort queue by existing sequence numbers to preserve manual ordering
    queue.sort((a, b) => {
      const nodeA = nodes.find((n) => n.id === a);
      const nodeB = nodes.find((n) => n.id === b);
      if (!nodeA || !nodeB) return 0;

      // Use existing sequence numbers if available
      const seqA = typeof nodeA.data.sequenceNumber === "number" ? nodeA.data.sequenceNumber : 999999;
      const seqB = typeof nodeB.data.sequenceNumber === "number" ? nodeB.data.sequenceNumber : 999999;
      return seqA - seqB;
    });

    const nodeId = queue.shift()!;
    result.push(nodeId);

    // Process all neighbors
    const neighbors = adjList.get(nodeId) || [];

    // Sort neighbors by existing sequence numbers
    const sortedNeighbors = neighbors.sort((a, b) => {
      const nodeA = nodes.find((n) => n.id === a);
      const nodeB = nodes.find((n) => n.id === b);
      if (!nodeA || !nodeB) return 0;

      const seqA = typeof nodeA.data.sequenceNumber === "number" ? nodeA.data.sequenceNumber : 999999;
      const seqB = typeof nodeB.data.sequenceNumber === "number" ? nodeB.data.sequenceNumber : 999999;
      return seqA - seqB;
    });

    sortedNeighbors.forEach((neighborId) => {
      const currentInDegree = inDegree.get(neighborId) || 0;
      inDegree.set(neighborId, currentInDegree - 1);

      if (inDegree.get(neighborId) === 0) {
        sequenceCounter++;
        orderMap.set(neighborId, sequenceCounter);
        queue.push(neighborId);
      }
    });
  }

  return orderMap;
}

/**
 * Validates if a flow can be executed.
 * Returns an object with canExecute boolean and an optional reason string.
 */
export function validateFlowExecution(
  nodes: Node<ProtocolNodeData>[],
  activeAccount: { address: string } | undefined
): { canExecute: boolean; reason: string | null } {
  // Check if wallet is connected
  if (!activeAccount?.address) {
    return { canExecute: false, reason: "Please connect your wallet first" };
  }

  // Check if there are any nodes connected to wallet
  const walletNode = nodes.find((n) => n.data.protocol === "wallet");
  if (!walletNode) {
    return { canExecute: false, reason: "No wallet node found" };
  }

  // Check if there are any action nodes
  const actionNodes = nodes.filter(
    (n) => n.data.protocol !== "wallet" && n.data.sequenceNumber !== undefined && n.data.sequenceNumber > 0
  );
  if (actionNodes.length === 0) {
    return { canExecute: false, reason: "No actions configured. Add and connect nodes to create a flow." };
  }

  // Check if all actions are properly configured
  const unconfiguredNode = actionNodes.find((node) => {
    if (node.data.protocol === "transfer") {
      return !(node.data.amount && node.data.asset && node.data.recipientAddress);
    }
    if (node.data.protocol === "custom") {
      return !(node.data.contractAddress && node.data.customContractVerified && node.data.selectedFunction);
    }
    if (node.data.protocol === "conditional") {
      return !(node.data.contractAddress && node.data.conditionalContractVerified && node.data.selectedFunction && node.data.comparisonOperator != null);
    }
    if (node.data.protocol === "balanceLogic") {
      return !(node.data.balanceLogicAddress && node.data.balanceLogicComparisonOperator != null && (node.data.balanceLogicCompareValue ?? "").trim() !== "");
    }
    if (node.data.protocol === "morpho") {
      return !(node.data.action && node.data.asset && (node.data.amount ?? "").trim() !== "");
    }
    if (node.data.protocol === "uniswap") {
      if (node.data.action === "swap") {
        return !(node.data.swapFrom && node.data.swapTo && node.data.amount);
      }
      if (node.data.action === "addLiquidity" || node.data.action === "removeLiquidity") {
        return !(node.data.liquidityTokenA && node.data.liquidityTokenB);
      }
    }
    return !(node.data.action && node.data.amount);
  });

  if (unconfiguredNode) {
    return { canExecute: false, reason: `Action "${unconfiguredNode.data.label || unconfiguredNode.data.protocol}" is not fully configured` };
  }

  return { canExecute: true, reason: null };
}

/**
 * Normalizes Uniswap nodes to ensure they have the action field set.
 * Defaults to "swap" if action is missing.
 */
export function normalizeUniswapNodes(nodes: Node<ProtocolNodeData>[]): Node<ProtocolNodeData>[] {
  return nodes.map((node) => {
    if (node.data.protocol === "uniswap") {
      // If action is missing but swapFrom/swapTo exist, set action to "swap"
      if (!node.data.action && (node.data.swapFrom || node.data.swapTo)) {
        return {
          ...node,
          data: {
            ...node.data,
            action: "swap" as const,
          },
        };
      }
      // If action is missing and no swap data, default to "swap"
      if (!node.data.action) {
        return {
          ...node,
          data: {
            ...node.data,
            action: "swap" as const,
          },
        };
      }
    }
    return node;
  });
}
