import { useState, useEffect, useCallback } from "react";
import { parseEther } from "viem";
import {
    getUniswapSwapQuote,
    getUniswapSwapQuoteTokenToToken,
} from "@/services/batchedExecution";

export interface UniswapQuoteResult {
    amountOutFormatted: string | null;
    amountOutRaw: bigint | null;
    loading: boolean;
    error: string | null;
}

/**
 * Simulate Uniswap swap and return estimated amount out.
 * Supports ETH → token and token → token (e.g. DAI → USDC).
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
        const amountStr = (amount ?? "").trim();
        if (!chainId || !swapFrom || !swapTo || swapFrom === swapTo || !amountStr) {
            setAmountOutFormatted(null);
            setAmountOutRaw(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (swapFrom === "ETH") {
                let amountWei: bigint;
                try {
                    amountWei = parseEther(amountStr);
                } catch {
                    setAmountOutFormatted(null);
                    setAmountOutRaw(null);
                    setError("Invalid amount");
                    setLoading(false);
                    return;
                }
                if (amountWei <= 0n) {
                    setAmountOutFormatted(null);
                    setAmountOutRaw(null);
                    setError(null);
                    setLoading(false);
                    return;
                }
                const result = await getUniswapSwapQuote(chainId, amountWei, swapTo);
                if (result) {
                    setAmountOutFormatted(result.amountOutFormatted);
                    setAmountOutRaw(result.amountOutRaw);
                } else {
                    setAmountOutFormatted(null);
                    setAmountOutRaw(null);
                    setError("Quote unavailable");
                }
            } else {
                const result = await getUniswapSwapQuoteTokenToToken(
                    chainId,
                    swapFrom,
                    swapTo,
                    amountStr
                );
                if (result) {
                    setAmountOutFormatted(result.amountOutFormatted);
                    setAmountOutRaw(result.amountOutRaw);
                } else {
                    setAmountOutFormatted(null);
                    setAmountOutRaw(null);
                    setError("Quote unavailable");
                }
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
