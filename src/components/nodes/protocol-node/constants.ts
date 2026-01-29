export const COMPARISON_OPTIONS: { value: "gt" | "gte" | "lt" | "lte" | "ne"; label: string }[] = [
    { value: "gt", label: ">" },
    { value: "gte", label: ">=" },
    { value: "lt", label: "<" },
    { value: "lte", label: "<=" },
    { value: "ne", label: "≠" },
];

/** Chain ID -> Uniswap app URL slug (app.uniswap.org/swap?chain=...) */
export const UNISWAP_CHAIN_SLUG: Record<number, string> = {
    1: "ethereum",
    42161: "arbitrum",
};

/** Token symbols available for swap/liquidity dropdowns (ETH + stablecoins from TOKEN_ADDRESSES) */
export const UNISWAP_TOKEN_OPTIONS: Record<number, string[]> = {
    1: ["ETH", "USDC", "USDT", "DAI", "USDS"],
    42161: ["ETH", "USDC", "USDT", "DAI", "USDS"],
};

export const TOKEN_ADDRESSES: Record<
    number,
    { USDC: string; USDT: string; DAI: string; USDS: string }
> = {
    1: {
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        USDS: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
    },
    42161: {
        USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        USDS: "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD",
    },
};
