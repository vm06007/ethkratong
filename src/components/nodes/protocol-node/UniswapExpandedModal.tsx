import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { UNISWAP_CHAIN_SLUG } from "./constants";
import { cn } from "@/lib/utils";

const UNISWAP_BASE = "https://app.uniswap.org";

export interface UniswapExpandedModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chainId: number | undefined;
    action?: "swap" | "addLiquidity";
    /** Optional: pre-fill swap from token (symbol) */
    swapFrom?: string;
    /** Optional: pre-fill swap to token (symbol) */
    swapTo?: string;
    /** Optional: pre-fill liquidity pair token A */
    liquidityTokenA?: string;
    /** Optional: pre-fill liquidity pair token B */
    liquidityTokenB?: string;
}

function buildUniswapUrl(
    chainId: number | undefined,
    action: "swap" | "addLiquidity",
    swapFrom?: string,
    swapTo?: string,
    _liquidityTokenA?: string,
    _liquidityTokenB?: string
): string {
    const slug =
        chainId != null
            ? UNISWAP_CHAIN_SLUG[chainId as keyof typeof UNISWAP_CHAIN_SLUG]
            : "ethereum";
    const chainParam = slug ? `?chain=${slug}` : "";

    if (action === "addLiquidity") {
        const path = "/pools";
        return `${UNISWAP_BASE}${path}${chainParam}`;
    }

    const path = "/swap";
    const params = new URLSearchParams(chainParam ? chainParam.slice(1) : "");
    if (swapFrom) params.set("inputCurrency", swapFrom);
    if (swapTo) params.set("outputCurrency", swapTo);
    const qs = params.toString();
    return `${UNISWAP_BASE}${path}${qs ? `?${qs}` : chainParam}`;
}

export function UniswapExpandedModal({
    open,
    onOpenChange,
    chainId,
    action = "swap",
    swapFrom,
    swapTo,
    liquidityTokenA,
    liquidityTokenB,
}: UniswapExpandedModalProps) {
    const iframeUrl = buildUniswapUrl(
        chainId ?? 1,
        action,
        swapFrom,
        swapTo,
        liquidityTokenA,
        liquidityTokenB
    );

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
                        "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-6xl translate-x-[-50%] translate-y-[-50%]",
                        "rounded-xl border border-gray-700 bg-gray-900 shadow-2xl",
                        "flex flex-col overflow-hidden",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                        <Dialog.Title className="text-lg font-semibold text-white">
                            Uniswap — View In Frame
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </Dialog.Close>
                    </div>
                    <div className="flex-1 min-h-[70vh] flex flex-col">
                        <iframe
                            src={iframeUrl}
                            title="Uniswap"
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
