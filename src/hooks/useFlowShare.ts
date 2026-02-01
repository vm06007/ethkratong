import { useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { Tab } from "./useFlowWorkspace";
import { uploadFlowToIPFS, getShareUrl, type FlowShareData } from "@/lib/ipfs";
import { normalizeUniswapNodes } from "@/lib/flow";

/**
 * Hook to manage IPFS sharing and loading shared flows
 */
export function useFlowShare(
  nodes: Node[],
  edges: Edge[],
  tabs: Tab[],
  activeTabId: string,
  setTabs: Dispatch<SetStateAction<Tab[]>>,
  setActiveTabId: (id: string) => void,
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  getNextTabId: () => string
) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | undefined>(undefined);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isLoadingSharedFlow, setIsLoadingSharedFlow] = useState(false);
  const [isPrivateShare, setIsPrivateShare] = useState(false);
  const [isAutoExecute, setIsAutoExecute] = useState(false);

  const handleShare = useCallback(async (makePrivate: boolean = false, autoExecute: boolean = false): Promise<string> => {
    setIsSharing(true);
    setShareError(null);
    setIsPrivateShare(makePrivate);
    setIsAutoExecute(autoExecute);

    try {
      const tabName = tabs.find((t) => t.id === activeTabId)?.name || "My Kratong";

      // Normalize nodes before sharing - ensure all Uniswap nodes have action field
      const normalizedNodes = normalizeUniswapNodes(nodes as Node<ProtocolNodeData>[]);

      const flowData: FlowShareData = {
        nodes: normalizedNodes,
        edges: edges,
        name: tabName,
        timestamp: Date.now(),
      };

      const { cid, encryptionKey } = await uploadFlowToIPFS(flowData, makePrivate);
      const url = getShareUrl(cid, encryptionKey, autoExecute);

      setShareUrl(url);
      setIsSharing(false);

      return cid;
    } catch (error) {
      console.error("Failed to share flow:", error);
      setIsSharing(false);
      setShareError(error instanceof Error ? error.message : "Failed to share flow");
      throw error;
    }
  }, [nodes, edges, tabs, activeTabId]);

  const handleOpenShareDialog = useCallback(() => {
    setShareUrl(undefined);
    setShareError(null);
    setIsPrivateShare(false);
    setIsAutoExecute(false);
    setShareDialogOpen(true);
  }, []);

  const handleCloseShareDialog = useCallback(() => {
    setShareDialogOpen(false);
    setShareUrl(undefined);
    setShareError(null);
    setIsPrivateShare(false);
    setIsAutoExecute(false);
  }, []);

  const handleLoadSharedFlow = useCallback((loadedNodes: Node[], loadedEdges: Edge[]) => {
    // Normalize nodes - ensure Uniswap nodes have action field set
    const normalizedNodes = normalizeUniswapNodes(loadedNodes as Node<ProtocolNodeData>[]);

    // Create a new tab for the shared flow
    const newTab: Tab = {
      id: getNextTabId(),
      name: "Shared Kratong",
      nodes: normalizedNodes,
      edges: loadedEdges,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setNodes(newTab.nodes);
    setEdges(newTab.edges);
    setIsLoadingSharedFlow(false);
  }, [setTabs, setActiveTabId, setNodes, setEdges, getNextTabId]);

  const handleLoadError = useCallback((message: string, initialNodes: Node<ProtocolNodeData>[], initialEdges: Edge[]) => {
    console.error("Failed to load shared flow:", message);
    alert(`Failed to load shared flow: ${message}`);
    setIsLoadingSharedFlow(false);
    // Restore default nodes on error
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]);

  return {
    shareDialogOpen,
    shareUrl,
    isSharing,
    shareError,
    isLoadingSharedFlow,
    isPrivateShare,
    isAutoExecute,
    setIsLoadingSharedFlow,
    handleShare,
    handleOpenShareDialog,
    handleCloseShareDialog,
    handleLoadSharedFlow,
    handleLoadError,
  };
}
