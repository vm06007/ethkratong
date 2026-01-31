import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProtocolNodeData } from "@/types";
import { ProtocolNodeMorphoBody } from "./ProtocolNodeMorphoBody";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import { useMorphoVaults } from "./useMorphoVaults";
import { allProtocols } from "@/data/protocols";

export interface MorphoConfigModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    effectiveBalances?: Array<{ symbol: string; balance: string; isLoading: boolean }>;
    isLoadingEffectiveBalances?: boolean;
}

export function MorphoConfigModal({
    open,
    onOpenChange,
    data,
    chainId,
    onUpdateData,
    effectiveBalances,
    isLoadingEffectiveBalances,
}: MorphoConfigModalProps) {
    const [showDetails, setShowDetails] = useState(true);
    const template = allProtocols.find((t) => t.protocol === "morpho");
    const { balances } = useWalletBalancesForModal(open);
    const { vaults, isLoading: _vaultsLoading } = useMorphoVaults();

    const selectedVault = data.morphoVaultAddress
        ? vaults.find((v) => v.address.toLowerCase() === data.morphoVaultAddress!.toLowerCase())
        : null;

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
                            Morpho — Expanded View
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
                        <div className="rounded-lg border p-3 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/30">
                            <div className="text-sm text-blue-900 dark:text-blue-200">
                                <strong>Morpho</strong> — Optimized lending and borrowing protocol
                            </div>
                        </div>

                        {/* Main configuration */}
                        <div className="space-y-3">
                            <ProtocolNodeMorphoBody
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
                                    {selectedVault && (
                                        <>
                                            <div className="flex justify-between py-2 border-t border-gray-300 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-400">Vault:</span>
                                                <span className="text-gray-900 dark:text-gray-200 font-medium">
                                                    {selectedVault.name}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-2 border-t border-gray-300 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-400">Asset:</span>
                                                <span className="text-gray-900 dark:text-gray-200">
                                                    {selectedVault.asset?.symbol ?? selectedVault.symbol ?? "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-2 border-t border-gray-300 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-400">APY:</span>
                                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                                    {selectedVault.state?.netApy != null
                                                        ? `${(selectedVault.state.netApy * 100).toFixed(2)}%`
                                                        : selectedVault.state?.apy != null
                                                          ? `${(selectedVault.state.apy * 100).toFixed(2)}%`
                                                          : "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-2 border-t border-gray-300 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-400">Contract:</span>
                                                <span className="text-gray-900 dark:text-gray-200 font-mono text-xs">
                                                    {selectedVault.address.slice(0, 6)}...
                                                    {selectedVault.address.slice(-4)}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {!selectedVault && data.action && (
                                        <div className="py-2 text-gray-400 text-center">
                                            {data.action === "lend" || data.action === "deposit"
                                                ? "Select a vault to see details"
                                                : "Configure action to see details"}
                                        </div>
                                    )}

                                    {!data.action && (
                                        <div className="py-2 text-gray-400 text-center">
                                            Select an action to get started
                                        </div>
                                    )}

                                    <div className="flex items-start gap-2 mt-4 p-3 rounded bg-gray-700/30">
                                        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-gray-300">
                                            Morpho optimizes lending rates by matching lenders and
                                            borrowers peer-to-peer while using lending pools as
                                            fallback liquidity.
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
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
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
