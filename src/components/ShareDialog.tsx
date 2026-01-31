import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  onShare: (makePrivate: boolean) => Promise<string>; // Returns the CID
  shareUrl?: string;
  isSharing?: boolean;
  isPrivate?: boolean;
}

export function ShareDialog({
  open,
  onClose,
  onShare,
  shareUrl,
  isSharing = false,
  isPrivate = false,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [makePrivate, setMakePrivate] = useState(false);

  const handleShare = async () => {
    try {
      setError(null);
      await onShare(makePrivate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share flow");
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleClose = () => {
    setCopied(false);
    setError(null);
    onClose();
  };

  // If we don't have a share URL yet, show the create share screen
  if (!shareUrl) {
    return (
      <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              "fixed inset-0 z-[100] bg-black/60 dark:bg-black/60 backdrop-blur-sm",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            )}
          />
          <Dialog.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%]",
              "rounded-2xl border shadow-2xl",
              "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
              "flex flex-col overflow-hidden max-h-[90vh]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Share Kratong Flow
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                  aria-label="Close"
                  disabled={isSharing}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex flex-col overflow-y-auto">
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This will upload your current flow to IPFS and create a
                  shareable link with QR code. Anyone with the link can view and
                  load your flow.
                </p>

                {/* Privacy Toggle */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={makePrivate}
                    onChange={(e) => setMakePrivate(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      Make Private (Encrypted)
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Encrypt your flow before uploading. Only people with the full link
                      (including the encryption key) can view it. The encrypted data is
                      stored on IPFS, but unreadable without the key.
                    </div>
                  </div>
                </label>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={handleClose}
                    disabled={isSharing}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading to IPFS...
                      </>
                    ) : (
                      "Create Share Link"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Show the share URL and QR code
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[100] bg-black/60 dark:bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%]",
            "rounded-2xl border shadow-2xl",
            "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
            "flex flex-col overflow-hidden max-h-[90vh]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Share Kratong Flow
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col overflow-y-auto">
            <div className="px-6 py-4 space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your flow has been uploaded to IPFS{isPrivate ? ' (encrypted)' : ''}. Share this link or scan the
                QR code to open it on another device.
                {isPrivate && (
                  <span className="block mt-2 text-teal-600 dark:text-teal-400 font-medium">
                    🔒 This is a private share. The encryption key is included in the link.
                  </span>
                )}
              </p>

              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={shareUrl} size={200} level="M" />
              </div>

              {/* Share URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    value={shareUrl}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1 h-9 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 h-9 bg-gray-100 hover:bg-gray-200 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* IPFS Info */}
              <div className={cn(
                "rounded-lg border p-3",
                isPrivate
                  ? "bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700/50"
                  : "bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-700/50"
              )}>
                <p className={cn(
                  "text-xs",
                  isPrivate
                    ? "text-purple-700 dark:text-purple-400"
                    : "text-teal-700 dark:text-teal-400"
                )}>
                  {isPrivate ? (
                    <>
                      🔐 <strong>Private Flow:</strong> Your flow is encrypted and stored on IPFS via Pinata.
                      The encrypted data is publicly accessible, but only readable with the encryption key
                      included in the link. Don't lose the link - the key cannot be recovered!
                    </>
                  ) : (
                    <>
                      This flow is stored on IPFS via Pinata, a decentralized storage
                      network. The link will work permanently and can't be modified.
                    </>
                  )}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
