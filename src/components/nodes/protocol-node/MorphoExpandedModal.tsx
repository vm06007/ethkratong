import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const MORPHO_BASE = "https://app.morpho.org";

export interface MorphoExpandedModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chainId: number | undefined;
    action?: string;
    vaultAddress?: string;
}

function buildMorphoUrl(
    chainId: number | undefined,
    action?: string,
    vaultAddress?: string
): string {
    // Morpho is primarily on Ethereum mainnet (chainId 1)
    // If vault address is provided, link to the specific vault
    if (vaultAddress) {
        return `${MORPHO_BASE}/vault?vault=${vaultAddress}`;
    }

    // Default to markets page
    return `${MORPHO_BASE}/markets`;
}

export function MorphoExpandedModal({
    open,
    onOpenChange,
    chainId,
    action,
    vaultAddress,
}: MorphoExpandedModalProps) {
    const iframeUrl = buildMorphoUrl(chainId ?? 1, action, vaultAddress);

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
                        "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-6xl translate-x-[-50%] translate-y-[-50%]",
                        "rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 shadow-2xl",
                        "flex flex-col overflow-hidden",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                            Morpho — View In Frame
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </Dialog.Close>
                    </div>
                    <div className="flex-1 min-h-[70vh] flex flex-col">
                        <iframe
                            src={iframeUrl}
                            title="Morpho"
                            className="w-full flex-1 min-h-[70vh] border-0 rounded-b-xl"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            allow="ethereum"
                        />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
