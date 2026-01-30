import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { fetchMorphoVaults, type MorphoVault } from "@/services/morphoApi";

const QUERY_KEY = ["morpho-vaults"];

/**
 * Fetches Morpho vaults with APY for the current chain.
 * Used by Morpho card for deposit/withdraw vault selector.
 */
export function useMorphoVaults(): {
    vaults: MorphoVault[];
    isLoading: boolean;
    error: Error | null;
} {
    const chainId = useChainId();
    const chainIds = chainId ? [chainId] : [1];

    const { data: vaults = [], isLoading, error } = useQuery({
        queryKey: [...QUERY_KEY, chainIds],
        queryFn: () => fetchMorphoVaults(chainIds),
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return {
        vaults,
        isLoading,
        error: error instanceof Error ? error : null,
    };
}
