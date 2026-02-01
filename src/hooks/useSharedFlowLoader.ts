import { useEffect, useRef, useState } from "react";
import { downloadFlowFromIPFS, getEncryptionKeyFromUrl, type FlowShareData } from "@/lib/ipfs";
import type { Node, Edge } from "@xyflow/react";

interface UseSharedFlowLoaderOptions {
  onLoadSharedFlow: (nodes: Node[], edges: Edge[]) => void;
  onError: (message: string) => void;
  onAutoExecute?: () => void;
  isWalletConnected?: boolean;
  hasNodes?: boolean;
}

/**
 * Hook to automatically load shared flows from URL parameters
 * Checks for ?s={cid} parameter and loads the flow from IPFS
 * If ?autoexec=1 is present, automatically triggers execution after load
 */
export function useSharedFlowLoader({
  onLoadSharedFlow,
  onError,
  onAutoExecute,
  isWalletConnected = false,
  hasNodes = false,
}: UseSharedFlowLoaderOptions) {
  const loadedCidRef = useRef<string | null>(null);
  const loadingCidRef = useRef<string | null>(null);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const autoExecutePendingRef = useRef(false);

  const handleCancelAutoExecute = () => {
    autoExecutePendingRef.current = false;
    setIsAutoExecuting(false);
    console.log('Auto-execute cancelled by user');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("s") || params.get("share");
    const autoExec = params.get("autoexec") === "1";

    if (!cid) {
      return;
    }

    // Already loaded this CID
    if (loadedCidRef.current === cid) {
      return;
    }

    // Currently loading this CID
    if (loadingCidRef.current === cid) {
      return;
    }

    loadingCidRef.current = cid;
    let cancelled = false;

    (async () => {
      try {
        // Extract encryption key from URL fragment if present
        const encryptionKey = getEncryptionKeyFromUrl();
        const isEncrypted = !!encryptionKey;

        console.log(`Loading shared flow from IPFS: ${cid}${isEncrypted ? ' (encrypted)' : ''}${autoExec ? ' (auto-execute)' : ''}`);
        const flowData: FlowShareData = await downloadFlowFromIPFS(cid, encryptionKey);

        if (cancelled) return;

        // Validate flow data
        if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
          throw new Error("Invalid flow data: missing nodes");
        }

        if (!flowData.edges || !Array.isArray(flowData.edges)) {
          throw new Error("Invalid flow data: missing edges");
        }

        console.log(
          `Loaded flow with ${flowData.nodes.length} nodes and ${flowData.edges.length} edges`
        );

        // Load the flow into the canvas
        onLoadSharedFlow(flowData.nodes, flowData.edges);

        // Mark as loaded
        loadedCidRef.current = cid;

        // Optionally remove the ?s parameter and hash fragment from URL to clean it up
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("s");
        newUrl.searchParams.delete("share");
        newUrl.searchParams.delete("autoexec");
        newUrl.hash = ''; // Remove encryption key from URL
        window.history.replaceState({}, "", newUrl.toString());

        // Auto-execute if requested
        if (autoExec && onAutoExecute) {
          autoExecutePendingRef.current = true;
          setIsAutoExecuting(true);
          console.log('Auto-execute requested, waiting for wallet connection...');
        }
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error ? err.message : "Failed to load shared flow";
        console.error("Failed to load shared flow:", err);
        onError(message);
      } finally {
        if (loadingCidRef.current === cid) {
          loadingCidRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadingCidRef.current === cid) {
        loadingCidRef.current = null;
      }
    };
  }, [onLoadSharedFlow, onError, onAutoExecute]);

  // Handle auto-execution when wallet connects and nodes are loaded
  useEffect(() => {
    if (autoExecutePendingRef.current && isWalletConnected && hasNodes && onAutoExecute) {
      autoExecutePendingRef.current = false;
      // Small delay to ensure flow is fully rendered
      setTimeout(() => {
        console.log('Wallet connected and nodes loaded, auto-executing flow...');
        onAutoExecute();
        // Hide overlay after execution is triggered
        // The execution drawer will take over the UI
        setTimeout(() => {
          setIsAutoExecuting(false);
        }, 1000);
      }, 500);
    }
  }, [isWalletConnected, hasNodes, onAutoExecute]);

  return { isAutoExecuting, cancelAutoExecute: handleCancelAutoExecute };
}
