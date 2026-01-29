import { useState, useEffect, useCallback } from "react";
import { parseEther } from "viem";
import { getUniswapSwapQuote } from "@/services/batchedExecution";

export interface UniswapQuoteResult {
    amountOutFormatted: string | null;
    amountOutRaw: bigint | null;
    loading: boolean;
    error: string | null;
}

/**
 * Simulate Uniswap swap and return estimated amount out.
 * Only supports ETH → token for now.
 */
export function useUniswapQuote(
    chainId: number | undefined,
    swapFrom: string | undefined,
    swapTo: string | undefined,
    amount: string | undefined
): UniswapQuoteResult {
    const [amountOutFormatted, setAmountOutFormatted] = useState<string | null>(null);
    const [amountOutRaw, setAmountOutRaw] = useState<bigint | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchQuote = useCallback(async () => {
        if (!chainId || swapFrom !== "ETH" || !swapTo || swapTo === "ETH") {
            setAmountOutFormatted(null);
            setAmountOutRaw(null);
            setError(null);
            return;
        }
        const amountStr = (amount ?? "").trim();
        if (!amountStr) {
            setAmountOutFormatted(null);
            setAmountOutRaw(null);
            setError(null);
            return;
        }
        let amountWei: bigint;
        try {
            amountWei = parseEther(amountStr);
        } catch {
            setAmountOutFormatted(null);
            setAmountOutRaw(null);
            setError("Invalid amount");
            return;
        }
        if (amountWei <= 0n) {
            setAmountOutFormatted(null);
            setAmountOutRaw(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await getUniswapSwapQuote(chainId, amountWei, swapTo);
            if (result) {
                setAmountOutFormatted(result.amountOutFormatted);
                setAmountOutRaw(result.amountOutRaw);
            } else {
                setAmountOutFormatted(null);
                setAmountOutRaw(null);
                setError("Quote unavailable");
            }
        } catch (err) {
            setAmountOutFormatted(null);
            setAmountOutRaw(null);
            setError(err instanceof Error ? err.message : "Quote failed");
        } finally {
            setLoading(false);
        }
    }, [chainId, swapFrom, swapTo, amount]);

    useEffect(() => {
        fetchQuote();
    }, [fetchQuote]);

    return { amountOutFormatted, amountOutRaw, loading, error };
}
