import { useState, useEffect, useCallback } from "react";
import { client, chains } from "@/config/thirdweb";
import { getContract } from "thirdweb";
import { balanceOf, decimals } from "thirdweb/extensions/erc20";
import { toTokens } from "thirdweb";
import { useChainId } from "wagmi";
import { useActiveAccount } from "thirdweb/react";
import { useMorphoVaults } from "./useMorphoVaults";

export interface VaultShareBalance {
    vaultAddress: string;
    vaultName: string;
    assetSymbol: string;
    balance: string;
}

/**
 * Fetches the connected wallet's vault share (receipt token) balances for all
 * Morpho vaults on the current chain. Used to enable "Redeem"/"Borrow" and to
 * filter redeem options to only vaults the user has shares in.
 */
export function useMorphoVaultShareBalances(enabled: boolean): {
    hasAnyVaultShares: boolean;
    vaultShareBalances: VaultShareBalance[];
    isLoading: boolean;
} {
    const chainId = useChainId();
    const activeAccount = useActiveAccount();
    const { vaults, isLoading: vaultsLoading } = useMorphoVaults();

    const [vaultShareBalances, setVaultShareBalances] = useState<VaultShareBalance[]>([]);
    const [isLoadingShares, setIsLoadingShares] = useState(false);

    const chainIdForBalances = chainId || 1;
    const currentChain = chains.find((c) => c.id === chainIdForBalances) || chains[0];

    const fetchShareBalances = useCallback(async (): Promise<VaultShareBalance[]> => {
        if (!activeAccount?.address || vaults.length === 0) return [];
        try {
            const results = await Promise.all(
                vaults.map(async (vault) => {
                    try {
                        const contract = getContract({
                            client,
                            chain: currentChain,
                            address: vault.address as `0x${string}`,
                        });
                        const [bal, tokenDecimals] = await Promise.all([
                            balanceOf({ contract, address: activeAccount.address }),
                            decimals({ contract }),
                        ]);
                        const numBalance = Number(toTokens(bal, tokenDecimals));
                        const formatted =
                            numBalance === 0
                                ? "0.00"
                                : numBalance < 0.01
                                  ? numBalance.toFixed(6)
                                  : numBalance.toFixed(2);
                        return {
                            vaultAddress: vault.address,
                            vaultName: vault.name,
                            assetSymbol: vault.asset?.symbol ?? vault.symbol ?? "?",
                            balance: formatted,
                        };
                    } catch {
                        return {
                            vaultAddress: vault.address,
                            vaultName: vault.name,
                            assetSymbol: vault.asset?.symbol ?? vault.symbol ?? "?",
                            balance: "0.00",
                        };
                    }
                })
            );
            return results.filter((r) => parseFloat(r.balance) > 0);
        } catch {
            return [];
        }
    }, [activeAccount?.address, vaults, currentChain]);

    useEffect(() => {
        if (!enabled || !activeAccount || vaultsLoading) {
            setVaultShareBalances([]);
            setIsLoadingShares(false);
            return;
        }
        if (vaults.length === 0) {
            setVaultShareBalances([]);
            setIsLoadingShares(false);
            return;
        }
        setIsLoadingShares(true);
        fetchShareBalances()
            .then(setVaultShareBalances)
            .finally(() => setIsLoadingShares(false));
    }, [enabled, activeAccount, vaults.length, vaultsLoading, fetchShareBalances]);

    const hasAnyVaultShares = enabled && vaultShareBalances.length > 0;
    return {
        hasAnyVaultShares,
        vaultShareBalances: enabled ? vaultShareBalances : [],
        isLoading: enabled && (vaultsLoading || isLoadingShares),
    };
}
