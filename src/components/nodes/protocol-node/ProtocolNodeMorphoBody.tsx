import { useEffect, useRef } from "react";
import { parseUnits } from "viem";
import type { ProtocolNodeData } from "@/types";
import { UNISWAP_TOKEN_OPTIONS } from "./constants";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import { useMorphoVaults } from "./useMorphoVaults";
import { useMorphoVaultShareBalances } from "./useMorphoVaultShareBalances";
import { useMaxBorrow } from "./useMaxBorrow";
import { readMorphoVaultPreviewDeposit } from "@/services/batchedExecution";
import type { TokenBalance } from "./types";

const ASSET_DECIMALS: Record<string, number> = {
    ETH: 18,
    USDC: 6,
    USDT: 6,
    DAI: 18,
    USDS: 18,
};

interface ProtocolNodeMorphoBodyProps {
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    template: { availableActions: string[] } | undefined;
    /** Effective balances after upstream steps (e.g. after Uniswap swap). Used for % buttons and balance display. */
    effectiveBalances?: TokenBalance[];
    isLoadingEffectiveBalances?: boolean;
}

const VAULT_ACTIONS = ["lend", "redeem", "borrow"] as const;
function isVaultAction(action: string): action is (typeof VAULT_ACTIONS)[number] {
    return VAULT_ACTIONS.includes(action as (typeof VAULT_ACTIONS)[number]);
}

function getBalanceForSymbol(balances: TokenBalance[], symbol: string): string | null {
    const b = balances.find((x) => x.symbol === symbol);
    return b ? b.balance : null;
}

function formatApy(apy: number | null | undefined): string {
    if (apy == null || Number.isNaN(apy)) return "—";
    const pct = apy * 100;
    return pct >= 100 ? `${pct.toFixed(0)}%` : pct >= 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
}

