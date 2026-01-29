import { ConnectButton } from "thirdweb/react";
import { client, wallets, thirdwebTheme, chains } from "@/config/thirdweb";
import { useWalletCapabilities } from "@/hooks/useWalletCapabilities";
import { Zap } from "lucide-react";

export function WalletConnect() {
  const { supportsBatch, isLoading } = useWalletCapabilities();

  return (
    <div className="flex items-center gap-2">
      {!isLoading && supportsBatch && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-medium">Atomic</span>
        </div>
      )}
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
          className: "!bg-gradient-to-r !from-blue-600 !to-purple-600 !text-white !font-semibold !px-4 !py-2 !rounded-lg !transition-all hover:!shadow-lg",
        }}
        detailsButton={{
          displayBalanceToken: {
            1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
            42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC on Arbitrum
          },
        }}
        theme={thirdwebTheme}
        wallets={wallets}
      />
    </div>
  );
}
