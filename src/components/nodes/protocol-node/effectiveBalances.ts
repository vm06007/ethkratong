import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { TokenBalance } from "./types";

/**
 * Get all action nodes that execute before targetId by sequence order.
 * Used for effective balance: max balance for step N = wallet + effects of steps 1..N-1.
 * Connection/linking does not change this — only sequence number does.
 */
function getPredecessorsBySequence(
    nodes: Node<ProtocolNodeData>[],
    targetId: string
): Node<ProtocolNodeData>[] {
    const target = nodes.find((n) => n.id === targetId);
    if (!target) return [];
    const targetSeq = typeof target.data.sequenceNumber === "number" ? target.data.sequenceNumber : 999999;
    return nodes
        .filter((n) => n.data.protocol !== "wallet" && typeof n.data.sequenceNumber === "number" && n.data.sequenceNumber < targetSeq)
        .sort((a, b) => (a.data.sequenceNumber ?? 0) - (b.data.sequenceNumber ?? 0));
}

/**
 * Compute effective token balances at a node after applying all prior steps in sequence.
 * E.g. for action #2: balance = wallet + effect of step #1 (e.g. swap adds USDC).
 * Linking only affects initial input value; max/25%/50%/75% use this sequence-based balance.
 */
export function getEffectiveBalances(
    nodes: Node<ProtocolNodeData>[],
    _edges: Edge[],
    nodeId: string,
    baseBalances: TokenBalance[]
): TokenBalance[] {
    const preds = getPredecessorsBySequence(nodes, nodeId);
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
