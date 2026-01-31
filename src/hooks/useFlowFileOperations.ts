import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { Tab } from "./useFlowWorkspace";
import { normalizeUniswapNodes } from "@/lib/flow";

/**
 * Hook to manage file import/export operations
 */
export function useFlowFileOperations(
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
  const handleExport = useCallback(() => {
    const tabName = tabs.find((t) => t.id === activeTabId)?.name || "My Kratong #1";

    // Normalize nodes before saving - ensure all Uniswap nodes have action field
    const normalizedNodes = normalizeUniswapNodes(nodes as Node<ProtocolNodeData>[]);

    const strategy = {
      nodes: normalizedNodes,
      edges,
      name: tabName,
    };
    const blob = new Blob([JSON.stringify(strategy, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${strategy.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, tabs, activeTabId]);

  const handleLoad = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            const loadedNodes = data.nodes || [];
            const loadedEdges = data.edges || [];
            const nameFromFile = file.name.replace(/\.json$/i, "");

            // Normalize nodes - ensure Uniswap nodes have action field set
            const normalizedNodes = normalizeUniswapNodes(loadedNodes);

            // Always add loaded flow as a new tab
            const newTab: Tab = {
              id: getNextTabId(),
              name: nameFromFile,
              nodes: normalizedNodes,
              edges: loadedEdges,
            };
            setTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
            setNodes(newTab.nodes);
            setEdges(newTab.edges);
          } catch (error) {
            console.error("Failed to load file:", error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setTabs, setActiveTabId, setNodes, setEdges, getNextTabId]);

  return {
    handleExport,
    handleLoad,
  };
}
