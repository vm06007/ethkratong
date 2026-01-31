import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import { allProtocols } from "@/data/protocols";
import { client, chains } from "@/config/thirdweb";
import { getContract } from "thirdweb";
import { balanceOf, decimals } from "thirdweb/extensions/erc20";
import { toTokens } from "thirdweb";
import { useChainId } from "wagmi";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { getAbiViewFunctions } from "@/services/contractService";
import { readContractViewResult, readBalanceResult } from "@/services/batchedExecution";
import { TOKEN_ADDRESSES } from "./constants";
import { getEffectiveBalances } from "./effectiveBalances";
import type { TokenBalance } from "./types";

/**
 * Dependency string so effective balances recalc when any prior step's data changes.
 * E.g. when Uniswap input amount changes → quote/estimatedAmountOut updates → this changes
 * → transfer node's max balance (and 25%/50%/75%/Max) updates so "next card" reflects the new output.
 */
function useEffectiveBalanceDeps() {
    return useStore((s) =>
        s.nodes
            .map(
                (n) => {
                    const d = n.data as ProtocolNodeData;
                    return `${n.id}:${d.sequenceNumber}:${d.amount}:${d.estimatedAmountOut}:${d.estimatedAmountOutSymbol}:${d.swapFrom}:${d.swapTo}:${d.action}:${d.asset}:${d.morphoEstimatedShares}:${d.morphoEstimatedSharesSymbol}:${d.aaveEstimatedATokens}:${d.aaveEstimatedATokenSymbol}`;
                }
            )
            .join("|")
    );
}

