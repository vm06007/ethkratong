import { useState, useEffect, useCallback } from "react";
import { client, chains } from "@/config/thirdweb";
import { getContract } from "thirdweb";
import { balanceOf } from "thirdweb/extensions/erc20";
import { useChainId } from "wagmi";
import { useActiveAccount } from "thirdweb/react";
import { useMorphoVaults } from "./useMorphoVaults";

/**
 * Fetches the connected wallet's vault share (receipt token) balances for all
 * Morpho vaults on the current chain. Used to enable "Redeem" only when the
 * user has deposited before (holds vault shares).
 */
export function useMorphoVaultShareBalances(enabled: boolean): {
    hasAnyVaultShares: boolean;
    isLoading: boolean;
} {
    const chainId = useChainId();
    const activeAccount = useActiveAccount();
    const { vaults, isLoading: vaultsLoading } = useMorphoVaults();

    const [hasAnyVaultShares, setHasAnyVaultShares] = useState(false);
    const [isLoadingShares, setIsLoadingShares] = useState(false);

    const chainIdForBalances = chainId || 1;
    const currentChain = chains.find((c) => c.id === chainIdForBalances) || chains[0];

    const fetchShareBalances = useCallback(async () => {
        if (!activeAccount?.address || vaults.length === 0) return false;
        try {
            const balancePromises = vaults.map(async (vault) => {
                try {
                    const contract = getContract({
                        client,
                        chain: currentChain,
                        address: vault.address as `0x${string}`,
                    });
                    const bal = await balanceOf({ contract, address: activeAccount.address });
                    return bal > 0n;
                } catch {
                    return false;
                }
            });
            const results = await Promise.all(balancePromises);
            return results.some(Boolean);
        } catch {
            return false;
        }
    }, [activeAccount?.address, vaults, currentChain]);

    useEffect(() => {
        if (!enabled || !activeAccount || vaultsLoading) {
            setHasAnyVaultShares(false);
            setIsLoadingShares(false);
            return;
        }
        if (vaults.length === 0) {
            setHasAnyVaultShares(false);
            setIsLoadingShares(false);
            return;
        }
        setIsLoadingShares(true);
        fetchShareBalances()
            .then(setHasAnyVaultShares)
            .finally(() => setIsLoadingShares(false));
    }, [enabled, activeAccount, vaults.length, vaultsLoading, fetchShareBalances]);

    return {
        hasAnyVaultShares: enabled ? hasAnyVaultShares : false,
        isLoading: enabled && (vaultsLoading || isLoadingShares),
    };
}
