import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { fetchAaveReserves, type AaveReserve } from "@/services/aaveApi";

const QUERY_KEY = ["aave-reserves"];

/**
 * Fetches Aave reserves with APYs for the current chain.
 * Used by Aave card for asset selector with APY display.
 */
export function useAaveReserves(): {
    reserves: AaveReserve[];
    isLoading: boolean;
    error: Error | null;
} {
    const chainId = useChainId();
    const effectiveChainId = chainId ?? 1;

    const { data: reserves = [], isLoading, error } = useQuery({
        queryKey: [...QUERY_KEY, effectiveChainId],
        queryFn: () => fetchAaveReserves(effectiveChainId),
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return {
        reserves,
        isLoading,
        error: error instanceof Error ? error : null,
    };
}