export function useProtocolNode(id: string, data: ProtocolNodeData) {
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const edgesFromStore = useStore((s) => s.edges);
    const effectiveBalanceDeps = useEffectiveBalanceDeps();
    const chainId = useChainId();
    const activeAccount = useActiveAccount();

    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
    const [baseBalancesForEffective, setBaseBalancesForEffective] = useState<TokenBalance[]>([]);
    const [isVerifyingContract, setIsVerifyingContract] = useState(false);
    const [contractVerifyError, setContractVerifyError] = useState<string | null>(null);
    const [currentViewValue, setCurrentViewValue] = useState<string | null>(null);
    const [currentViewLoading, setCurrentViewLoading] = useState(false);
    const [currentViewError, setCurrentViewError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoadingBaseBalances, setIsLoadingBaseBalances] = useState(false);

    // Track previous incoming edges to detect when connections change
    const prevIncomingEdgesRef = useRef<string>("");

    const template = allProtocols.find((t) => t.protocol === data.protocol);
    const color = template?.color || "bg-gray-500";
    const isTerminalNode = data.protocol === "transfer" || data.protocol === "custom";

    const currentChain = chains.find((c) => c.id === (chainId || 1)) || chains[0];
    const { data: ethBalanceData, isLoading: isEthLoading } = useWalletBalance({
        client,
        chain: currentChain,
        address: activeAccount?.address,
    });

    const fetchUserBalances = useCallback(
        async (account: NonNullable<typeof activeAccount>): Promise<TokenBalance[]> => {
            const chainIdForBalances = chainId || 1;
            const tokens = TOKEN_ADDRESSES[chainIdForBalances];
            if (!tokens) return [];

            const balancePromises = Object.entries(tokens).map(async ([symbol, address]) => {
                try {
                    const contract = getContract({
                        client,
                        chain: chains.find((c) => c.id === chainIdForBalances) || chains[0],
                        address,
                    });
                    const [balance, tokenDecimals] = await Promise.all([
                        balanceOf({ contract, address: account.address }),
                        decimals({ contract }),
                    ]);
                    const balanceValue = toTokens(balance, tokenDecimals);
                    const numBalance = Number(balanceValue);
                    let formatted: string;
                    if (numBalance === 0) {
                        formatted = "0.00";
                    } else if (numBalance < 0.01) {
                        formatted = numBalance.toFixed(6);
                    } else {
                        formatted = numBalance.toFixed(2);
                    }
                    return { symbol, balance: formatted, isLoading: false };
                } catch (error) {
                    console.error(`Error fetching ${symbol} balance:`, error);
                    return { symbol, balance: "0.00", isLoading: false };
                }
            });

            const tokenResults = await Promise.all(balancePromises);
            let ethBalance: TokenBalance;
            if (ethBalanceData && ethBalanceData.value !== undefined) {
                const ethValue = Number(ethBalanceData.value) / 1e18;
                const formattedEth = ethValue === 0 ? "0.0000" : ethValue.toFixed(4);
                ethBalance = {
                    symbol: ethBalanceData.symbol || "ETH",
                    balance: formattedEth,
                    isLoading: isEthLoading,
                };
            } else {
                ethBalance = { symbol: "ETH", balance: "0.0000", isLoading: isEthLoading };
            }
            return [ethBalance, ...tokenResults];
        },
        [chainId, ethBalanceData, isEthLoading]
    );

    useEffect(() => {
        if (data.protocol === "wallet" && activeAccount) {
            fetchUserBalances(activeAccount).then(setTokenBalances);
        } else if (data.protocol === "wallet" && !activeAccount) {
            setTokenBalances([]);
        }
    }, [data.protocol, activeAccount, fetchUserBalances]);

    useEffect(() => {
        if (
            data.protocol !== "conditional" ||
            !data.contractAddress ||
            !data.contractAbi ||
            !data.selectedFunction
        ) {
            setCurrentViewValue(null);
            setCurrentViewError(null);
            return;
        }
        const fns = getAbiViewFunctions(data.contractAbi);
        const fn = fns.find((f) => f.name === data.selectedFunction);
        const inputs = fn?.inputs ?? [];
        const args = data.functionArgs ?? {};
        const allArgsFilled = inputs.every((inp) => (args[inp.name] ?? "").trim() !== "");
        if (!allArgsFilled) {
            setCurrentViewValue(null);
            setCurrentViewError(null);
            return;
        }
        let cancelled = false;
        setCurrentViewLoading(true);
        setCurrentViewError(null);
        readContractViewResult(
            chainId || 1,
            data.contractAddress,
            data.contractAbi,
            data.selectedFunction,
            data.functionArgs ?? {},
            inputs
        )
            .then((value) => {
                if (!cancelled) setCurrentViewValue(value);
            })
            .catch((err) => {
                if (!cancelled)
                    setCurrentViewError(err instanceof Error ? err.message : "Failed to fetch");
            })
            .finally(() => {
                if (!cancelled) setCurrentViewLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [
        data.protocol,
        data.contractAddress,
        data.contractAbi,
        data.selectedFunction,
        data.functionArgs,
        chainId,
    ]);

    useEffect(() => {
        if (data.protocol !== "balanceLogic" || !data.balanceLogicAddress?.trim()) {
            if (data.protocol === "balanceLogic") {
                setCurrentViewValue(null);
                setCurrentViewError(null);
            }
            return;
        }
        let cancelled = false;
        setCurrentViewLoading(true);
        setCurrentViewError(null);
        readBalanceResult(chainId || 1, data.balanceLogicAddress.trim())
            .then((value) => {
                if (!cancelled) setCurrentViewValue(value);
            })
            .catch((err) => {
                if (!cancelled)
                    setCurrentViewError(err instanceof Error ? err.message : "Failed to fetch balance");
            })
            .finally(() => {
                if (!cancelled) setCurrentViewLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [data.protocol, data.balanceLogicAddress, chainId]);

    const nodesFromStore = useStore((s) => s.nodes) as Node<ProtocolNodeData>[];
    useEffect(() => {
        const useEffective = data.protocol === "transfer" || data.protocol === "morpho" || data.protocol === "aave";
        const runForMorpho = data.protocol === "morpho" && activeAccount;
        const runForAave = data.protocol === "aave" && activeAccount;
        const runForTransfer = data.protocol === "transfer" && activeAccount && isExpanded;
        if (useEffective && (runForTransfer || runForMorpho || runForAave)) {
            setIsLoadingBaseBalances(true);
            fetchUserBalances(activeAccount!)
                .then(setBaseBalancesForEffective)
                .finally(() => setIsLoadingBaseBalances(false));
        } else if (useEffective && !activeAccount) {
            setBaseBalancesForEffective([]);
            setIsLoadingBaseBalances(false);
        }
    }, [
        data.protocol,
        activeAccount,
        isExpanded,
        fetchUserBalances,
    ]);

    const transferBalances = useMemo(() => {
        if (data.protocol !== "transfer" && data.protocol !== "morpho" && data.protocol !== "aave") return [];
        if (data.protocol === "transfer" && !isExpanded) return [];

        if (isLoadingBaseBalances) return [];
        // Transfer needs wallet base balances; morpho/aave can use empty base so upstream vault shares still flow
        if (data.protocol === "transfer" && !baseBalancesForEffective.length) return [];

        const base = baseBalancesForEffective.length ? baseBalancesForEffective : [];
        const effective = getEffectiveBalances(
            nodesFromStore,
            edgesFromStore,
            id,
            base
        );
        return effective.filter(
            (token) => Number(token.balance) > 0 || token.symbol.endsWith(" LP")
        );
    }, [
        data.protocol,
        isExpanded,
        id,
        baseBalancesForEffective,
        nodesFromStore,
        edgesFromStore,
        effectiveBalanceDeps,
        isLoadingBaseBalances,
    ]);

    // When this transfer node receives from swap(s), keep default amount in sync with combined estimated outputs
    useEffect(() => {
        if (data.protocol !== "transfer") return;
        const edges = getEdges();
        const nodes = getNodes() as import("@xyflow/react").Node<ProtocolNodeData>[];
        const incomingSourceIds = edges
            .filter((e) => e.target === id)
            .map((e) => e.source);

        // Track incoming edges to detect when they change
        const edgeKey = incomingSourceIds.sort().join(",");
        const sumsBySymbol: Record<string, number> = {};
        let lpAsset: string | null = null;
        for (const sourceId of incomingSourceIds) {
            const src = nodes.find((n) => n.id === sourceId);
            const d = src?.data as ProtocolNodeData | undefined;
            // Uniswap defaults to swap when action is undefined/null
            if (
                d?.protocol === "uniswap" &&
                (d?.action === "swap" || d?.action == null) &&
                d?.estimatedAmountOutSymbol &&
                d?.estimatedAmountOut != null
            ) {
                const sym = d.estimatedAmountOutSymbol;
                const amt = parseFloat(d.estimatedAmountOut);
                if (!Number.isNaN(amt)) {
                    sumsBySymbol[sym] = (sumsBySymbol[sym] ?? 0) + amt;
                }
            }
            if (
                d?.protocol === "uniswap" &&
                d?.action === "addLiquidity" &&
                d?.liquidityTokenA &&
                d?.liquidityTokenB
            ) {
                lpAsset = `${d.liquidityTokenA}-${d.liquidityTokenB} LP`;
            }
        }
        if (lpAsset) {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id !== id) return node;
                    const current = node.data as ProtocolNodeData;
                    if (current.asset === lpAsset) return node;
                    return {
                        ...node,
                        data: { ...current, asset: lpAsset!, amount: current.amount || "0" },
                    };
                })
            );
            return;
        }
        const symbols = Object.keys(sumsBySymbol);
        if (symbols.length === 0) return;
        const asset = symbols.reduce((a, b) =>
            (sumsBySymbol[a] ?? 0) >= (sumsBySymbol[b] ?? 0) ? a : b
        );
        const total = sumsBySymbol[asset] ?? 0;
        const amountStr =
            total <= 0 ? "0" : total < 0.0001 ? total.toExponential(2) : total.toFixed(6);

        // Check if incoming edges have changed
        const edgesChanged = edgeKey !== prevIncomingEdgesRef.current;
        if (edgesChanged) {
            prevIncomingEdgesRef.current = edgeKey;
        }

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id !== id) return node;
                const current = node.data as ProtocolNodeData;
                // Skip auto-sync if user has manually edited AND edges haven't changed
                if (current.amountManuallyEdited && !edgesChanged) return node;
                if (current.asset === asset && current.amount === amountStr) return node;
                return {
                    ...node,
                    data: { ...current, asset, amount: amountStr, amountManuallyEdited: false },
                };
            })
        );
    }, [data.protocol, id, getNodes, getEdges, setNodes, effectiveBalanceDeps, edgesFromStore.length]);

    // When Morpho node receives from swap (or other upstream), pre-fill amount and asset from combined output
    useEffect(() => {
        if (data.protocol !== "morpho") return;
        const edges = getEdges();
        const nodes = getNodes() as import("@xyflow/react").Node<ProtocolNodeData>[];
        const incomingSourceIds = edges
            .filter((e) => e.target === id)
            .map((e) => e.source);

        // Track incoming edges to detect when they change
        const edgeKey = incomingSourceIds.sort().join(",");

        const sumsBySymbol: Record<string, number> = {};
        for (const sourceId of incomingSourceIds) {
            const src = nodes.find((n) => n.id === sourceId);
            const d = src?.data as ProtocolNodeData | undefined;
            // Uniswap defaults to swap when action is undefined/null
            if (
                d?.protocol === "uniswap" &&
                (d?.action === "swap" || d?.action == null) &&
                d?.estimatedAmountOutSymbol &&
                d?.estimatedAmountOut != null
            ) {
                const sym = d.estimatedAmountOutSymbol;
                const amt = parseFloat(d.estimatedAmountOut);
                if (!Number.isNaN(amt)) {
                    sumsBySymbol[sym] = (sumsBySymbol[sym] ?? 0) + amt;
                }
            }
        }
        const symbols = Object.keys(sumsBySymbol);
        if (symbols.length === 0) return;
        const asset = symbols.reduce((a, b) =>
            (sumsBySymbol[a] ?? 0) >= (sumsBySymbol[b] ?? 0) ? a : b
        );
        const total = sumsBySymbol[asset] ?? 0;
        const amountStr =
            total <= 0 ? "0" : total < 0.0001 ? total.toExponential(2) : total.toFixed(6);

        // Check if incoming edges have changed
        const edgesChanged = edgeKey !== prevIncomingEdgesRef.current;
        if (edgesChanged) {
            prevIncomingEdgesRef.current = edgeKey;
        }

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id !== id) return node;
                const current = node.data as ProtocolNodeData;
                // Skip auto-sync if user has manually edited AND edges haven't changed
                if (current.amountManuallyEdited && !edgesChanged) return node;
                if (current.asset === asset && current.amount === amountStr) return node;
                const assetChanged = current.asset !== asset;
                return {
                    ...node,
                    data: {
                        ...current,
                        asset,
                        amount: amountStr,
                        amountManuallyEdited: false,
                        ...(assetChanged
                            ? {
                                  morphoVaultAddress: undefined,
                                  morphoVaultName: undefined,
                                  morphoVaultApy: undefined,
                              }
                            : {}),
                    },
                };
            })
        );
    }, [data.protocol, id, getNodes, getEdges, setNodes, effectiveBalanceDeps, edgesFromStore.length]);

    const updateNodeData = useCallback(
        (updates: Partial<ProtocolNodeData>) => {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === id) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                ...updates,
                            },
                        };
                    }
                    return node;
                })
            );
        },
        [id, setNodes]
    );

    return {
        isExpanded,
        setIsExpanded,
        template,
        color,
        isTerminalNode,
        tokenBalances,
        transferBalances,
        isLoadingEffectiveBalances: isLoadingBaseBalances,
        isVerifyingContract,
        setIsVerifyingContract,
        contractVerifyError,
        setContractVerifyError,
        currentViewValue,
        currentViewLoading,
        currentViewError,
        currentChain,
        activeAccount,
        chainId,
        ethBalanceData,
        isEthLoading,
        updateNodeData,
        fetchUserBalances,
    };
}
