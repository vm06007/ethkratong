import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { TokenBalance } from "./types";

/**
 * Get all node IDs that are predecessors of targetId (have a path to targetId).
 */
function getPredecessorIds(edges: Edge[], targetId: string): Set<string> {
    const result = new Set<string>();
    const queue: string[] = [targetId];
    const visited = new Set<string>([targetId]);
    const reverseEdges = new Map<string, string[]>();
    edges.forEach((e) => {
        const list = reverseEdges.get(e.target) ?? [];
        list.push(e.source);
        reverseEdges.set(e.target, list);
    });
    while (queue.length > 0) {
        const id = queue.shift()!;
        const sources = reverseEdges.get(id) ?? [];
        for (const src of sources) {
            if (visited.has(src)) continue;
            visited.add(src);
            result.add(src);
            queue.push(src);
        }
    }
    return result;
}

/**
 * Get predecessor node IDs in execution order (wallet first, then by sequence number).
 */
function getPredecessorsInOrder(
    nodes: Node<ProtocolNodeData>[],
    edges: Edge[],
    targetId: string
): Node<ProtocolNodeData>[] {
    const wallet = nodes.find((n) => n.data.protocol === "wallet");
    if (!wallet) return [];
    const predIds = getPredecessorIds(edges, targetId);
    const preds = nodes.filter((n) => predIds.has(n.id));
    return preds.sort((a, b) => {
        const seqA = a.data.sequenceNumber ?? 999999;
        const seqB = b.data.sequenceNumber ?? 999999;
        if (seqA !== seqB) return seqA - seqB;
        return 0;
    });
}

/**
 * Compute effective token balances at a node after applying all predecessor steps.
 * E.g. after Uniswap swap ETH→USDC: less ETH, more USDC.
 */
export function getEffectiveBalances(
    nodes: Node<ProtocolNodeData>[],
    edges: Edge[],
    nodeId: string,
    baseBalances: TokenBalance[]
): TokenBalance[] {
    const preds = getPredecessorsInOrder(nodes, edges, nodeId);
    const balances: Record<string, number> = {};
    baseBalances.forEach((t) => {
        const n = parseFloat(t.balance);
        balances[t.symbol] = Number.isNaN(n) ? 0 : n;
    });

    for (const node of preds) {
        const d = node.data;
        if (d.protocol === "uniswap" && d.action === "swap") {
            const from = d.swapFrom;
            const to = d.estimatedAmountOutSymbol;
            const amountStr = d.amount?.trim();
            const outStr = d.estimatedAmountOut;
            if (from && to && amountStr && outStr != null) {
                const amount = parseFloat(amountStr);
                const out = parseFloat(outStr);
                if (!Number.isNaN(amount)) {
                    balances[from] = (balances[from] ?? 0) - amount;
                    if (balances[from] < 0) balances[from] = 0;
                }
                if (!Number.isNaN(out)) {
                    balances[to] = (balances[to] ?? 0) + out;
                }
            }
        }
        if (d.protocol === "transfer" && d.asset && d.amount?.trim()) {
            const amt = parseFloat(d.amount);
            if (!Number.isNaN(amt) && d.asset) {
                balances[d.asset] = (balances[d.asset] ?? 0) - amt;
                if (balances[d.asset] < 0) balances[d.asset] = 0;
            }
        }
    }

    return baseBalances.map((t) => {
        const v = balances[t.symbol] ?? 0;
        const formatted =
            v === 0 ? "0.00" : v < 0.01 ? v.toFixed(6) : v.toFixed(2);
        return { symbol: t.symbol, balance: formatted, isLoading: false };
    });
}
