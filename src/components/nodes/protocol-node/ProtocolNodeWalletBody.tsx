import { Wallet } from "lucide-react";
import { ConnectButton } from "thirdweb/react";
import { client, chains } from "@/config/thirdweb";
import type { TokenBalance } from "./types";

interface ProtocolNodeWalletBodyProps {
    activeAccount: { address: string } | undefined;
    tokenBalances: TokenBalance[];
    currentChain: { name: string };
}

export function ProtocolNodeWalletBody({
    activeAccount,
    tokenBalances,
    currentChain,
}: ProtocolNodeWalletBodyProps) {
    if (!activeAccount) {
        return (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <Wallet className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Connect your wallet to view balances
                </p>
                <ConnectButton
                    client={client}
                    chains={chains}
                    connectModal={{
                        size: "compact",
                        title: "Connect Wallet",
                        showThirdwebBranding: false,
                    }}
                    connectButton={{
                        label: "Connect Wallet",
                        className:
                            "!bg-blue-600 !text-white !font-medium !px-4 !py-2 !rounded-lg !transition-all hover:!bg-blue-700",
                    }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    Connected Wallet
                </label>
                <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                    {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
                </div>
            </div>
            {tokenBalances.length > 0 && (
                <div className="space-y-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Balances
                    </label>
                    <div className="space-y-1.5">
                        {tokenBalances.map((token) => (
                            <div
                                key={token.symbol}
                                className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded"
                            >
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {token.symbol}
                                </span>
                                <span className="font-mono text-gray-900 dark:text-gray-100">
                                    {token.isLoading ? "..." : token.balance}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Network:</span> {currentChain.name}
                </div>
            </div>
        </div>
    );
}
