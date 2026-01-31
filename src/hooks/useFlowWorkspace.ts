import { useState, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";

export interface Tab {
  id: string;
  name: string;
  nodes: Node<ProtocolNodeData>[];
  edges: Edge[];
}

interface WorkspaceConfig {
  initialTabs: Tab[];
  initialActiveTabId: string;
  isLoadingSharedFlow: boolean;
}

const WORKSPACE_STORAGE_KEY = "ethkratong-workspace";

/**
 * Hook to manage workspace tabs and localStorage persistence
 */
export function useFlowWorkspace(
  config: WorkspaceConfig,
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>
) {
  const [tabs, setTabs] = useState<Tab[]>(config.initialTabs);
  const [activeTabId, setActiveTabId] = useState(config.initialActiveTabId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showTabCloseConfirm, setShowTabCloseConfirm] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);

  // Save workspace to localStorage
  const saveWorkspaceToLocalStorage = useCallback(() => {
    try {
      const workspace = {
        tabs: tabs.map(tab => ({
          ...tab,
          nodes: tab.id === activeTabId ? nodes : tab.nodes,
          edges: tab.id === activeTabId ? edges : tab.edges,
        })),
        activeTabId,
        timestamp: Date.now(),
      };
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } catch (error) {
      console.error("Failed to save workspace to localStorage:", error);
    }
  }, [tabs, activeTabId, nodes, edges]);

  // Track changes to mark workspace as having unsaved changes
  useEffect(() => {
    // Skip on initial mount and when loading shared flow
    if (nodes.length === 0 && edges.length === 0) return;
    if (config.isLoadingSharedFlow) return;

    // Mark as having unsaved changes (user must manually save)
    setHasUnsavedChanges(true);
  }, [nodes, edges, tabs, activeTabId, config.isLoadingSharedFlow]);

  // Warn user before closing/refreshing page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleTabChange = (tabId: string) => {
    // Save current tab state
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, nodes: nodes as Node<ProtocolNodeData>[], edges } : tab
      )
    );

    // Load new tab state
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      setNodes(tab.nodes);
      setEdges(tab.edges);
    }
  };

  const performTabClose = (tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      const newActiveTab = newTabs[Math.max(0, tabIndex - 1)];
      setActiveTabId(newActiveTab.id);
      setNodes(newActiveTab.nodes);
      setEdges(newActiveTab.edges);
    }
  };

  const handleTabClose = (tabId: string) => {
    if (tabs.length === 1) return;

    // Show confirmation dialog if there are unsaved changes
    if (hasUnsavedChanges) {
      setTabToClose(tabId);
      setShowTabCloseConfirm(true);
    } else {
      // No unsaved changes, close immediately
      performTabClose(tabId);
    }
  };

  const handleTabCloseConfirm = () => {
    if (tabToClose) {
      performTabClose(tabToClose);
      setTabToClose(null);
    }
    setShowTabCloseConfirm(false);
  };

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showTabCloseConfirm,
    setShowTabCloseConfirm,
    tabToClose,
    saveWorkspaceToLocalStorage,
    handleTabChange,
    handleTabClose,
    handleTabCloseConfirm,
  };
}
