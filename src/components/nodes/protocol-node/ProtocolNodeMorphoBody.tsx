import type { ProtocolNodeData } from "@/types";
import { UNISWAP_TOKEN_OPTIONS } from "./constants";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import type { TokenBalance } from "./types";

interface ProtocolNodeMorphoBodyProps {
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    template: { availableActions: string[] } | undefined;
}

function getBalanceForSymbol(balances: TokenBalance[], symbol: string): string | null {
    const b = balances.find((x) => x.symbol === symbol);
    return b ? b.balance : null;
}

export function ProtocolNodeMorphoBody({
    data,
    chainId,
    onUpdateData,
    template,
}: ProtocolNodeMorphoBodyProps) {
    const chainIdKey = chainId ?? 1;
    const tokenOptions =
        UNISWAP_TOKEN_OPTIONS[chainIdKey as keyof typeof UNISWAP_TOKEN_OPTIONS] ??
        UNISWAP_TOKEN_OPTIONS[1];

    const { balances } = useWalletBalancesForModal(true);

    const action = data.action || "";
    const needsWalletBalance = action === "lend" || action === "deposit";
    const assetBalance = data.asset ? getBalanceForSymbol(balances, data.asset) : null;

    const setAmountFromBalancePct = (pct: number) => {
        if (!data.asset || !assetBalance) return;
        const num = parseFloat(assetBalance);
        if (Number.isNaN(num)) return;
        const value = pct === 1 ? num : num * pct;
        const str =
            value <= 0 ? "0" : value < 0.0001 ? value.toExponential(2) : value.toFixed(6);
        onUpdateData({ amount: str });
    };

    return (
        <div className="space-y-2">
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Action:
                </label>
                <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                    value={action}
                    onChange={(e) =>
                        onUpdateData({
                            action: (e.target.value || undefined) as ProtocolNodeData["action"],
                        })
                    }
                >
                    <option value="">Select action</option>
                    {template?.availableActions.map((a) => (
                        <option key={a} value={a}>
                            {a.charAt(0).toUpperCase() + a.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {action && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Asset:
                    </label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.asset ?? ""}
                        onChange={(e) =>
                            onUpdateData({ asset: e.target.value || undefined })
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
            )}

            {action && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Amount:
                    </label>
                    <div className="flex gap-1.5 mb-1.5">
                        {([0.25, 0.5, 0.75, 1] as const).map((pct) => {
                            const balance = assetBalance ? parseFloat(assetBalance) : 0;
                            const disabled =
                                !data.asset ||
                                Number.isNaN(balance) ||
                                (needsWalletBalance && balance <= 0);
                            return (
                                <button
                                    key={pct}
                                    type="button"
                                    disabled={disabled}
                                    className="rounded-md px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:pointer-events-none"
                                    onClick={() => setAmountFromBalancePct(pct)}
                                >
                                    {pct === 1 ? "Max" : `${pct * 100}%`}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        type="text"
                        placeholder="0.00"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                        value={data.amount ?? ""}
                        onChange={(e) => onUpdateData({ amount: e.target.value })}
                    />
                </div>
            )}

            {needsWalletBalance &&
                data.asset &&
                data.amount?.trim() &&
                assetBalance != null && (() => {
                    const balance = parseFloat(assetBalance);
                    const amount = parseFloat(data.amount);
                    if (
                        !Number.isNaN(amount) &&
                        !Number.isNaN(balance) &&
                        amount > balance
                    ) {
                        return (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                Amount exceeds balance ({assetBalance} {data.asset})
                            </div>
                        );
                    }
                    return null;
                })()}
        </div>
    );
}
