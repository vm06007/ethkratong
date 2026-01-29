import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import type { ProtocolNodeData } from "@/types";
import { getAbiViewFunctions } from "@/services/contractService";
import { isContractAddress, fetchContractAbi } from "@/services/contractService";
import { COMPARISON_OPTIONS } from "./constants";

interface ProtocolNodeConditionalBodyProps {
    data: ProtocolNodeData;
    chainId: number | undefined;
    isVerifyingContract: boolean;
    contractVerifyError: string | null;
    currentViewValue: string | null;
    currentViewLoading: boolean;
    currentViewError: string | null;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    onSetVerifying: (v: boolean) => void;
    onSetVerifyError: (err: string | null) => void;
}

export function ProtocolNodeConditionalBody({
    data,
    chainId: chainIdProp,
    isVerifyingContract,
    contractVerifyError,
    currentViewValue,
    currentViewLoading,
    currentViewError,
    onUpdateData,
    onSetVerifying,
    onSetVerifyError,
}: ProtocolNodeConditionalBodyProps) {
    const chainId = chainIdProp || 1;

    const handleVerify = async () => {
        const addr = data.contractAddress?.trim();
        if (!addr) return;
        onSetVerifying(true);
        onSetVerifyError(null);
        try {
            const isContract = await isContractAddress(chainId, addr);
            if (!isContract) {
                onSetVerifyError("Address is not a contract (no bytecode)");
                return;
            }
            const abi = await fetchContractAbi(chainId, addr);
            onUpdateData({
                contractAbi: abi,
                conditionalContractVerified: true,
                selectedFunction: undefined,
                functionArgs: undefined,
            });
        } catch (err) {
            onSetVerifyError(
                err instanceof Error ? err.message : "Failed to verify or fetch ABI"
            );
        } finally {
            onSetVerifying(false);
        }
    };

    return (
        <>
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Contract Address:
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="0x..."
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                        value={data.contractAddress || ""}
                        onChange={(e) => {
                            onUpdateData({
                                contractAddress: e.target.value.trim() || undefined,
                                conditionalContractVerified: false,
                                contractAbi: undefined,
                                selectedFunction: undefined,
                                functionArgs: undefined,
                                comparisonOperator: undefined,
                                compareValue: undefined,
                            });
                            onSetVerifyError(null);
                        }}
                    />
                    <button
                        type="button"
                        disabled={!data.contractAddress?.trim() || isVerifyingContract}
                        className={
                            data.conditionalContractVerified
                                ? "px-3 py-1 rounded text-sm font-medium shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "px-3 py-1 rounded text-sm font-medium shrink-0 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                        }
                        onClick={handleVerify}
                    >
                        {isVerifyingContract ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : data.conditionalContractVerified ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            "Verify"
                        )}
                    </button>
                </div>
                {contractVerifyError && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {contractVerifyError}
                    </div>
                )}
            </div>
            {data.conditionalContractVerified && data.contractAbi && (
                <>
                    <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                            View Function:
                        </label>
                        <select
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                            value={data.selectedFunction || ""}
                            onChange={(e) => {
                                const name = e.target.value || undefined;
                                onUpdateData({
                                    selectedFunction: name,
                                    functionArgs: undefined,
                                });
                            }}
                        >
                            <option value="">Select view function</option>
                            {getAbiViewFunctions(data.contractAbi).map((fn) => (
                                <option key={fn.name} value={fn.name}>
                                    {fn.name}
                                    {fn.inputs?.length
                                        ? `(${fn.inputs.map((i) => i.type).join(", ")})`
                                        : "()"}
                                </option>
                            ))}
                        </select>
                    </div>
                    {data.selectedFunction && (() => {
                        const fns = getAbiViewFunctions(data.contractAbi);
                        const fn = fns.find((f) => f.name === data.selectedFunction);
                        const inputs = fn?.inputs || [];
                        return inputs.length > 0 ? (
                            <div className="space-y-2">
                                <label className="text-xs text-gray-600 dark:text-gray-400 block">
                                    Arguments:
                                </label>
                                {inputs.map((input) => (
                                    <div key={input.name}>
                                        <label className="text-xs text-gray-500 dark:text-gray-500 block mb-0.5">
                                            {input.name} ({input.type})
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={input.type}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                                            value={data.functionArgs?.[input.name] ?? ""}
                                            onChange={(e) => {
                                                onUpdateData({
                                                    functionArgs: {
                                                        ...(data.functionArgs || {}),
                                                        [input.name]: e.target.value,
                                                    },
                                                });
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : null;
                    })()}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                                Condition
                            </label>
                            <select
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                                value={data.comparisonOperator ?? ""}
                                onChange={(e) => {
                                    onUpdateData({
                                        comparisonOperator: (e.target.value ||
                                            undefined) as ProtocolNodeData["comparisonOperator"],
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
                                Value
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 0 or true"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                                value={data.compareValue ?? ""}
                                onChange={(e) =>
                                    onUpdateData({ compareValue: e.target.value || undefined })
                                }
                            />
                        </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {currentViewLoading ? (
                            <span className="flex items-center gap-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                Current value: loading…
                            </span>
                        ) : currentViewError ? (
                            <span className="text-red-600 dark:text-red-400">
                                Current value: {currentViewError}
                            </span>
                        ) : currentViewValue !== null ? (
                            <span className="font-mono">Current value: {currentViewValue}</span>
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
