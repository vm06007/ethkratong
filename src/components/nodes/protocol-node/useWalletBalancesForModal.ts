import { useState, useEffect, useCallback } from "react";
import { client, chains } from "@/config/thirdweb";
import { getContract } from "thirdweb";
import { balanceOf, decimals } from "thirdweb/extensions/erc20";
import { toTokens } from "thirdweb";
import { useChainId } from "wagmi";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { TOKEN_ADDRESSES } from "./constants";
import type { TokenBalance } from "./types";

/**
 * Fetches ETH + token balances for the connected wallet when enabled (e.g. modal open).
 * Used in UniswapConfigModal to show user balances.
 */
export function useWalletBalancesForModal(enabled: boolean): {
    balances: TokenBalance[];
    isLoading: boolean;
} {
    const chainId = useChainId();
    const activeAccount = useActiveAccount();
    const chainIdForBalances = chainId || 1;
    const currentChain = chains.find((c) => c.id === chainIdForBalances) || chains[0];
    const { data: ethBalanceData, isLoading: isEthLoading } = useWalletBalance({
        client,
        chain: currentChain,
        address: activeAccount?.address,
    });

    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
    const [isLoadingTokens, setIsLoadingTokens] = useState(false);

    const fetchBalances = useCallback(async () => {
        if (!activeAccount) return [];
        const tokens = TOKEN_ADDRESSES[chainIdForBalances as keyof typeof TOKEN_ADDRESSES];
        if (!tokens) return [];

        const balancePromises = Object.entries(tokens).map(async ([symbol, address]) => {
            try {
                const contract = getContract({
                    client,
                    chain: currentChain,
                    address,
                });
                const [balance, tokenDecimals] = await Promise.all([
                    balanceOf({ contract, address: activeAccount.address }),
                    decimals({ contract }),
                ]);
                const balanceValue = toTokens(balance, tokenDecimals);
                const numBalance = Number(balanceValue);
                let formatted: string;
                if (numBalance === 0) {
                    formatted = "0.00";
                } else if (numBalance < 0.01) {
                    formatted = numBalance.toFixed(6);
                } else {
                    formatted = numBalance.toFixed(2);
                }
                return { symbol, balance: formatted, isLoading: false };
            } catch (error) {
                console.error(`Error fetching ${symbol} balance:`, error);
                return { symbol, balance: "0.00", isLoading: false };
            }
        });

        const results = await Promise.all(balancePromises);
        let ethBalance: TokenBalance;
        if (ethBalanceData && ethBalanceData.value !== undefined) {
            const ethValue = Number(ethBalanceData.value) / 1e18;
            const formattedEth = ethValue === 0 ? "0.0000" : ethValue.toFixed(4);
            ethBalance = {
                symbol: ethBalanceData.symbol || "ETH",
                balance: formattedEth,
                isLoading: isEthLoading,
            };
        } else {
            ethBalance = { symbol: "ETH", balance: "0.0000", isLoading: isEthLoading };
        }
        return [ethBalance, ...results];
    }, [activeAccount, chainIdForBalances, currentChain, ethBalanceData, isEthLoading]);

    useEffect(() => {
        if (!enabled || !activeAccount) {
            setTokenBalances([]);
            setIsLoadingTokens(false);
            return;
        }
        setIsLoadingTokens(true);
        fetchBalances()
            .then((list) => {
                setTokenBalances(list);
            })
            .finally(() => {
                setIsLoadingTokens(false);
            });
    }, [enabled, activeAccount, fetchBalances]);

    const isLoading = enabled && (isEthLoading || isLoadingTokens);
    return { balances: tokenBalances, isLoading };
}
