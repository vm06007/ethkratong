import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { TokenBalance } from "./types";

/**
 * Get all action nodes that execute before targetId by sequence order.
 * Used for effective balance: max balance for step N = wallet + effects of steps 1..N-1.
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
 * Get direct predecessors by graph edges (sources that have an edge into targetId).
 * Used as fallback so linked upstream outputs are always reflected even if sequence numbers lag.
 */
function getPredecessorsByEdges(
    nodes: Node<ProtocolNodeData>[],
    edges: Edge[],
    targetId: string
): Node<ProtocolNodeData>[] {
    const sourceIds = new Set(edges.filter((e) => e.target === targetId).map((e) => e.source));
    return nodes.filter((n) => n.data.protocol !== "wallet" && sourceIds.has(n.id));
}

/**
 * Compute effective token balances at a node after applying all prior steps in sequence.
 * E.g. for action #2: balance = wallet + effect of step #1 (e.g. swap adds USDC).
 * Linking only affects initial input value; max/25%/50%/75% use this sequence-based balance.
 */
export function getEffectiveBalances(
    nodes: Node<ProtocolNodeData>[],
    edges: Edge[],
    nodeId: string,
    baseBalances: TokenBalance[]
): TokenBalance[] {
    const seqPreds = getPredecessorsBySequence(nodes, nodeId);
    const edgePreds = getPredecessorsByEdges(nodes, edges, nodeId);
    const seen = new Set<string>();
    const preds: Node<ProtocolNodeData>[] = [];
    for (const n of [...seqPreds, ...edgePreds]) {
        if (!seen.has(n.id)) {
            seen.add(n.id);
            preds.push(n);
        }
    }
    preds.sort((a, b) => (a.data.sequenceNumber ?? 0) - (b.data.sequenceNumber ?? 0));

    const balances: Record<string, number> = {};
    baseBalances.forEach((t) => {
        const n = parseFloat(t.balance);
        balances[t.symbol] = Number.isNaN(n) ? 0 : n;
    });

    const canonicalKey = (sym: string) => sym?.toUpperCase() ?? "";
    const resolveOutSymbol = (to: string) => {
        const key = canonicalKey(to);
        if (!key) return null;
        const match = baseBalances.find((t) => canonicalKey(t.symbol) === key);
        return match ? match.symbol : to;
    };

    for (const node of preds) {
        const d = node.data;
        // Uniswap defaults to swap mode when action is undefined/null
        const isUniswapSwap = d.protocol === "uniswap" && (d.action === "swap" || d.action == null);
        if (isUniswapSwap) {
            const from = d.swapFrom;
            const toRaw = d.estimatedAmountOutSymbol;
            const amountStr = d.amount?.trim();
            const outStr = d.estimatedAmountOut;
            if (from && toRaw && amountStr && outStr != null) {
                const amount = parseFloat(amountStr);
                const out = parseFloat(outStr);
                if (!Number.isNaN(amount)) {
                    const fromKey = baseBalances.find((t) => canonicalKey(t.symbol) === canonicalKey(from))?.symbol ?? from;
                    balances[fromKey] = (balances[fromKey] ?? 0) - amount;
                    if (balances[fromKey] < 0) balances[fromKey] = 0;
                }
                if (!Number.isNaN(out)) {
                    const toKey = resolveOutSymbol(toRaw) ?? toRaw;
                    balances[toKey] = (balances[toKey] ?? 0) + out;
                }
            }
        }
        if (d.protocol === "transfer" && d.asset && d.amount?.trim()) {
            const amt = parseFloat(d.amount);
            if (!Number.isNaN(amt) && d.asset) {
                const assetKey = resolveOutSymbol(d.asset) ?? baseBalances.find((t) => canonicalKey(t.symbol) === canonicalKey(d.asset!))?.symbol ?? d.asset;
                balances[assetKey] = (balances[assetKey] ?? 0) - amt;
                if (balances[assetKey] < 0) balances[assetKey] = 0;
            }
        }
        if (d.protocol === "morpho" && d.asset && d.amount?.trim()) {
            const amt = parseFloat(d.amount);
            if (Number.isNaN(amt)) continue;
            const assetKey = resolveOutSymbol(d.asset) ?? baseBalances.find((t) => canonicalKey(t.symbol) === canonicalKey(d.asset!))?.symbol ?? d.asset;
            if (d.action === "lend" || d.action === "deposit") {
                balances[assetKey] = (balances[assetKey] ?? 0) - amt;
                if (balances[assetKey] < 0) balances[assetKey] = 0;
                // Receipt (vault share) tokens from this Lend for downstream Borrow/Redeem
                const shareSymbol = d.morphoEstimatedSharesSymbol;
                const shareAmt = d.morphoEstimatedShares != null ? parseFloat(d.morphoEstimatedShares) : NaN;
                if (shareSymbol && !Number.isNaN(shareAmt) && shareAmt > 0) {
                    if (balances[shareSymbol] == null) balances[shareSymbol] = 0;
                    balances[shareSymbol] += shareAmt;
                }
            }
            if (d.action === "withdraw" || d.action === "borrow") {
                balances[assetKey] = (balances[assetKey] ?? 0) + amt;
            }
        }
        if (d.protocol === "uniswap" && d.action === "addLiquidity" && d.liquidityTokenA && d.liquidityTokenB) {
            const lpSymbol = `${d.liquidityTokenA}-${d.liquidityTokenB} LP`;
            if (balances[lpSymbol] == null) balances[lpSymbol] = 0;
            const estLp = d.estimatedLpAmount != null ? parseFloat(d.estimatedLpAmount) : NaN;
            if (!Number.isNaN(estLp) && estLp > 0) {
                balances[lpSymbol] += estLp;
            }
        }
    }

    const lpSymbols = Object.keys(balances).filter((s) => s.endsWith(" LP"));
    const vaultShareSymbols = Object.keys(balances).filter(
        (s) => !lpSymbols.includes(s) && !baseBalances.some((t) => t.symbol === s)
    );
    const baseResult = baseBalances.map((t) => {
        const v = balances[t.symbol] ?? 0;
        const formatted =
            v === 0 ? "0.00" : v < 0.01 ? v.toFixed(6) : v.toFixed(2);
        return { symbol: t.symbol, balance: formatted, isLoading: false };
    });
    const lpEntries = lpSymbols.map((symbol) => {
        const v = balances[symbol] ?? 0;
        const balance =
            v === 0 ? "0.00" : v < 0.01 ? v.toFixed(6) : v.toFixed(2);
        return { symbol, balance, isLoading: false };
    });
    const vaultShareEntries = vaultShareSymbols.map((symbol) => {
        const v = balances[symbol] ?? 0;
        const balance =
            v === 0 ? "0.00" : v < 0.01 ? v.toFixed(6) : v.toFixed(2);
        return { symbol, balance, isLoading: false };
    });
    return [...baseResult, ...lpEntries, ...vaultShareEntries];
}
