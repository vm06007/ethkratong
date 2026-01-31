import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProtocolNodeData } from "@/types";
import { ProtocolNodeAaveBody } from "./ProtocolNodeAaveBody";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import { allProtocols } from "@/data/protocols";

export interface AaveConfigModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    effectiveBalances?: Array<{ symbol: string; balance: string; isLoading: boolean }>;
    isLoadingEffectiveBalances?: boolean;
}

export function AaveConfigModal({
    open,
    onOpenChange,
    data,
    chainId,
    onUpdateData,
    effectiveBalances,
    isLoadingEffectiveBalances,
}: AaveConfigModalProps) {
    const [showDetails, setShowDetails] = useState(true);
    const template = allProtocols.find((t) => t.protocol === "aave");
    const { balances } = useWalletBalancesForModal(open);

    const displayBalances = effectiveBalances && effectiveBalances.length > 0
        ? effectiveBalances
        : balances;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={cn(
                        "fixed inset-0 z-[100] bg-black/60 dark:bg-black/60 backdrop-blur-sm",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    )}
                />
                <Dialog.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-lg translate-x-[-50%] translate-y-[-50%]",
                        "rounded-xl border shadow-2xl",
                        "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
                        "flex flex-col max-h-[85vh]",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    <div className="flex items-center justify-between border-b px-4 py-3 border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                            Aave — Expanded View
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Protocol info */}
                        <div className="rounded-lg border p-3 bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-700/30">
                            <div className="text-sm text-pink-900 dark:text-pink-200">
                                <strong>Aave V3</strong> — Decentralized liquidity protocol with cross-collateral lending
                            </div>
                        </div>

                        {/* Main configuration */}
                        <div className="space-y-3">
                            <ProtocolNodeAaveBody
                                data={data}
                                chainId={chainId}
                                onUpdateData={onUpdateData}
                                template={template}
                                effectiveBalances={displayBalances}
                                isLoadingEffectiveBalances={isLoadingEffectiveBalances}
                            />
                        </div>

                        {/* Details section */}
                        <div className="rounded-lg border bg-gray-50 border-gray-300 dark:border-gray-700 dark:bg-gray-800/50">
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="w-full flex items-center justify-between px-4 py-3 text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/30 transition-colors"
                            >
                                <span className="font-medium">Details</span>
                                {showDetails ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </button>

                            {showDetails && (
                                <div className="px-4 pb-4 space-y-3 text-sm">
                                    {data.action && (
                                        <div className="py-2 border-t border-gray-300 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400">Action:</span>
                                            <span className="text-gray-900 dark:text-gray-200 font-medium ml-2">
                                                {data.action.charAt(0).toUpperCase() + data.action.slice(1)}
                                            </span>
                                        </div>
                                    )}

                                    {data.asset && (
                                        <div className="py-2 border-t border-gray-300 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400">Asset:</span>
                                            <span className="text-gray-900 dark:text-gray-200 font-medium ml-2">
                                                {data.asset}
                                            </span>
                                        </div>
                                    )}

                                    {data.amount && (
                                        <div className="py-2 border-t border-gray-300 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                                            <span className="text-gray-900 dark:text-gray-200 font-medium ml-2">
                                                {data.amount} {data.asset}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-2 mt-4 p-3 rounded bg-gray-700/30">
                                        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-gray-300">
                                            Aave V3 supports cross-collateral lending. Deposit any supported asset as
                                            collateral and borrow any other supported asset based on your available
                                            borrowing power.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-700 px-4 py-3 flex justify-end">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors font-medium"
                            >
                                Done
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
