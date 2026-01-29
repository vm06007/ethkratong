import { useEffect } from "react";
import type { ProtocolNodeData } from "@/types";
import { UNISWAP_TOKEN_OPTIONS } from "./constants";
import { useUniswapQuote } from "./useUniswapQuote";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import type { TokenBalance } from "./types";

interface ProtocolNodeUniswapBodyProps {
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    /** When provided (e.g. from modal), use these for dropdown labels and quick amount. Else fetch when mounted. */
    balances?: TokenBalance[];
}

function getBalanceForSymbol(balances: TokenBalance[], symbol: string): string | null {
    const b = balances.find((x) => x.symbol === symbol);
    return b ? b.balance : null;
}

export function ProtocolNodeUniswapBody({
    data,
    chainId,
    onUpdateData,
    balances: balancesProp,
}: ProtocolNodeUniswapBodyProps) {
    const chainIdKey = chainId ?? 1;
    const tokenOptions =
        UNISWAP_TOKEN_OPTIONS[chainIdKey as keyof typeof UNISWAP_TOKEN_OPTIONS] ??
        UNISWAP_TOKEN_OPTIONS[1];

    const { balances: balancesFetched } = useWalletBalancesForModal(!balancesProp);
    const balances = balancesProp ?? balancesFetched;

    const quote = useUniswapQuote(
        chainId,
        data.action === "swap" ? data.swapFrom : undefined,
        data.action === "swap" ? data.swapTo : undefined,
        data.action === "swap" ? data.amount : undefined
    );

    useEffect(() => {
        if (data.action !== "swap") return;
        const amountSet = (data.amount ?? "").trim() !== "";
        if (
            quote.amountOutFormatted != null &&
            data.swapTo &&
            amountSet
        ) {
            onUpdateData({
                estimatedAmountOut: quote.amountOutFormatted,
                estimatedAmountOutSymbol: data.swapTo,
            });
        } else if (
            !amountSet &&
            (data.estimatedAmountOut != null || data.estimatedAmountOutSymbol != null)
        ) {
            onUpdateData({
                estimatedAmountOut: undefined,
                estimatedAmountOutSymbol: undefined,
            });
        }
    }, [
        quote.amountOutFormatted,
        data.action,
        data.swapTo,
        data.amount,
        data.estimatedAmountOut,
        data.estimatedAmountOutSymbol,
        onUpdateData,
    ]);

    if (data.action === "addLiquidity") {
        return (
            <div className="space-y-2">
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Pair — Token A
                    </label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.liquidityTokenA ?? ""}
                        onChange={(e) =>
                            onUpdateData({ liquidityTokenA: e.target.value || undefined })
                        }
                    >
                        <option value="">Select token</option>
                        {tokenOptions.map((symbol) => {
                            const bal = getBalanceForSymbol(balances, symbol);
                            return (
                                <option key={symbol} value={symbol}>
                                    {bal != null ? `${symbol} (${bal})` : symbol}
                                </option>
                            );
                        })}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Pair — Token B
                    </label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.liquidityTokenB ?? ""}
                        onChange={(e) =>
                            onUpdateData({ liquidityTokenB: e.target.value || undefined })
                        }
                    >
                        <option value="">Select token</option>
                        {tokenOptions.map((symbol) => {
                            const bal = getBalanceForSymbol(balances, symbol);
                            return (
                                <option key={symbol} value={symbol}>
                                    {bal != null ? `${symbol} (${bal})` : symbol}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>
        );
    }

    const swapFromBalance = data.swapFrom ? getBalanceForSymbol(balances, data.swapFrom) : null;

    const setAmountFromBalancePct = (pct: number) => {
        if (!swapFromBalance) return;
        const num = parseFloat(swapFromBalance);
        if (Number.isNaN(num)) return;
        const value = pct === 1 ? num : num * pct;
        const str = value <= 0 ? "0" : value < 0.0001 ? value.toExponential(2) : value.toFixed(6);
        onUpdateData({ amount: str });
    };

    return (
        <div className="space-y-2">
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Swap from
                </label>
                <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                    value={data.swapFrom ?? ""}
                    onChange={(e) =>
                        onUpdateData({ swapFrom: e.target.value || undefined })
                    }
                >
                    <option value="">Select token</option>
                    {tokenOptions.map((symbol) => {
                        const bal = getBalanceForSymbol(balances, symbol);
                        return (
                            <option key={symbol} value={symbol}>
                                {bal != null ? `${symbol} (${bal})` : symbol}
                            </option>
                        );
                    })}
                </select>
                {data.swapFrom && swapFromBalance != null && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Balance: {swapFromBalance} {data.swapFrom}
                    </div>
                )}
            </div>
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Swap to
                </label>
                <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                    value={data.swapTo ?? ""}
                    onChange={(e) =>
                        onUpdateData({ swapTo: e.target.value || undefined })
                    }
                >
                    <option value="">Select token</option>
                    {tokenOptions.map((symbol) => {
                        const bal = getBalanceForSymbol(balances, symbol);
                        return (
                            <option key={symbol} value={symbol}>
                                {bal != null ? `${symbol} (${bal})` : symbol}
                            </option>
                        );
                    })}
                </select>
            </div>
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Amount
                </label>
                <div className="flex gap-1.5 mb-1.5">
                    {([0.25, 0.5, 0.75, 1] as const).map((pct) => (
                        <button
                            key={pct}
                            type="button"
                            disabled={!swapFromBalance}
                            className="rounded-md px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:pointer-events-none"
                            onClick={() => setAmountFromBalancePct(pct)}
                        >
                            {pct === 1 ? "Max" : `${pct * 100}%`}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="0.00"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                    value={data.amount ?? ""}
                    onChange={(e) => onUpdateData({ amount: e.target.value })}
                />
            </div>
            {(data.swapFrom === "ETH" && data.swapTo && data.amount?.trim()) && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    {quote.loading ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Loading quote…
                        </div>
                    ) : quote.error ? (
                        <div className="text-sm text-amber-600 dark:text-amber-400">
                            {quote.error}
                        </div>
                    ) : quote.amountOutFormatted != null ? (
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            Est. out: ~{quote.amountOutFormatted} {data.swapTo}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
