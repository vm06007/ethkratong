/**
 * Hook to detect if the connected wallet has any Uniswap LP positions.
 * Used to enable/disable the "Remove liquidity" action.
 * TODO: Integrate V2 LP token balances (factory + pair), V3 NFT positions, V4 positions.
 */
export function useUniswapPositions(_chainId: number | undefined): {
    hasPositions: boolean;
    loading: boolean;
} {
    return { hasPositions: false, loading: false };
}
