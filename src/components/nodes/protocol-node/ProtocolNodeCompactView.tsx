import type { ProtocolNodeData } from "@/types";
import { useAaveReserves } from "./useAaveReserves";

interface ProtocolNodeCompactViewProps {
    data: ProtocolNodeData;
}

function formatApy(apy: number | null | undefined): string {
    if (apy == null || Number.isNaN(apy)) return "";
    const pct = apy * 100;
    return pct >= 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(3)}%`;
}

// Map UI symbols to Aave reserve symbols (ETH -> WETH)
function getAaveReserveSymbol(symbol: string): string {
    if (symbol === "ETH") return "WETH";
    return symbol;
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
                    {action === "lend" &&
                        data.morphoEstimatedShares != null &&
                        data.morphoEstimatedSharesSymbol && (
                            <div className="text-xs text-green-600 dark:text-green-400">
                                Est. out: ~{data.morphoEstimatedShares}{" "}
                                {data.morphoEstimatedSharesSymbol}
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
        } else if (data.action === "swap" || (data.swapFrom && data.swapTo)) {
            // Show swap details if action is swap OR if swapFrom/swapTo exist (for backwards compatibility)
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

    if (data.protocol === "aave") {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { reserves } = useAaveReserves();
        const action = data.action;
        const asset = data.asset;
        const amount = data.amount;
        if (action && asset) {
            const reserve = reserves.find((r) => r.symbol === getAaveReserveSymbol(asset));
            const apy =
                action === "deposit"
                    ? reserve?.supplyAPY
                    : action === "borrow"
                      ? reserve?.variableBorrowAPY
                      : null;
            const apyStr = apy != null ? ` (${formatApy(apy)} APY)` : "";
            return (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-medium">
                        {action.charAt(0).toUpperCase() + action.slice(1)} {asset}
                        {apyStr && (
                            <span className="text-green-600 dark:text-green-400 font-normal">
                                {apyStr}
                            </span>
                        )}
                    </div>
                    {amount && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {amount}
                        </div>
                    )}
                    {action === "deposit" &&
                        data.aaveEstimatedATokens != null &&
                        data.aaveEstimatedATokenSymbol && (
                            <div className="text-xs text-green-600 dark:text-green-400">
                                Est. out: ~{data.aaveEstimatedATokens} {data.aaveEstimatedATokenSymbol}
                            </div>
                        )}
                    {action === "borrow" && data.aaveInterestRateMode && (
                        <div className="text-xs text-blue-500 dark:text-blue-400">
                            {data.aaveInterestRateMode === 1 ? "Stable rate" : "Variable rate"}
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="text-xs italic">Click to set action and asset</div>
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
