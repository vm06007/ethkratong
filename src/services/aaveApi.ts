/**
 * Aave V3 Subgraph API – reserve list with supply/borrow APYs.
 * Docs: https://docs.aave.com/developers/getting-started/v3-subgraph
 */

const AAVE_SUBGRAPH_URLS: Record<number, string> = {
    1: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3",
    // Add more chains as needed
};

export interface AaveReserve {
    symbol: string;
    underlyingAsset: string;
    decimals: number;
    supplyAPY: number | null; // Decimal (e.g. 0.05 for 5%)
    variableBorrowAPY: number | null;
    stableBorrowAPY: number | null;
    availableLiquidity: string;
    ltv: number | null; // Loan-to-Value ratio (e.g. 0.825 for 82.5%)
    liquidationThreshold: number | null; // (e.g. 0.86 for 86%)
}

interface SubgraphReserve {
    symbol?: string;
    underlyingAsset?: string;
    decimals?: number;
    liquidityRate?: string; // Ray units (27 decimals)
    variableBorrowRate?: string;
    stableBorrowRate?: string;
    availableLiquidity?: string;
    baseLTVasCollateral?: string; // Basis points (e.g. "8250" for 82.5%)
    reserveLiquidationThreshold?: string; // Basis points
}

interface AaveSubgraphResponse {
    data?: {
        reserves?: SubgraphReserve[];
    };
    errors?: Array<{ message: string }>;
}

/**
 * Convert Aave ray units (27 decimals) to decimal APY.
 * Formula: APY = ((1 + rate/RAY)^31536000 - 1) where RAY = 10^27
 * For simplicity, we approximate: rate / 10^27
 */
function rayToAPY(ray: string | undefined): number | null {
    if (!ray) return null;
    try {
        const rate = parseFloat(ray) / 1e27;
        return rate;
    } catch {
        return null;
    }
}

/**
 * Convert basis points to decimal (e.g. "8250" -> 0.825)
 */
function basisPointsToDecimal(bp: string | undefined): number | null {
    if (!bp) return null;
    try {
        const value = parseFloat(bp) / 10000;
        return value;
    } catch {
        return null;
    }
}

function parseReserve(item: SubgraphReserve | null | undefined): AaveReserve | null {
    if (!item?.symbol || !item?.underlyingAsset) return null;
    return {
        symbol: item.symbol,
        underlyingAsset: item.underlyingAsset,
        decimals: item.decimals ?? 18,
        supplyAPY: rayToAPY(item.liquidityRate),
        variableBorrowAPY: rayToAPY(item.variableBorrowRate),
        stableBorrowAPY: rayToAPY(item.stableBorrowRate),
        availableLiquidity: item.availableLiquidity ?? "0",
        ltv: basisPointsToDecimal(item.baseLTVasCollateral),
        liquidationThreshold: basisPointsToDecimal(item.reserveLiquidationThreshold),
    };
}

/**
 * Fetches Aave V3 reserves with APYs for the given chain ID.
 */
export async function fetchAaveReserves(chainId: number): Promise<AaveReserve[]> {
    const url = AAVE_SUBGRAPH_URLS[chainId];
    if (!url) {
        // Return hardcoded estimates for unsupported chains
        return getDefaultReserves();
    }

    const query = `
      query AaveReserves {
        reserves(first: 20, orderBy: totalLiquidity, orderDirection: desc) {
          symbol
          underlyingAsset
          decimals
          liquidityRate
          variableBorrowRate
          stableBorrowRate
          availableLiquidity
          baseLTVasCollateral
          reserveLiquidationThreshold
        }
      }
    `;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
        });
        const json: AaveSubgraphResponse = await res.json();

        if (json.errors?.length) {
            console.warn("Aave API errors:", json.errors);
            return getDefaultReserves();
        }

        const items = json.data?.reserves ?? [];
        const parsed = items.map(parseReserve).filter((r): r is AaveReserve => r != null);
        return parsed.length > 0 ? parsed : getDefaultReserves();
    } catch (err) {
        console.error("Aave reserves fetch failed:", err);
        return getDefaultReserves();
    }
}

/**
 * Fallback reserves with estimated APYs and LTVs when API is unavailable.
 */
function getDefaultReserves(): AaveReserve[] {
    return [
        {
            symbol: "USDC",
            underlyingAsset: "",
            decimals: 6,
            supplyAPY: 0.04,
            variableBorrowAPY: 0.06,
            stableBorrowAPY: 0.07,
            availableLiquidity: "0",
            ltv: 0.80,
            liquidationThreshold: 0.85,
        },
        {
            symbol: "USDT",
            underlyingAsset: "",
            decimals: 6,
            supplyAPY: 0.038,
            variableBorrowAPY: 0.055,
            stableBorrowAPY: 0.065,
            availableLiquidity: "0",
            ltv: 0.80,
            liquidationThreshold: 0.85,
        },
        {
            symbol: "DAI",
            underlyingAsset: "",
            decimals: 18,
            supplyAPY: 0.042,
            variableBorrowAPY: 0.058,
            stableBorrowAPY: 0.068,
            availableLiquidity: "0",
            ltv: 0.77,
            liquidationThreshold: 0.80,
        },
        {
            symbol: "WETH",
            underlyingAsset: "",
            decimals: 18,
            supplyAPY: 0.025,
            variableBorrowAPY: 0.035,
            stableBorrowAPY: 0.045,
            availableLiquidity: "0",
            ltv: 0.825,
            liquidationThreshold: 0.86,
        },
        {
            symbol: "USDS",
            underlyingAsset: "",
            decimals: 18,
            supplyAPY: 0.05,
            variableBorrowAPY: 0.07,
            stableBorrowAPY: 0.08,
            availableLiquidity: "0",
            ltv: 0.77,
            liquidationThreshold: 0.80,
        },
    ];
}
