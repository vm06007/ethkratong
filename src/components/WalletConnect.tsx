import { ConnectButton } from "thirdweb/react";
import { client, wallets, thirdwebTheme, chains } from "@/config/thirdweb";

export function WalletConnect() {
  return (
    <div className="flex items-center gap-2">
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
          className: "!px-3 !py-2.5 !h-9 !rounded-lg !border !border-gray-300 dark:!border-gray-600 !bg-gray-100 dark:!bg-gray-800 hover:!bg-gray-200 dark:hover:!bg-gray-700 !transition-colors !text-gray-700 dark:!text-gray-300 !font-medium !text-sm !shadow-none !scale-100 hover:!scale-100 !min-w-0 !box-border",
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
