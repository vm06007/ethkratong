import { useState, useEffect } from "react";
import { useChainId } from "wagmi";
import { useActiveAccount } from "thirdweb/react";
import { readMorphoMaxBorrow } from "@/services/batchedExecution";

/**
 * Fetches the maximum borrowable amount for the given Morpho vault.
 * Uses wallet vault share balance and/or effective share balance from flow (previous Lend step).
 */
export function useMaxBorrow(
    enabled: boolean,
    vaultAddress: string | undefined,
    effectiveSharesFormatted?: string | null
): { maxBorrow: string | null; isLoading: boolean } {
    const chainId = useChainId();
    const activeAccount = useActiveAccount();
    const [maxBorrow, setMaxBorrow] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const hasEffective = effectiveSharesFormatted != null && parseFloat(effectiveSharesFormatted) > 0;

    useEffect(() => {
        if (!enabled || !vaultAddress) {
            setMaxBorrow(null);
            setIsLoading(false);
            return;
        }
        if (!activeAccount?.address && !hasEffective) {
            setMaxBorrow(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        readMorphoMaxBorrow(
            chainId ?? 1,
            vaultAddress,
            activeAccount?.address ?? "",
            effectiveSharesFormatted ?? undefined
        )
            .then(setMaxBorrow)
            .finally(() => setIsLoading(false));
    }, [enabled, vaultAddress, activeAccount?.address, chainId, effectiveSharesFormatted, hasEffective]);

    return {
        maxBorrow: enabled ? maxBorrow : null,
        isLoading: enabled && isLoading,
    };
}
