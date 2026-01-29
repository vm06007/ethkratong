import { useState, useEffect, useCallback } from "react";
import { parseEther } from "viem";
import { getEstimatedLpForAddLiquidity } from "@/services/batchedExecution";

export interface UniswapLpQuoteResult {
    amountLpFormatted: string | null;
    amountLpRaw: bigint | null;
    loading: boolean;
    error: string | null;
}

/**
 * Estimate LP tokens received from addLiquidityETH (Uniswap V2).
 * Use when action is addLiquidity and one of the pair is ETH.
 */
export function useUniswapLpQuote(
    chainId: number | undefined,
    tokenA: string | undefined,
    tokenB: string | undefined,
    amountStr: string | undefined
): UniswapLpQuoteResult {
    const [amountLpFormatted, setAmountLpFormatted] = useState<string | null>(null);
    const [amountLpRaw, setAmountLpRaw] = useState<bigint | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchQuote = useCallback(async () => {
        const amount = (amountStr ?? "").trim();
        const oneIsEth = tokenA === "ETH" || tokenB === "ETH";
        const tokenSymbol = tokenA === "ETH" ? tokenB : tokenB === "ETH" ? tokenA : undefined;
        if (!chainId || !oneIsEth || !tokenSymbol || !amount) {
            setAmountLpFormatted(null);
            setAmountLpRaw(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let amountWei: bigint;
            try {
                amountWei = parseEther(amount);
            } catch {
                setAmountLpFormatted(null);
                setAmountLpRaw(null);
                setError("Invalid amount");
                setLoading(false);
                return;
            }
            if (amountWei <= 0n) {
                setAmountLpFormatted(null);
                setAmountLpRaw(null);
                setError(null);
                setLoading(false);
                return;
            }
            const result = await getEstimatedLpForAddLiquidity(chainId, tokenSymbol, amountWei);
            if (result) {
                setAmountLpFormatted(result.amountLpFormatted);
                setAmountLpRaw(result.amountLpRaw);
            } else {
                setAmountLpFormatted(null);
                setAmountLpRaw(null);
                setError("Quote unavailable");
            }
        } catch (err) {
            setAmountLpFormatted(null);
            setAmountLpRaw(null);
            setError(err instanceof Error ? err.message : "Quote failed");
        } finally {
            setLoading(false);
        }
    }, [chainId, tokenA, tokenB, amountStr]);

    useEffect(() => {
        fetchQuote();
    }, [fetchQuote]);

    return { amountLpFormatted, amountLpRaw, loading, error };
}
