import type { ProtocolNodeData } from "@/types";
import { UNISWAP_TOKEN_OPTIONS } from "./constants";

interface ProtocolNodeUniswapBodyProps {
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
}

export function ProtocolNodeUniswapBody({
    data,
    chainId,
    onUpdateData,
}: ProtocolNodeUniswapBodyProps) {
    const chainIdKey = chainId ?? 1;
    const tokenOptions =
        UNISWAP_TOKEN_OPTIONS[chainIdKey as keyof typeof UNISWAP_TOKEN_OPTIONS] ??
        UNISWAP_TOKEN_OPTIONS[1];

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
                        {tokenOptions.map((symbol) => (
                            <option key={symbol} value={symbol}>
                                {symbol}
                            </option>
                        ))}
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
                        {tokenOptions.map((symbol) => (
                            <option key={symbol} value={symbol}>
                                {symbol}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

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
                    {tokenOptions.map((symbol) => (
                        <option key={symbol} value={symbol}>
                            {symbol}
                        </option>
                    ))}
                </select>
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
                    {tokenOptions.map((symbol) => (
                        <option key={symbol} value={symbol}>
                            {symbol}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Amount
                </label>
                <input
                    type="text"
                    placeholder="0.00"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                    value={data.amount ?? ""}
                    onChange={(e) => onUpdateData({ amount: e.target.value })}
                />
            </div>
        </div>
    );
}
