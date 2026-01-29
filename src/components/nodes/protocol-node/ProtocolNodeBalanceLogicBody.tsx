import { Loader2 } from "lucide-react";
import type { ProtocolNodeData } from "@/types";
import { COMPARISON_OPTIONS } from "./constants";
import { isAddress } from "viem";

interface ProtocolNodeBalanceLogicBodyProps {
    data: ProtocolNodeData;
    currentViewValue: string | null;
    currentViewLoading: boolean;
    currentViewError: string | null;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
}

export function ProtocolNodeBalanceLogicBody({
    data,
    currentViewValue,
    currentViewLoading,
    currentViewError,
    onUpdateData,
}: ProtocolNodeBalanceLogicBodyProps) {
    const addressValid = data.balanceLogicAddress?.trim()
        ? isAddress(data.balanceLogicAddress.trim())
        : false;

    return (
        <>
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Address (EOA or contract):
                </label>
                <input
                    type="text"
                    placeholder="0x..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                    value={data.balanceLogicAddress || ""}
                    onChange={(e) => {
                        onUpdateData({
                            balanceLogicAddress: e.target.value.trim() || undefined,
                            balanceLogicComparisonOperator: undefined,
                            balanceLogicCompareValue: undefined,
                        });
                    }}
                />
            </div>
            {addressValid && (
                <>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                                Condition
                            </label>
                            <select
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                                value={data.balanceLogicComparisonOperator ?? ""}
                                onChange={(e) => {
                                    onUpdateData({
                                        balanceLogicComparisonOperator: (e.target.value ||
                                            undefined) as ProtocolNodeData["balanceLogicComparisonOperator"],
                                    });
                                }}
                            >
                                <option value="">Compare</option>
                                {COMPARISON_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                                Value (ETH)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 1.5"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                                value={data.balanceLogicCompareValue ?? ""}
                                onChange={(e) =>
                                    onUpdateData({
                                        balanceLogicCompareValue: e.target.value || undefined,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {currentViewLoading ? (
                            <span className="flex items-center gap-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                Current ETH balance: loading…
                            </span>
                        ) : currentViewError ? (
                            <span className="text-red-600 dark:text-red-400">
                                Current ETH balance: {currentViewError}
                            </span>
                        ) : currentViewValue !== null ? (
                            <span className="font-mono">
                                Current ETH balance: {currentViewValue}
                            </span>
                        ) : null}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        If condition is TRUE, execution proceeds to the next step.
                    </p>
                </>
            )}
        </>
    );
}
