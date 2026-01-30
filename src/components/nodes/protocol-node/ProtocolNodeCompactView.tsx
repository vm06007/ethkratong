import type { ProtocolNodeData } from "@/types";

interface ProtocolNodeCompactViewProps {
    data: ProtocolNodeData;
}

export function ProtocolNodeCompactView({ data }: ProtocolNodeCompactViewProps) {
    if (data.protocol === "transfer") {
        const configured =
            data.asset && data.amount && data.recipientAddress;
        if (configured) {
            return (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div>
                        <span className="font-medium">Transfer</span>
                        {data.amount && data.asset && (
                            <span>
                                {" "}
                                • {data.amount} {data.asset}
                            </span>
                        )}
                    </div>
                    {data.recipientAddress && (
                        <div className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                            to{" "}
                            {data.recipientAddress.endsWith(".eth") ||
                            data.recipientAddress.length <= 20
                                ? data.recipientAddress
                                : `${data.recipientAddress.slice(0, 8)}...${data.recipientAddress.slice(-6)}`}
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="text-xs italic">Click header to configure</div>
            </div>
        );
    }

    if (data.protocol === "custom") {
        if (
            data.customContractVerified &&
            data.contractAddress &&
            data.selectedFunction
        ) {
            return (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-mono text-xs truncate" title={data.contractAddress}>
                        {data.contractAddress.slice(0, 8)}...{data.contractAddress.slice(-6)}
                    </div>
                    <div className="font-medium">{data.selectedFunction}</div>
                </div>
            );
        }
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="text-xs italic">Click to set contract address</div>
            </div>
        );
    }

    if (data.protocol === "conditional") {
        if (
            data.conditionalContractVerified &&
            data.contractAddress &&
            data.selectedFunction &&
            data.comparisonOperator != null
        ) {
            return (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-mono text-xs truncate" title={data.contractAddress}>
                        {data.contractAddress.slice(0, 8)}...{data.contractAddress.slice(-6)}
                    </div>
                    <div className="font-medium">
                        {data.selectedFunction} {data.comparisonOperator}{" "}
                        {data.compareValue ?? ""}
                    </div>
                </div>
            );
        }
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="text-xs italic">Click to set contract and condition</div>
            </div>
        );
    }

    if (data.protocol === "balanceLogic") {
        if (
            data.balanceLogicAddress &&
            data.balanceLogicComparisonOperator != null &&
            (data.balanceLogicCompareValue ?? "").trim() !== ""
        ) {
            return (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-mono text-xs truncate" title={data.balanceLogicAddress}>
                        {data.balanceLogicAddress.slice(0, 8)}...{data.balanceLogicAddress.slice(-6)}
                    </div>
                    <div className="font-medium">
                        ETH balance {data.balanceLogicComparisonOperator}{" "}
                        {data.balanceLogicCompareValue ?? ""}
                    </div>
                </div>
            );
        }
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="text-xs italic">Click to set address and condition</div>
            </div>
        );
    }

    if (data.protocol === "morpho") {
        const action = data.action;
        const asset = data.asset;
        const amount = data.amount;
        const vaultLabel = data.morphoVaultName ?? asset;
        const apyPct =
            data.morphoVaultApy != null && !Number.isNaN(data.morphoVaultApy)
                ? (data.morphoVaultApy * 100).toFixed(2)
                : null;
        if (action && (asset || data.morphoVaultAddress)) {
            return (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-medium">
                        {action.charAt(0).toUpperCase() + action.slice(1)}{" "}
                        {vaultLabel}
                        {apyPct != null && (
                            <span className="text-green-600 dark:text-green-400 font-normal">
                                {" "}
                                ({apyPct}% APY)
                            </span>
                        )}
                    </div>
                    {amount && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {amount}
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="text-xs italic">Click to set action and vault/asset</div>
            </div>
        );
    }

    if (data.protocol === "uniswap") {
        if (data.action === "addLiquidity") {
            const a = data.liquidityTokenA;
            const b = data.liquidityTokenB;
            if (a && b) {
                return (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="font-medium">Liquidity {a}/{b}</div>
                        {data.amount && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {data.amount}
                            </div>
                        )}
                    </div>
                );
            }
        } else if (data.action === "removeLiquidity") {
            const a = data.liquidityTokenA;
            const b = data.liquidityTokenB;
            if (a && b) {
                return (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="font-medium">Remove {a}/{b}</div>
                    </div>
                );
            }
        } else if (data.action === "swap") {
            const from = data.swapFrom;
            const to = data.swapTo;
            if (from || to) {
                return (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="font-medium">
                            Swap {from ?? "…"} → {to ?? "…"}
                        </div>
                        {data.amount && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {data.amount}
                            </div>
                        )}
                        {data.estimatedAmountOut != null &&
                            data.estimatedAmountOutSymbol && (
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                Est. out: ~{data.estimatedAmountOut}{" "}
                                {data.estimatedAmountOutSymbol}
                            </div>
                        )}
                    </div>
                );
            }
        }
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="text-xs italic">Click to set pair or swap</div>
            </div>
        );
    }

    if (data.action) {
        return (
            <div className="text-sm text-gray-600 dark:text-gray-300">
                <div>
                    <span className="font-medium">{data.action}</span>
                    {data.asset && <span> • {data.asset}</span>}
                </div>
                {data.amount && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {data.amount}
                    </div>
                )}
            </div>
        );
    }

    return null;
}
