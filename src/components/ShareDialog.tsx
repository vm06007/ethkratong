import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Loader2 } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  onShare: () => Promise<string>; // Returns the CID
  shareUrl?: string;
  isSharing?: boolean;
}

export function ShareDialog({
  open,
  onClose,
  onShare,
  shareUrl,
  isSharing = false,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    try {
      setError(null);
      await onShare();
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
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Kratong Flow</DialogTitle>
            <DialogDescription>
              This will upload your current flow to IPFS and create a shareable
              link with QR code. Anyone with the link can view and load your
              flow.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSharing}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isSharing}>
              {isSharing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading to IPFS...
                </>
              ) : (
                "Create Share Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show the share URL and QR code
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Kratong Flow</DialogTitle>
          <DialogDescription>
            Your flow has been uploaded to IPFS. Share this link or scan the QR
            code to open it on another device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG value={shareUrl} size={200} level="M" />
          </div>

          {/* Share URL */}
          <div className="space-y-2">
            <Label htmlFor="share-url">Share Link</Label>
            <div className="flex gap-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                onClick={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* IPFS Info */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              This flow is stored on IPFS via Pinata, a decentralized storage
              network. The link will work permanently and can't be modified.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
