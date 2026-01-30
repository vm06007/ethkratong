import type { ProtocolNodeData } from "@/types";
import type { TokenBalance } from "./types";
import { ProtocolNodeCustomBody } from "./ProtocolNodeCustomBody";
import { ProtocolNodeConditionalBody } from "./ProtocolNodeConditionalBody";
import { ProtocolNodeBalanceLogicBody } from "./ProtocolNodeBalanceLogicBody";
import { ProtocolNodeUniswapBody } from "./ProtocolNodeUniswapBody";
import { ProtocolNodeMorphoBody } from "./ProtocolNodeMorphoBody";

interface ProtocolNodeExpandedBodyProps {
    data: ProtocolNodeData;
    template: { availableActions: string[] } | undefined;
    chainId: number | undefined;
    activeAccount: { address: string } | undefined;
    transferBalances: TokenBalance[];
    isLoadingEffectiveBalances?: boolean;
    isVerifyingContract: boolean;
    contractVerifyError: string | null;
    currentViewValue: string | null;
    currentViewLoading: boolean;
    currentViewError: string | null;
    onUpdateData: (updates: Partial<ProtocolNodeData>) => void;
    onSetVerifying: (v: boolean) => void;
    onSetVerifyError: (err: string | null) => void;
}

export function ProtocolNodeExpandedBody({
    data,
    template,
    chainId,
    activeAccount,
    transferBalances,
    isLoadingEffectiveBalances,
    isVerifyingContract,
    contractVerifyError,
    currentViewValue,
    currentViewLoading,
    currentViewError,
    onUpdateData,
    onSetVerifying,
    onSetVerifyError,
}: ProtocolNodeExpandedBodyProps) {
    const showActionSelect =
        data.protocol !== "transfer" &&
        data.protocol !== "custom" &&
        data.protocol !== "conditional" &&
        data.protocol !== "balanceLogic" &&
        data.protocol !== "morpho" &&
        data.protocol !== "uniswap";

    return (
        <>
            {showActionSelect && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Action:
                    </label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.action || ""}
                        onChange={(e) => {
                            onUpdateData({ action: e.target.value as ProtocolNodeData["action"] });
                        }}
                    >
                        <option value="">Select action</option>
                        {template?.availableActions.map((action) => {
                            const label =
                                action === "addLiquidity"
                                    ? "Add liquidity"
                                    : action === "removeLiquidity"
                                        ? "Remove liquidity"
                                        : action.charAt(0).toUpperCase() + action.slice(1);
                            return (
                                <option key={action} value={action}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            )}

            {data.protocol === "custom" && (
                <ProtocolNodeCustomBody
                    data={data}
                    chainId={chainId}
                    isVerifyingContract={isVerifyingContract}
                    contractVerifyError={contractVerifyError}
                    onUpdateData={onUpdateData}
                    onSetVerifying={onSetVerifying}
                    onSetVerifyError={onSetVerifyError}
                />
            )}

            {data.protocol === "conditional" && (
                <ProtocolNodeConditionalBody
                    data={data}
                    chainId={chainId}
                    isVerifyingContract={isVerifyingContract}
                    contractVerifyError={contractVerifyError}
                    currentViewValue={currentViewValue}
                    currentViewLoading={currentViewLoading}
                    currentViewError={currentViewError}
                    onUpdateData={onUpdateData}
                    onSetVerifying={onSetVerifying}
                    onSetVerifyError={onSetVerifyError}
                />
            )}

            {data.protocol === "balanceLogic" && (
                <ProtocolNodeBalanceLogicBody
                    data={data}
                    currentViewValue={currentViewValue}
                    currentViewLoading={currentViewLoading}
                    currentViewError={currentViewError}
                    onUpdateData={onUpdateData}
                />
            )}

            {data.protocol === "uniswap" && (
                <ProtocolNodeUniswapBody
                    data={data}
                    chainId={chainId}
                    onUpdateData={onUpdateData}
                />
            )}

            {data.protocol === "morpho" && (
                <ProtocolNodeMorphoBody
                    data={data}
                    chainId={chainId}
                    onUpdateData={onUpdateData}
                    template={template}
                    effectiveBalances={transferBalances}
                    isLoadingEffectiveBalances={isLoadingEffectiveBalances}
                />
            )}

            {data.protocol === "transfer" ? (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Asset:
                    </label>
                    {!activeAccount ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                            Connect wallet to see available assets
                        </div>
                    ) : transferBalances.length === 0 ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                            Loading balances...
                        </div>
                    ) : (
                        <select
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                            value={data.asset || ""}
                            onChange={(e) => onUpdateData({ asset: e.target.value, amountManuallyEdited: false })}
                        >
                            <option value="">Select asset</option>
                            {transferBalances.map((token) => (
                                <option key={token.symbol} value={token.symbol}>
                                    {token.symbol} ({token.balance})
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            ) : (
                data.protocol !== "uniswap" &&
                data.protocol !== "morpho" &&
                (data.action === "lend" ||
                    data.action === "deposit" ||
                    data.action === "borrow") && (
                    <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                            Asset:
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., USDC, ETH"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                            value={data.asset || ""}
                            onChange={(e) => onUpdateData({ asset: e.target.value })}
                        />
                    </div>
                )
            )}

            {data.protocol === "transfer" && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Amount:
                    </label>
                    <div className="flex gap-1.5 mb-1.5">
                        {([0.25, 0.5, 0.75, 1] as const).map((pct) => {
                            const token = data.asset
                                ? transferBalances.find((t) => t.symbol === data.asset)
                                : null;
                            const balance = token ? parseFloat(token.balance) : 0;
                            const disabled = !token || Number.isNaN(balance) || balance <= 0;
                            return (
                                <button
                                    key={pct}
                                    type="button"
                                    disabled={disabled}
                                    className="rounded-md px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:pointer-events-none"
                                    onClick={() => {
                                        if (!token) return;
                                        const value =
                                            pct === 1 ? balance : balance * pct;
                                        const str =
                                            value <= 0
                                                ? "0"
                                                : value < 0.0001
                                                  ? value.toExponential(2)
                                                  : value.toFixed(6);
                                        onUpdateData({ amount: str, amountManuallyEdited: true });
                                    }}
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
                        value={data.amount || ""}
                        onChange={(e) => onUpdateData({ amount: e.target.value, amountManuallyEdited: true })}
                    />
                </div>
            )}

            {(data.action || data.protocol === "transfer") &&
                data.protocol !== "custom" &&
                data.protocol !== "conditional" &&
                data.protocol !== "balanceLogic" &&
                data.protocol !== "uniswap" &&
                data.protocol !== "morpho" &&
                data.protocol !== "transfer" && (
                    <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                            Amount:
                        </label>
                        <input
                            type="text"
                            placeholder="0.00"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                            value={data.amount || ""}
                            onChange={(e) => onUpdateData({ amount: e.target.value })}
                        />
                    </div>
                )}

            {data.protocol === "transfer" && (
                <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        To Address:
                    </label>
                    <input
                        type="text"
                        placeholder="0x... or ENS name"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                        value={data.recipientAddress || ""}
                        onChange={(e) =>
                            onUpdateData({ recipientAddress: e.target.value })
                        }
                    />
                </div>
            )}

            {data.protocol === "transfer" &&
                data.asset &&
                data.amount?.trim() &&
                (() => {
                    const token = transferBalances.find((t) => t.symbol === data.asset);
                    const balance = token ? parseFloat(token.balance) : 0;
                    const amount = parseFloat(data.amount);
                    if (!Number.isNaN(amount) && !Number.isNaN(balance) && amount > balance) {
                        return (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                Amount exceeds balance ({token?.balance ?? "0"} {data.asset})
                            </div>
                        );
                    }
                    return null;
                })()}
        </>
    );
}
