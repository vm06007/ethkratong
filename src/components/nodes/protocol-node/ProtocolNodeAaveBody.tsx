import { useEffect } from "react";
import type { ProtocolNodeData } from "@/types";
import { UNISWAP_TOKEN_OPTIONS } from "./constants";
import { useWalletBalancesForModal } from "./useWalletBalancesForModal";
import { useAaveReserves } from "./useAaveReserves";
import type { TokenBalance } from "./types";

interface ProtocolNodeAaveBodyProps {
    data: ProtocolNodeData;
    chainId: number | undefined;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    template: { availableActions: string[] } | undefined;
    effectiveBalances?: TokenBalance[];
    isLoadingEffectiveBalances?: boolean;
}

function getBalanceForSymbol(balances: TokenBalance[], symbol: string): string | null {
    const b = balances.find((x) => x.symbol === symbol);
    return b ? b.balance : null;
}

function formatApy(apy: number | null | undefined): string {
    if (apy == null || Number.isNaN(apy)) return "";
    const pct = apy * 100;
    return pct >= 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(3)}%`;
}

// Map UI symbols to Aave reserve symbols (ETH -> WETH)
function getAaveReserveSymbol(symbol: string): string {
    if (symbol === "ETH") return "WETH";
    return symbol;
}

export function ProtocolNodeAaveBody({
    data,
    chainId,
    onUpdateData,
    template,
    effectiveBalances,
    isLoadingEffectiveBalances,
}: ProtocolNodeAaveBodyProps) {
    const chainIdKey = chainId ?? 1;
    const tokenOptions =
        UNISWAP_TOKEN_OPTIONS[chainIdKey as keyof typeof UNISWAP_TOKEN_OPTIONS] ??
        UNISWAP_TOKEN_OPTIONS[1];

    const { balances: walletBalances } = useWalletBalancesForModal(true);
    const { reserves } = useAaveReserves();
    const action = data.action || "";

    // For deposit/withdraw/repay: use wallet/effective balances
    // For borrow: calculate max borrowable based on collateral
    const needsBalances = action === "deposit" || action === "withdraw" || action === "repay";
    const baseBalances = needsBalances
        ? (effectiveBalances && effectiveBalances.length > 0 ? effectiveBalances : walletBalances)
        : [];

    const showLoading = needsBalances && isLoadingEffectiveBalances &&
                       (!effectiveBalances || effectiveBalances.length === 0);

    // Check if there's collateral from previous deposit action (aTokens in effectiveBalances)
    const hasCollateralFromPreviousAction =
        (effectiveBalances?.length ?? 0) > 0 &&
        effectiveBalances!.some((b) => b.symbol.startsWith("a") && b.symbol.length > 1 && parseFloat(b.balance) > 0);

    // TODO: Also check on-chain Aave deposits (on-chain aTokens balance)
    const hasCollateral = hasCollateralFromPreviousAction;

    // TODO: Check on-chain Aave borrows
    const hasBorrowed = false;

    // Rough price estimates (in USD) - TODO: Use real price oracle
    const assetPrices: Record<string, number> = {
        ETH: 3000,
        WETH: 3000,
        aETH: 3000,  // aToken for ETH
        aWETH: 3000, // aToken for WETH
        USDC: 1,
        USDT: 1,
        DAI: 1,
        USDS: 1,
        aUSDC: 1,  // aToken prices same as underlying
        aUSDT: 1,
        aDAI: 1,
        aUSDS: 1,
    };

    // Build LTV map from fetched reserve data
    const assetLTV: Record<string, number> = {};
    reserves.forEach((reserve) => {
        if (reserve.ltv != null) {
            assetLTV[reserve.symbol] = reserve.ltv;
            assetLTV[`a${reserve.symbol}`] = reserve.ltv; // aToken has same LTV as underlying
        }
    });

    // For borrow action: calculate max borrowable amounts based on collateral (aTokens)
    // Each asset has its own LTV ratio
    const borrowableBalances: TokenBalance[] = [];
    if (action === "borrow" && effectiveBalances && effectiveBalances.length > 0) {
        // Sum up borrowing power in USD (collateral value × LTV for each asset)
        let totalBorrowingPowerUSD = 0;
        for (const bal of effectiveBalances) {
            // Only count aTokens (deposited collateral)
            if (bal.symbol.startsWith("a") && bal.symbol.length > 1) {
                const amount = parseFloat(bal.balance);
                if (!Number.isNaN(amount) && amount > 0) {
                    // Get underlying asset price and LTV (aUSDC -> USDC price and LTV)
                    const underlyingSymbol = bal.symbol.substring(1);
                    const price = assetPrices[underlyingSymbol] ?? 1;
                    const ltv = assetLTV[bal.symbol] ?? assetLTV[underlyingSymbol] ?? 0.75; // fallback to 75%

                    // Borrowing power = collateral value × LTV
                    const collateralValueUSD = amount * price;
                    totalBorrowingPowerUSD += collateralValueUSD * ltv;
                }
            }
        }

        if (totalBorrowingPowerUSD > 0) {
            // Convert borrowing power USD to each asset amount
            tokenOptions.forEach((symbol) => {
                const price = assetPrices[symbol] ?? 1;
                const maxBorrowAmount = totalBorrowingPowerUSD / price;
                borrowableBalances.push({
                    symbol,
                    balance: maxBorrowAmount < 0.01 ? maxBorrowAmount.toFixed(6) : maxBorrowAmount.toFixed(2),
                    isLoading: false,
                });
            });
        }
    }

    // For withdraw action: show what was deposited in previous Aave deposit actions (aTokens)
    const withdrawableBalances: TokenBalance[] = [];
    if (action === "withdraw" && effectiveBalances && effectiveBalances.length > 0) {
        // Filter for aTokens (collateral receipt tokens from Aave deposits)
        effectiveBalances.forEach((bal) => {
            if (bal.symbol.startsWith("a") && bal.symbol.length > 1) {
                const amount = parseFloat(bal.balance);
                if (!Number.isNaN(amount) && amount > 0) {
                    // Remove 'a' prefix to show underlying asset (aUSDC -> USDC)
                    const underlyingSymbol = bal.symbol.substring(1);
                    withdrawableBalances.push({
                        symbol: underlyingSymbol,
                        balance: bal.balance,
                        isLoading: bal.isLoading,
                    });
                }
            }
        });
    }

    const balances =
        action === "borrow" ? borrowableBalances :
        action === "withdraw" ? withdrawableBalances :
        baseBalances;
    const assetBalance = data.asset ? getBalanceForSymbol(balances, data.asset) : null;

    // Get APY for selected asset (map ETH to WETH for Aave)
    const selectedReserve = data.asset ? reserves.find((r) => r.symbol === getAaveReserveSymbol(data.asset!)) : null;
    const apyToShow =
        action === "deposit"
            ? selectedReserve?.supplyAPY
            : action === "borrow"
              ? selectedReserve?.variableBorrowAPY
              : null;

    const setAmountFromBalancePct = (pct: number) => {
        if (!data.asset || !assetBalance) return;
        const num = parseFloat(assetBalance);
        if (Number.isNaN(num)) return;
        const value = pct === 1 ? num : num * pct;
        const str =
            value <= 0 ? "0" : value < 0.0001 ? value.toExponential(2) : value.toFixed(6);

        const updates: Partial<ProtocolNodeData> = {
            amount: str,
            amountManuallyEdited: true,
        };

        // Calculate estimated aTokens for deposit (1:1 ratio)
        if (action === "deposit" && value > 0) {
            updates.aaveEstimatedATokens = str;
            updates.aaveEstimatedATokenSymbol = `a${data.asset}`;
        }

        onUpdateData(updates);
    };

    const handleTokenChange = (symbol: string) => {
        const updates: Partial<ProtocolNodeData> = {
            asset: symbol || undefined,
            amountManuallyEdited: false,
        };

        // Clear estimated outputs when asset changes
        if (action === "deposit") {
            updates.aaveEstimatedATokens = undefined;
            updates.aaveEstimatedATokenSymbol = undefined;
        }

        onUpdateData(updates);
    };

    const handleAmountChange = (amount: string) => {
        const updates: Partial<ProtocolNodeData> = {
            amount,
            amountManuallyEdited: true,
        };

        // Calculate estimated aTokens for deposit (1:1 ratio)
        if (action === "deposit" && data.asset && amount.trim()) {
            const amt = parseFloat(amount);
            if (!Number.isNaN(amt) && amt > 0) {
                updates.aaveEstimatedATokens = amount;
                updates.aaveEstimatedATokenSymbol = `a${data.asset}`;
            } else {
                updates.aaveEstimatedATokens = undefined;
                updates.aaveEstimatedATokenSymbol = undefined;
            }
        }

        onUpdateData(updates);
    };

    // Determine which actions are available based on state
    const availableActions = (template?.availableActions ?? []).filter((act) => {
        if (act === "deposit") return true; // Always available
        if (act === "borrow") return hasCollateral; // Need collateral
        if (act === "repay") return hasBorrowed; // Need active borrow
        if (act === "withdraw") return hasCollateral; // Need collateral
        return true;
    });

    // Auto-calculate estimated aTokens for deposit when amount/asset exist but estimate is missing
    useEffect(() => {
        if (
            action === "deposit" &&
            data.asset &&
            data.amount?.trim() &&
            !data.aaveEstimatedATokens
        ) {
            const amt = parseFloat(data.amount);
            if (!Number.isNaN(amt) && amt > 0) {
                onUpdateData({
                    aaveEstimatedATokens: data.amount,
                    aaveEstimatedATokenSymbol: `a${data.asset}`,
                });
            }
        }
    }, [action, data.asset, data.amount, data.aaveEstimatedATokens, onUpdateData]);

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
                            asset: undefined,
                            amount: undefined,
                            amountManuallyEdited: false,
                            aaveEstimatedATokens: undefined,
                            aaveEstimatedATokenSymbol: undefined,
                        });
                    }}
                >
                    <option value="">Select action</option>
                    {availableActions.map((act) => (
                        <option key={act} value={act}>
                            {act.charAt(0).toUpperCase() + act.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {action && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        {action === "deposit"
                            ? "Asset to deposit:"
                            : action === "borrow"
                              ? "Asset to borrow:"
                              : action === "repay"
                                ? "Asset to repay:"
                                : "Asset to withdraw:"}
                    </label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.asset ?? ""}
                        onChange={(e) => handleTokenChange(e.target.value)}
                    >
                        <option value="">Select asset</option>
                        {(action === "withdraw" ? withdrawableBalances.map((b) => b.symbol) : tokenOptions).map((symbol) => {
                            const bal = showLoading ? "..." : getBalanceForSymbol(balances, symbol);
                            const reserve = reserves.find((r) => r.symbol === getAaveReserveSymbol(symbol));
                            const apy =
                                action === "deposit"
                                    ? reserve?.supplyAPY
                                    : action === "borrow"
                                      ? reserve?.variableBorrowAPY
                                      : null;
                            const apyStr = apy != null ? ` • ${formatApy(apy)} APY` : "";
                            const balLabel =
                                action === "borrow" && bal != null ? `Max: ${bal}` :
                                action === "withdraw" && bal != null ? `Max: ${bal}` :
                                bal;
                            return (
                                <option key={symbol} value={symbol}>
                                    {balLabel != null ? `${symbol} (${balLabel})${apyStr}` : `${symbol}${apyStr}`}
                                </option>
                            );
                        })}
                    </select>
                    {apyToShow != null && data.asset && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {action === "deposit" ? "Supply" : "Borrow"} APY: {formatApy(apyToShow)}
                        </div>
                    )}
                    {action === "borrow" && borrowableBalances.length > 0 && (() => {
                        // Show LTV values from deposited collateral
                        const ltvInfo: string[] = [];
                        if (effectiveBalances) {
                            effectiveBalances.forEach((bal) => {
                                if (bal.symbol.startsWith("a") && bal.symbol.length > 1) {
                                    const underlyingSymbol = bal.symbol.substring(1);
                                    const ltv = assetLTV[bal.symbol] ?? assetLTV[underlyingSymbol];
                                    if (ltv != null) {
                                        ltvInfo.push(`${underlyingSymbol}: ${(ltv * 100).toFixed(1)}%`);
                                    }
                                }
                            });
                        }
                        const ltvStr = ltvInfo.length > 0 ? ` (${ltvInfo.join(", ")})` : "";
                        return (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                💡 Max borrow based on collateral LTV{ltvStr}
                            </div>
                        );
                    })()}
                    {action === "withdraw" && withdrawableBalances.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            💡 Showing deposited collateral from previous Aave deposits
                        </div>
                    )}
                </div>
            )}

            {action && data.asset && (
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
                                balance <= 0;
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
                        onChange={(e) => handleAmountChange(e.target.value)}
                    />
                    {action === "deposit" &&
                        data.aaveEstimatedATokens != null &&
                        data.aaveEstimatedATokenSymbol && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Est. out: ~{data.aaveEstimatedATokens} {data.aaveEstimatedATokenSymbol}
                            </div>
                        )}
                </div>
            )}

            {action === "borrow" && data.asset && data.amount && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="font-medium mb-1">Interest Rate Mode:</div>
                    <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                name="interestRateMode"
                                checked={data.aaveInterestRateMode === 2 || data.aaveInterestRateMode === undefined}
                                onChange={() => onUpdateData({ aaveInterestRateMode: 2 })}
                                className="cursor-pointer"
                            />
                            <span>Variable (recommended)</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                name="interestRateMode"
                                checked={data.aaveInterestRateMode === 1}
                                onChange={() => onUpdateData({ aaveInterestRateMode: 1 })}
                                className="cursor-pointer"
                            />
                            <span>Stable</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
