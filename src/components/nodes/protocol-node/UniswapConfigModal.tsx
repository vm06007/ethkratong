import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProtocolNodeData } from "@/types";
import { ProtocolNodeUniswapBody } from "./ProtocolNodeUniswapBody";
import { useUniswapQuote } from "./useUniswapQuote";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import { useUniswapPositions } from "./useUniswapPositions";
import { allProtocols } from "@/data/protocols";

const UNISWAP_VERSIONS = [
    { value: "v2" as const, label: "V2" },
    { value: "v3" as const, label: "V3" },
    { value: "v4" as const, label: "V4" },
];

const SWAP_DEADLINE_OPTIONS = [
    { value: 5, label: "5 minutes" },
    { value: 10, label: "10 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "60 minutes" },
];

export interface UniswapConfigModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
}

export function UniswapConfigModal({
    open,
    onOpenChange,
    data,
    chainId,
    onUpdateData,
}: UniswapConfigModalProps) {
    const [showDetails, setShowDetails] = useState(true);
    const template = allProtocols.find((t) => t.protocol === "uniswap");
    const { balances } = useWalletBalancesForModal(open);
    const { hasPositions } = useUniswapPositions(chainId ?? undefined);

    const quote = useUniswapQuote(
        chainId,
        data.action === "swap" ? data.swapFrom : undefined,
        data.action === "swap" ? data.swapTo : undefined,
        data.action === "swap" ? data.amount : undefined
    );

    const isSwap = data.action === "swap";
    const slippageAuto = data.maxSlippageAuto !== false;
    const slippagePercent = data.maxSlippagePercent ?? "0.5";
    const deadlineMinutes = data.swapDeadlineMinutes ?? 30;

    const rateText =
        isSwap &&
        data.swapFrom &&
        data.swapTo &&
        quote.amountOutFormatted &&
        data.amount?.trim()
            ? `1 ${data.swapFrom} = ${(
                  parseFloat(quote.amountOutFormatted) / parseFloat(data.amount || "1")
              ).toFixed(2)} ${data.swapTo}`
            : null;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={cn(
                        "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    )}
                />
                <Dialog.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-lg translate-x-[-50%] translate-y-[-50%]",
                        "rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl",
                        "flex flex-col overflow-hidden max-h-[90vh]",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                        <Dialog.Title className="text-lg font-semibold text-white">
                            {isSwap ? "You're swapping" : "Uniswap — Step configuration"}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex flex-col overflow-y-auto">
                        <div className="px-4 py-4 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-400 block mb-2">
                                    Action
                                </label>
                                <select
                                    className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-800 text-white"
                                    value={data.action ?? ""}
                                    onChange={(e) =>
                                        onUpdateData({
                                            action: e.target.value as ProtocolNodeData["action"],
                                        })
                                    }
                                >
                                    <option value="">Select action</option>
                                    {template?.availableActions.map((action) => {
                                        const label =
                                            action === "addLiquidity"
                                                ? "Add liquidity"
                                                : action === "removeLiquidity"
                                                    ? "Remove liquidity"
                                                    : action.charAt(0).toUpperCase() + action.slice(1);
                                        const disabled =
                                            action === "removeLiquidity" && !hasPositions;
                                        return (
                                            <option
                                                key={action}
                                                value={action}
                                                disabled={disabled}
                                            >
                                                {label}
                                                {disabled ? " (no positions)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Uniswap version — auto (best route) or manual v2/v3/v4 */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-400 block">
                                    Uniswap version
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onUpdateData({
                                                uniswapVersionAuto: true,
                                            })
                                        }
                                        className={cn(
                                            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            data.uniswapVersionAuto !== false
                                                ? "bg-violet-600 text-white"
                                                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                        )}
                                    >
                                        Auto (best route)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onUpdateData({
                                                uniswapVersionAuto: false,
                                                uniswapVersion: data.uniswapVersion ?? "v2",
                                            })
                                        }
                                        className={cn(
                                            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            data.uniswapVersionAuto === false
                                                ? "bg-violet-600 text-white"
                                                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                        )}
                                    >
                                        Manual
                                    </button>
                                </div>
                                {data.uniswapVersionAuto !== false ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Version chosen automatically based on best quote (V2 used for execution until multi-version).
                                    </p>
                                ) : (
                                    <select
                                        value={data.uniswapVersion ?? "v2"}
                                        onChange={(e) =>
                                            onUpdateData({
                                                uniswapVersion: e.target
                                                    .value as "v2" | "v3" | "v4",
                                            })
                                        }
                                        className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-800 text-white mt-1"
                                    >
                                        {UNISWAP_VERSIONS.map((v) => (
                                            <option key={v.value} value={v.value}>
                                                {v.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {isSwap ? (
                                <>
                                    <ProtocolNodeUniswapBody
                                        data={data}
                                        chainId={chainId}
                                        onUpdateData={onUpdateData}
                                        balances={balances}
                                    />

                                    {/* Swap summary — Uniswap-style */}
                                    {data.swapFrom && data.swapTo && data.amount?.trim() && (
                                        <div className="rounded-xl bg-gray-800/80 border border-gray-700 p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-semibold text-white">
                                                        {data.amount}
                                                    </span>
                                                    <span className="text-sm text-gray-400">
                                                        {data.swapFrom}
                                                    </span>
                                                </div>
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    {quote.loading ? (
                                                        <span className="text-2xl font-semibold text-gray-400">
                                                            …
                                                        </span>
                                                    ) : quote.amountOutFormatted ? (
                                                        <span className="text-2xl font-semibold text-white">
                                                            {quote.amountOutFormatted}
                                                        </span>
                                                    ) : (
                                                        <span className="text-2xl font-semibold text-gray-500">
                                                            —
                                                        </span>
                                                    )}
                                                    <span className="text-sm text-gray-400">
                                                        {data.swapTo}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Expandable details */}
                                    <div className="rounded-xl border border-gray-700 overflow-hidden">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-800 text-left text-sm font-medium text-gray-300"
                                            onClick={() => setShowDetails(!showDetails)}
                                        >
                                            <span>
                                                {showDetails ? "Show less" : "Show more"}
                                            </span>
                                            {showDetails ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                        {showDetails && (
                                            <div className="px-4 py-3 space-y-3 bg-gray-800/30 border-t border-gray-700">
                                                {rateText && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-400">Rate</span>
                                                        <span className="text-white font-medium">
                                                            {rateText}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-1.5 text-gray-400">
                                                        Fee
                                                        <Info className="w-3.5 h-3.5 text-gray-500" />
                                                    </span>
                                                    <span className="text-violet-400">Free</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-1.5 text-gray-400">
                                                        Network cost
                                                        <Info className="w-3.5 h-3.5 text-gray-500" />
                                                    </span>
                                                    <span className="text-gray-400">—</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-1.5 text-gray-400">
                                                        Order routing
                                                        <Info className="w-3.5 h-3.5 text-gray-500" />
                                                    </span>
                                                    <span className="text-white">Uniswap API</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-1.5 text-gray-400">
                                                        Price impact
                                                        <Info className="w-3.5 h-3.5 text-gray-500" />
                                                    </span>
                                                    <span className="text-gray-400">—</span>
                                                </div>

                                                {/* Max slippage — adjustable */}
                                                <div className="flex justify-between items-center text-sm gap-2 pt-2 border-t border-gray-700">
                                                    <span className="flex items-center gap-1.5 text-gray-400">
                                                        Max slippage
                                                        <Info className="w-3.5 h-3.5 text-gray-500" />
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onUpdateData({
                                                                    maxSlippageAuto: true,
                                                                })
                                                            }
                                                            className={cn(
                                                                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                                                slippageAuto
                                                                    ? "bg-violet-600 text-white"
                                                                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                                            )}
                                                        >
                                                            Auto
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={slippagePercent}
                                                            onChange={(e) =>
                                                                onUpdateData({
                                                                    maxSlippagePercent: e.target
                                                                        .value,
                                                                    maxSlippageAuto: false,
                                                                })
                                                            }
                                                            onFocus={() =>
                                                                onUpdateData({ maxSlippageAuto: false })
                                                            }
                                                            className="w-16 rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white text-right"
                                                        />
                                                        <span className="text-gray-400">%</span>
                                                    </div>
                                                </div>

                                                {/* Swap deadline — adjustable */}
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-1.5 text-gray-400">
                                                        Swap deadline
                                                        <Info className="w-3.5 h-3.5 text-gray-500" />
                                                    </span>
                                                    <select
                                                        value={deadlineMinutes}
                                                        onChange={(e) =>
                                                            onUpdateData({
                                                                swapDeadlineMinutes: Number(
                                                                    e.target.value
                                                                ),
                                                            })
                                                        }
                                                        className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white"
                                                    >
                                                        {SWAP_DEADLINE_OPTIONS.map((opt) => (
                                                            <option
                                                                key={opt.value}
                                                                value={opt.value}
                                                            >
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <ProtocolNodeUniswapBody
                                    data={data}
                                    chainId={chainId}
                                    onUpdateData={onUpdateData}
                                    balances={balances}
                                />
                            )}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
