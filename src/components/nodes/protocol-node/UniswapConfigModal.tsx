import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProtocolNodeData } from "@/types";
import { ProtocolNodeUniswapBody } from "./ProtocolNodeUniswapBody";
import { allProtocols } from "@/data/protocols";

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
    const template = allProtocols.find((t) => t.protocol === "uniswap");

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
                        "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%]",
                        "rounded-xl border border-gray-700 bg-white dark:bg-gray-900 shadow-2xl",
                        "flex flex-col overflow-hidden",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                            Uniswap — Step configuration
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </Dialog.Close>
                    </div>
                    <div className="px-4 py-4 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                                Action
                            </label>
                            <select
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                                value={data.action ?? ""}
                                onChange={(e) =>
                                    onUpdateData({
                                        action: e.target.value as ProtocolNodeData["action"],
                                    })
                                }
                            >
                                <option value="">Select action</option>
                                {template?.availableActions.map((action) => (
                                    <option key={action} value={action}>
                                        {action === "addLiquidity"
                                            ? "Add liquidity"
                                            : action.charAt(0).toUpperCase() + action.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <ProtocolNodeUniswapBody
                            data={data}
                            chainId={chainId}
                            onUpdateData={onUpdateData}
                        />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
