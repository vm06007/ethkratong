import { X } from "lucide-react";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/config/thirdweb";

interface ExecutingFlowOverlayProps {
  isVisible: boolean;
  isWalletConnected?: boolean;
  onClose?: () => void;
}

/**
 * Overlay displayed during auto-execution of shared flows
 */
export function ExecutingFlowOverlay({ isVisible, isWalletConnected, onClose }: ExecutingFlowOverlayProps) {
  if (!isVisible) return null;

  const message = isWalletConnected
    ? { title: "Executing Kratong", subtitle: "Preparing transaction batch..." }
    : { title: "Connecting Wallet", subtitle: "Please connect your wallet to continue..." };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm flex items-center justify-center">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {message.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {message.subtitle}
          </p>
        </div>

        {/* Show connect button if wallet not connected */}
        {!isWalletConnected && (
          <div className="mt-4">
            <ConnectButton
              client={client}
              theme="dark"
              connectButton={{
                label: "Connect Wallet",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
