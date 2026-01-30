/**
 * Morpho GraphQL API – vault list and APY.
 * Docs: https://docs.morpho.org/tools/offchain/api/morpho-vaults
 */

const MORPHO_GRAPHQL_URL = "https://api.morpho.org/graphql";

export interface MorphoVaultAsset {
    id?: string;
    address: string;
    decimals: number;
    symbol?: string;
}

export interface MorphoVaultState {
    apy?: number | null;
    netApy?: number | null;
}

export interface MorphoVault {
    address: string;
    symbol: string;
    name: string;
    chainId: number;
    asset: MorphoVaultAsset;
    state?: MorphoVaultState | null;
}

interface MorphoVaultItem {
    address: string;
    symbol?: string | null;
    name?: string | null;
    asset?: {
        id?: string;
        address?: string;
        decimals?: number;
        symbol?: string | null;
    } | null;
    chain?: { id?: string } | null;
    state?: {
        apy?: number | null;
        netApy?: number | null;
    } | null;
}

interface MorphoVaultsResponse {
    data?: {
        vaults?: {
            items?: MorphoVaultItem[];
        };
    };
    errors?: Array<{ message: string }>;
}

/** Chain IDs supported by Morpho API (we only request vaults for these). */
const SUPPORTED_CHAIN_IDS = [1, 42161, 8453];

function parseVault(item: MorphoVaultItem | null | undefined): MorphoVault | null {
    if (!item?.address) return null;
    const chainId = item.chain?.id != null ? parseInt(item.chain.id, 10) : 1;
    return {
        address: item.address,
        symbol: item.symbol ?? "?",
        name: item.name ?? item.symbol ?? "Unknown",
        chainId: Number.isNaN(chainId) ? 1 : chainId,
        asset: {
            id: item.asset?.id,
            address: item.asset?.address ?? "",
            decimals: item.asset?.decimals ?? 18,
            symbol: item.asset?.symbol ?? undefined,
        },
        state: item.state ?? undefined,
    };
}

/**
 * Fetches Morpho vaults with APY for the given chain IDs.
 * Uses Morpho GraphQL API (vaults + state.apy).
 */
export async function fetchMorphoVaults(chainIds: number[]): Promise<MorphoVault[]> {
    const ids = chainIds.filter((id) => SUPPORTED_CHAIN_IDS.includes(id));
    if (ids.length === 0) return [];

    const query = `
      query MorphoVaults($chainIdIn: [Int!]) {
        vaults(first: 100, where: { chainId_in: $chainIdIn }, orderBy: TotalAssetsUsd, orderDirection: Desc) {
          items {
            address
            symbol
            name
            asset {
              id
              address
              decimals
              symbol
            }
            chain {
              id
            }
            state {
              apy
              netApy
            }
          }
        }
      }
    `;

    try {
        const res = await fetch(MORPHO_GRAPHQL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                variables: { chainIdIn: ids },
            }),
        });
        const json: MorphoVaultsResponse = await res.json();

        if (json.errors?.length) {
            console.warn("Morpho API errors:", json.errors);
            return [];
        }

        const items = json.data?.vaults?.items ?? [];
        return items.map(parseVault).filter((v): v is MorphoVault => v != null);
    } catch (err) {
        console.error("Morpho vaults fetch failed:", err);
        return [];
    }
}
