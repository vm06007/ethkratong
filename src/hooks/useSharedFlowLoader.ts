import { useEffect, useRef } from "react";
import { downloadFlowFromIPFS, type FlowShareData } from "@/lib/ipfs";
import type { Node, Edge } from "@xyflow/react";

interface UseSharedFlowLoaderOptions {
  onLoadSharedFlow: (nodes: Node[], edges: Edge[]) => void;
  onError: (message: string) => void;
}

/**
 * Hook to automatically load shared flows from URL parameters
 * Checks for ?s={cid} parameter and loads the flow from IPFS
 */
export function useSharedFlowLoader({
  onLoadSharedFlow,
  onError,
}: UseSharedFlowLoaderOptions) {
  const loadedCidRef = useRef<string | null>(null);
  const loadingCidRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("s") || params.get("share");

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
        console.log(`Loading shared flow from IPFS: ${cid}`);
        const flowData: FlowShareData = await downloadFlowFromIPFS(cid);

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

        // Optionally remove the ?s parameter from URL to clean it up
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("s");
        newUrl.searchParams.delete("share");
        window.history.replaceState({}, "", newUrl.toString());
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
  }, [onLoadSharedFlow, onError]);
}
