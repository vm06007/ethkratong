import type { ProtocolNodeData } from "@/types";
import { UNISWAP_TOKEN_OPTIONS } from "./constants";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import { useMorphoVaults } from "./useMorphoVaults";
import type { TokenBalance } from "./types";

interface ProtocolNodeMorphoBodyProps {
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    template: { availableActions: string[] } | undefined;
    /** Effective balances after upstream steps (e.g. after Uniswap swap). Used for % buttons and balance display. */
    effectiveBalances?: TokenBalance[];
    isLoadingEffectiveBalances?: boolean;
}

const VAULT_ACTIONS = ["deposit", "withdraw", "lend"] as const;
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

    const action = data.action || "";
    const useVaultSelector = isVaultAction(action);
    const needsWalletBalance = action === "lend" || action === "deposit";
    const balances =
        effectiveBalances && effectiveBalances.length > 0 ? effectiveBalances : walletBalances;

    // Determine if we should show loading indicator
    const showLoading = isLoadingEffectiveBalances &&
                       (!effectiveBalances || effectiveBalances.length === 0);

    const assetBalance = data.asset ? getBalanceForSymbol(balances, data.asset) : null;

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
        useVaultSelector && data.asset ? vaultsForAsset : vaults;

    const setAmountFromBalancePct = (pct: number) => {
        if (!data.asset || !assetBalance) return;
        const num = parseFloat(assetBalance);
        if (Number.isNaN(num)) return;
        const value = pct === 1 ? num : num * pct;
        const str =
            value <= 0 ? "0" : value < 0.0001 ? value.toExponential(2) : value.toFixed(6);
        onUpdateData({ amount: str });
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
            const apy = v.state?.netApy ?? v.state?.apy ?? undefined;
            onUpdateData({
                morphoVaultAddress: v.address,
                morphoVaultName: v.name,
                morphoVaultApy: apy,
                asset: assetSymbol,
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
                    {template?.availableActions.map((a) => (
                        <option key={a} value={a}>
                            {a === "lend" ? "Lend (deposit)" : a === "withdraw" ? "Redeem (withdraw)" : a.charAt(0).toUpperCase() + a.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {action && useVaultSelector && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Deposit currency:
                    </label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.asset ?? ""}
                        onChange={(e) => handleDepositCurrencyChange(e.target.value)}
                    >
                        <option value="">Select currency</option>
                        {tokenOptions.map((symbol) => {
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
                        {useVaultSelector ? "Vault (deposit options + APY):" : "Asset:"}
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
                                          ? `Select vault for ${data.asset}`
                                          : "Select deposit currency first"}
                                </option>
                                {vaultOptions.map((v) => {
                                    const apy = v.state?.netApy ?? v.state?.apy;
                                    const apyStr = formatApy(apy ?? undefined);
                                    const label = `${v.name} (${v.asset?.symbol ?? v.symbol}) — ${apyStr} APY`;
                                    return (
                                        <option key={v.address} value={v.address}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                            {data.asset && vaultsForAsset.length < vaults.length && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Showing vaults for {data.asset} only
                                </div>
                            )}
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
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    APY: {formatApy(selectedVault.state?.netApy ?? selectedVault.state?.apy ?? undefined)}
                </div>
            )}

            {action && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Amount:
                    </label>
                    <div className="flex gap-1.5 mb-1.5">
                        {([0.25, 0.5, 0.75, 1] as const).map((pct) => {
                            const balance = assetBalance ? parseFloat(assetBalance) : 0;
                            const disabled =
                                !data.asset ||
                                Number.isNaN(balance) ||
                                (needsWalletBalance && balance <= 0);
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
                </div>
            )}

            {needsWalletBalance &&
                data.asset &&
                data.amount?.trim() &&
                assetBalance != null && (() => {
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
