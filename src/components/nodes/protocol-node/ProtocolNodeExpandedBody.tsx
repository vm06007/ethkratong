import type { ProtocolNodeData } from "@/types";
import type { TokenBalance } from "./types";
import { ProtocolNodeCustomBody } from "./ProtocolNodeCustomBody";
import { ProtocolNodeConditionalBody } from "./ProtocolNodeConditionalBody";
import { ProtocolNodeBalanceLogicBody } from "./ProtocolNodeBalanceLogicBody";
import { ProtocolNodeUniswapBody } from "./ProtocolNodeUniswapBody";

interface ProtocolNodeExpandedBodyProps {
    data: ProtocolNodeData;
    template: { availableActions: string[] } | undefined;
    chainId: number | undefined;
    activeAccount: { address: string } | undefined;
    transferBalances: TokenBalance[];
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
        data.protocol !== "balanceLogic";

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
                        {template?.availableActions.map((action) => (
                            <option key={action} value={action}>
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                            </option>
                        ))}
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
                            onChange={(e) => onUpdateData({ asset: e.target.value })}
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

            {(data.action || data.protocol === "transfer") &&
                data.protocol !== "custom" &&
                data.protocol !== "conditional" &&
                data.protocol !== "balanceLogic" &&
                data.protocol !== "uniswap" && (
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
        </>
    );
}
