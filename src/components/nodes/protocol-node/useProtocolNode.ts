import { useState, useEffect, useCallback } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
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
                (n) =>
                    `${n.id}:${(n.data as ProtocolNodeData).sequenceNumber}:${(n.data as ProtocolNodeData).amount}:${(n.data as ProtocolNodeData).estimatedAmountOut}`
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
    const [transferBalances, setTransferBalances] = useState<TokenBalance[]>([]);
    const [isVerifyingContract, setIsVerifyingContract] = useState(false);
    const [contractVerifyError, setContractVerifyError] = useState<string | null>(null);
    const [currentViewValue, setCurrentViewValue] = useState<string | null>(null);
    const [currentViewLoading, setCurrentViewLoading] = useState(false);
    const [currentViewError, setCurrentViewError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

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

    useEffect(() => {
        if (data.protocol === "transfer" && activeAccount && isExpanded) {
            fetchUserBalances(activeAccount).then((baseBalances) => {
                const nodes = getNodes();
                const edges = getEdges();
                const effective = getEffectiveBalances(
                    nodes as import("@xyflow/react").Node<ProtocolNodeData>[],
                    edges as import("@xyflow/react").Edge[],
                    id,
                    baseBalances
                );
                setTransferBalances(effective.filter((token) => Number(token.balance) > 0));
            });
        } else if (data.protocol === "transfer" && !activeAccount) {
            setTransferBalances([]);
        }
    }, [
        data.protocol,
        activeAccount,
        isExpanded,
        fetchUserBalances,
        getNodes,
        getEdges,
        id,
        data.asset,
        data.amount,
        edgesFromStore.length,
        effectiveBalanceDeps,
    ]);

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