export function ProtocolNodeMorphoBody({
    data,
    chainId,
    onUpdateData,
    template,
    effectiveBalances,
    isLoadingEffectiveBalances,
}: ProtocolNodeMorphoBodyProps) {
    const chainIdKey = chainId ?? 1;
    const tokenOptions =
        UNISWAP_TOKEN_OPTIONS[chainIdKey as keyof typeof UNISWAP_TOKEN_OPTIONS] ??
        UNISWAP_TOKEN_OPTIONS[1];

    const { balances: walletBalances } = useWalletBalancesForModal(true);
    const { vaults, isLoading: vaultsLoading } = useMorphoVaults();
    const { hasAnyVaultShares, vaultShareBalances } = useMorphoVaultShareBalances(true);
    const action = data.action || "";
    const useVaultSelector = isVaultAction(action);
    const needsWalletBalance = action === "lend" || action === "repay";
    const balances =
        effectiveBalances && effectiveBalances.length > 0 ? effectiveBalances : walletBalances;

    const norm = (s: string) => (s ?? "").trim().toLowerCase();
    const hasEffectiveVaultShares =
        (effectiveBalances?.length ?? 0) > 0 &&
        vaults.some((v) =>
            effectiveBalances!.some(
                (b) =>
                    parseFloat(b.balance) > 0 &&
                    (b.symbol === v.name || norm(b.symbol) === norm(v.name))
            )
        );
    const canRedeem = hasAnyVaultShares || hasEffectiveVaultShares;
    const canBorrow = canRedeem;
    const hasBorrowed = false; // TODO: fetch user's Morpho debt to enable Repay

    const effectiveShareByVaultName: Record<string, number> = {};
    if (effectiveBalances?.length) {
        for (const v of vaults) {
            const entry = effectiveBalances.find(
                (b) => parseFloat(b.balance) > 0 && (b.symbol === v.name || norm(b.symbol) === norm(v.name))
            );
            if (entry) effectiveShareByVaultName[v.name] = parseFloat(entry.balance);
        }
    }
    const walletShareByAddress: Record<string, string> = {};
    for (const vb of vaultShareBalances) {
        walletShareByAddress[vb.vaultAddress.toLowerCase()] = vb.balance;
    }
    const getTotalShareBalance = (vaultAddress: string, vaultName: string): string => {
        const wallet = walletShareByAddress[vaultAddress.toLowerCase()] ?? "0";
        const effective = effectiveShareByVaultName[vaultName] ?? 0;
        const total = parseFloat(wallet) + effective;
        if (total <= 0) return "0.00";
        return total < 0.01 ? total.toFixed(6) : total.toFixed(2);
    };

    const selectedVaultForBorrow =
        action === "borrow" && data.morphoVaultAddress
            ? vaults.find((v) => v.address.toLowerCase() === data.morphoVaultAddress!.toLowerCase())
            : null;
    const effectiveShareBalanceForBorrow =
        selectedVaultForBorrow
            ? getTotalShareBalance(selectedVaultForBorrow.address, selectedVaultForBorrow.name)
            : null;
    const { maxBorrow, isLoading: maxBorrowLoading } = useMaxBorrow(
        action === "borrow" && !!data.morphoVaultAddress,
        data.morphoVaultAddress,
        effectiveShareBalanceForBorrow
    );

    const vaultsWithShares = vaults.filter(
        (v) => parseFloat(getTotalShareBalance(v.address, v.name)) > 0
    );
    const redeemCurrencyOptions = [...new Set(vaultsWithShares.map((v) => v.asset?.symbol ?? v.symbol ?? "").filter(Boolean))];

    const showLoading = isLoadingEffectiveBalances &&
                       (!effectiveBalances || effectiveBalances.length === 0);

    const assetMatchesVault = (asset: string, vaultSymbol: string): boolean => {
        const a = (asset ?? "").toUpperCase();
        const v = (vaultSymbol ?? "").toUpperCase();
        if (a === v) return true;
        if (a === "ETH" && v === "WETH") return true;
        if (a === "WETH" && v === "ETH") return true;
        return false;
    };

    const vaultsForAsset = useVaultSelector && data.asset
        ? vaults.filter((v) =>
              assetMatchesVault(data.asset!, v.asset?.symbol ?? v.symbol ?? "")
          )
        : vaults;

    const selectedVault = useVaultSelector && data.morphoVaultAddress
        ? vaults.find((v) => v.address.toLowerCase() === data.morphoVaultAddress!.toLowerCase())
        : null;

    const vaultOptions =
        action === "redeem"
            ? (data.asset
                  ? vaultsWithShares.filter((v) =>
                        assetMatchesVault(data.asset!, v.asset?.symbol ?? v.symbol ?? "")
                    )
                  : vaultsWithShares)
            : useVaultSelector && data.asset
              ? vaultsForAsset
              : vaults;

    const currencyOptions =
        action === "redeem"
            ? redeemCurrencyOptions
            : tokenOptions;

    const assetBalance = data.asset ? getBalanceForSymbol(balances, data.asset) : null;
    const shareBalanceForRedeem =
        action === "redeem" && selectedVault
            ? getTotalShareBalance(selectedVault.address, selectedVault.name)
            : null;
    const amountBalanceForBorrow = action === "borrow" ? maxBorrow : null;

    const prevPreviewKey = useRef("");
    useEffect(() => {
        if (action !== "lend" || !data.morphoVaultAddress || !data.asset || !data.amount?.trim()) {
            if (prevPreviewKey.current) {
                onUpdateData({ morphoEstimatedShares: undefined, morphoEstimatedSharesSymbol: undefined });
                prevPreviewKey.current = "";
            }
            return;
        }
        const key = `${chainId ?? 0}-${data.morphoVaultAddress}-${data.amount}-${data.asset}`;
        if (key === prevPreviewKey.current) return;
        const decimals = ASSET_DECIMALS[data.asset] ?? 18;
        let assetsWei: bigint;
        try {
            assetsWei = parseUnits(data.amount.trim(), decimals);
        } catch {
            return;
        }
        if (assetsWei <= 0n) return;
        prevPreviewKey.current = key;
        const vaultName = selectedVault?.name ?? data.morphoVaultName ?? "shares";
        readMorphoVaultPreviewDeposit(chainId ?? 1, data.morphoVaultAddress, assetsWei)
            .then((result) => {
                if (result) {
                    onUpdateData({
                        morphoEstimatedShares: result.sharesFormatted,
                        morphoEstimatedSharesSymbol: vaultName,
                    });
                } else {
                    onUpdateData({ morphoEstimatedShares: undefined, morphoEstimatedSharesSymbol: undefined });
                }
            })
            .catch(() => {
                onUpdateData({ morphoEstimatedShares: undefined, morphoEstimatedSharesSymbol: undefined });
            });
    }, [
        action,
        chainId,
        data.morphoVaultAddress,
        data.asset,
        data.amount,
        data.morphoVaultName,
        selectedVault?.name,
        onUpdateData,
    ]);

    const setAmountFromBalancePct = (pct: number) => {
        if (action === "redeem" && shareBalanceForRedeem != null) {
            const num = parseFloat(shareBalanceForRedeem);
            if (Number.isNaN(num)) return;
            const value = pct === 1 ? num : num * pct;
            const str =
                value <= 0 ? "0" : value < 0.0001 ? value.toExponential(2) : value.toFixed(6);
            onUpdateData({ amount: str, amountManuallyEdited: true });
            return;
        }
        if (action === "borrow" && amountBalanceForBorrow != null) {
            const num = parseFloat(amountBalanceForBorrow);
            if (Number.isNaN(num)) return;
            const value = pct === 1 ? num : num * pct;
            const str =
                value <= 0 ? "0" : value < 0.0001 ? value.toExponential(2) : value.toFixed(6);
            onUpdateData({ amount: str, amountManuallyEdited: true });
            return;
        }
        if (!data.asset || !assetBalance) return;
        const num = parseFloat(assetBalance);
        if (Number.isNaN(num)) return;
        const value = pct === 1 ? num : num * pct;
        const str =
            value <= 0 ? "0" : value < 0.0001 ? value.toExponential(2) : value.toFixed(6);
        onUpdateData({ amount: str, amountManuallyEdited: true });
    };

    const handleVaultChange = (vaultAddress: string) => {
        if (!vaultAddress) {
            onUpdateData({
                morphoVaultAddress: undefined,
                morphoVaultName: undefined,
                morphoVaultApy: undefined,
            });
            return;
        }
        const v = vaults.find((x) => x.address.toLowerCase() === vaultAddress.toLowerCase());
        if (v) {
            const assetSymbol = v.asset?.symbol ?? v.symbol ?? "?";
            // Normalize WETH → ETH to match currency dropdown options
            const normalizedSymbol = assetSymbol === "WETH" ? "ETH" : assetSymbol;
            const apy = v.state?.netApy ?? v.state?.apy ?? undefined;
            onUpdateData({
                morphoVaultAddress: v.address,
                morphoVaultName: v.name,
                morphoVaultApy: apy,
                asset: normalizedSymbol,
            });
        }
    };

    const handleTokenChange = (symbol: string) => {
        onUpdateData({ asset: symbol || undefined, morphoVaultAddress: undefined, amountManuallyEdited: false });
    };

    const handleDepositCurrencyChange = (symbol: string) => {
        if (!symbol) {
            onUpdateData({
                asset: undefined,
                morphoVaultAddress: undefined,
                morphoVaultName: undefined,
                morphoVaultApy: undefined,
                amountManuallyEdited: false,
            });
            return;
        }
        onUpdateData({
            asset: symbol,
            morphoVaultAddress: undefined,
            morphoVaultName: undefined,
            morphoVaultApy: undefined,
            amountManuallyEdited: false,
        });
    };

    return (
        <div className="space-y-2">
            <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Action:
                </label>
                <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                    value={action}
                    onChange={(e) => {
                        const newAction = (e.target.value || undefined) as ProtocolNodeData["action"];
                        onUpdateData({
                            action: newAction,
                            ...(isVaultAction(newAction ?? "")
                                ? {}
                                : {
                                      morphoVaultAddress: undefined,
                                      morphoVaultName: undefined,
                                      morphoVaultApy: undefined,
                                  }),
                        });
                    }}
                >
                    <option value="">Select action</option>
                    {template?.availableActions.map((a) => {
                        let disabled = false;
                        let label = a.charAt(0).toUpperCase() + a.slice(1);
                        
                        if (a === "redeem") {
                            disabled = !canRedeem && action !== a;
                        } else if (a === "borrow") {
                            disabled = !canBorrow && action !== a;
                        } else if (a === "repay") {
                            disabled = !hasBorrowed && action !== a;
                        }

                        const disabledHint =
                            (a === "redeem" || a === "borrow") && disabled
                                ? "(deposit first to get vault shares)"
                                : a === "repay" && disabled
                                  ? "(need to have borrowed)"
                                  : disabled
                                      ? "(unavailable)"
                                      : "";
                        return (
                            <option key={a} value={a} disabled={disabled}>
                                {label} {disabledHint}
                            </option>
                        );
                    })}
                </select>
            </div>

            {action && useVaultSelector && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        {action === "redeem"
                            ? "Currency to receive:"
                            : action === "borrow"
                              ? "Borrow currency:"
                              : "Deposit currency:"}
                    </label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.asset ?? ""}
                        onChange={(e) => handleDepositCurrencyChange(e.target.value)}
                    >
                        <option value="">
                            {action === "redeem"
                                ? (redeemCurrencyOptions.length > 0 ? "Select currency to receive" : "No vault shares")
                                : action === "borrow"
                                  ? "Select borrow currency"
                                  : "Select currency"}
                        </option>
                        {currencyOptions.map((symbol) => {
                            const bal = showLoading ? "..." : getBalanceForSymbol(balances, symbol);
                            return (
                                <option key={symbol} value={symbol}>
                                    {bal != null ? `${symbol} (${bal})` : symbol}
                                </option>
                            );
                        })}
                    </select>
                </div>
            )}

            {action && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        {useVaultSelector
                            ? action === "redeem"
                                ? "Vault to redeem from:"
                                : action === "borrow"
                                  ? "Vault (collateral + APY):"
                                  : "Vault (deposit options + APY):"
                            : "Asset:"}
                    </label>
                    {useVaultSelector ? (
                        <>
                            <select
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                                value={data.morphoVaultAddress ?? ""}
                                onChange={(e) => handleVaultChange(e.target.value)}
                                disabled={vaultsLoading}
                            >
                                <option value="">
                                    {vaultsLoading
                                        ? "Loading vaults…"
                                        : data.asset
                                          ? action === "redeem"
                                              ? `Select vault for ${data.asset} (with shares)`
                                              : `Select vault for ${data.asset}`
                                          : action === "redeem"
                                            ? "Select currency to receive first"
                                            : "Select deposit currency first"}
                                </option>
                                {vaultOptions.map((v) => {
                                    const apy = v.state?.netApy ?? v.state?.apy;
                                    const apyStr = formatApy(apy ?? undefined);
                                    const shareBal = action === "redeem" ? getTotalShareBalance(v.address, v.name) : null;
                                    const label =
                                        action === "redeem" && shareBal != null && parseFloat(shareBal) > 0
                                            ? `${v.name} (${v.asset?.symbol ?? v.symbol}) — ${apyStr} APY · ${shareBal} shares`
                                            : `${v.name} (${v.asset?.symbol ?? v.symbol}) — ${apyStr} APY`;
                                    return (
                                        <option key={v.address} value={v.address}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                        </>
                    ) : (
                        <select
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                            value={data.asset ?? ""}
                            onChange={(e) => handleTokenChange(e.target.value)}
                        >
                            <option value="">Select token</option>
                            {tokenOptions.map((symbol) => {
                                const bal = showLoading ? "..." : getBalanceForSymbol(balances, symbol);
                                return (
                                    <option key={symbol} value={symbol}>
                                        {bal != null ? `${symbol} (${bal})` : symbol}
                                    </option>
                                );
                            })}
                        </select>
                    )}
                </div>
            )}

            {useVaultSelector && selectedVault && (
                <div className="text-xs text-green-600 dark:text-green-400">
                    Supply APY: {formatApy(selectedVault.state?.netApy ?? selectedVault.state?.apy ?? undefined)}
                </div>
            )}

            {action && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        {action === "redeem"
                            ? "Shares to redeem:"
                            : action === "borrow"
                              ? "Amount to borrow:"
                              : "Amount:"}
                    </label>
                    <div className="flex gap-1.5 mb-1.5">
                        {([0.25, 0.5, 0.75, 1] as const).map((pct) => {
                            const balance =
                                action === "redeem" && shareBalanceForRedeem != null
                                    ? parseFloat(shareBalanceForRedeem)
                                    : action === "borrow" && amountBalanceForBorrow != null
                                      ? parseFloat(amountBalanceForBorrow)
                                      : assetBalance
                                        ? parseFloat(assetBalance)
                                        : 0;
                            const disabled =
                                !data.asset ||
                                Number.isNaN(balance) ||
                                (needsWalletBalance && balance <= 0) ||
                                (action === "borrow" && pct === 1 && (amountBalanceForBorrow == null || maxBorrowLoading));
                            return (
                                <button
                                    key={pct}
                                    type="button"
                                    disabled={disabled}
                                    className="rounded-md px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:pointer-events-none"
                                    onClick={() => setAmountFromBalancePct(pct)}
                                >
                                    {pct === 1 ? "Max" : `${pct * 100}%`}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        type="text"
                        placeholder="0.00"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                        value={data.amount ?? ""}
                        onChange={(e) => onUpdateData({ amount: e.target.value, amountManuallyEdited: true })}
                    />
                    {action === "lend" &&
                        data.morphoEstimatedShares != null &&
                        data.morphoEstimatedSharesSymbol && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Est. out: ~{data.morphoEstimatedShares}{" "}
                                {data.morphoEstimatedSharesSymbol}
                            </div>
                        )}
                    {action === "borrow" && selectedVault && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {maxBorrowLoading
                                ? "Loading max borrow…"
                                : amountBalanceForBorrow != null
                                  ? `Max borrow: ${amountBalanceForBorrow} ${selectedVault.asset?.symbol ?? selectedVault.symbol ?? ""} (≈80% LTV of collateral)`
                                  : "Max borrow not available (no vault shares as collateral or error)"}
                        </div>
                    )}
                </div>
            )}

            {action === "redeem" &&
                selectedVault &&
                data.amount?.trim() &&
                shareBalanceForRedeem != null &&
                (() => {
                    const balance = parseFloat(shareBalanceForRedeem);
                    const amount = parseFloat(data.amount);
                    if (
                        !Number.isNaN(amount) &&
                        !Number.isNaN(balance) &&
                        amount > balance
                    ) {
                        return (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                Amount exceeds vault shares ({shareBalanceForRedeem} shares)
                            </div>
                        );
                    }
                    return null;
                })()}
            {needsWalletBalance &&
                data.asset &&
                data.amount?.trim() &&
                assetBalance != null &&
                (() => {
                    const balance = parseFloat(assetBalance);
                    const amount = parseFloat(data.amount);
                    if (
                        !Number.isNaN(amount) &&
                        !Number.isNaN(balance) &&
                        amount > balance
                    ) {
                        return (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                Amount exceeds balance ({assetBalance} {data.asset})
                            </div>
                        );
                    }
                    return null;
                })()}
        </div>
    );
}
