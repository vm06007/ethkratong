import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ProtocolNode from "./nodes/ProtocolNode";
import { Sidebar } from "./layout/Sidebar";
import { Toolbar } from "./layout/Toolbar";
import { Tabs } from "./layout/Tabs";
import { RightDrawer } from "./layout/RightDrawer";
import { ShareDialog } from "./ShareDialog";
import { useTheme } from "@/hooks/useTheme";
import { useSharedFlowLoader } from "@/hooks/useSharedFlowLoader";
import { uploadFlowToIPFS, getShareUrl, type FlowShareData } from "@/lib/ipfs";
import type { ProtocolNodeData } from "@/types";

// Helper function to calculate execution order starting from wallet
// Uses topological sort to create a linear execution sequence
function calculateExecutionOrder(nodes: Node[], edges: Edge[]): Map<string, number> {
  const orderMap = new Map<string, number>();
  const walletNode = nodes.find((n) => n.data.protocol === "wallet");

  if (!walletNode) return orderMap;

  // Build adjacency list and in-degree map
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize all nodes
  nodes.forEach((node) => {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph
  edges.forEach((edge) => {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Topological sort using Kahn's algorithm
  const queue: string[] = [walletNode.id];
  const result: string[] = [];
  let sequenceCounter = 0;

  orderMap.set(walletNode.id, 0); // Wallet is always 0

  while (queue.length > 0) {
    // Sort queue by existing sequence numbers to preserve manual ordering
    queue.sort((a, b) => {
      const nodeA = nodes.find((n) => n.id === a);
      const nodeB = nodes.find((n) => n.id === b);
      if (!nodeA || !nodeB) return 0;

      // Use existing sequence numbers if available
      const seqA = typeof nodeA.data.sequenceNumber === "number" ? nodeA.data.sequenceNumber : 999999;
      const seqB = typeof nodeB.data.sequenceNumber === "number" ? nodeB.data.sequenceNumber : 999999;
      return seqA - seqB;
    });

    const nodeId = queue.shift()!;
    result.push(nodeId);

    // Process all neighbors
    const neighbors = adjList.get(nodeId) || [];

    // Sort neighbors by existing sequence numbers
    const sortedNeighbors = neighbors.sort((a, b) => {
      const nodeA = nodes.find((n) => n.id === a);
      const nodeB = nodes.find((n) => n.id === b);
      if (!nodeA || !nodeB) return 0;

      const seqA = typeof nodeA.data.sequenceNumber === "number" ? nodeA.data.sequenceNumber : 999999;
      const seqB = typeof nodeB.data.sequenceNumber === "number" ? nodeB.data.sequenceNumber : 999999;
      return seqA - seqB;
    });

    sortedNeighbors.forEach((neighborId) => {
      const currentInDegree = inDegree.get(neighborId) || 0;
      inDegree.set(neighborId, currentInDegree - 1);

      if (inDegree.get(neighborId) === 0) {
        sequenceCounter++;
        orderMap.set(neighborId, sequenceCounter);
        queue.push(neighborId);
      }
    });
  }

  return orderMap;
}

const nodeTypes = {
  protocol: ProtocolNode,
};

// Initial wallet node
const initialNodes: Node<ProtocolNodeData>[] = [
  {
    id: "wallet-1",
    type: "protocol",
    position: { x: 100, y: 100 },
    data: {
      protocol: "wallet",
      label: "Your Wallet",
    },
  },
];

const initialEdges: Edge[] = [];

let tabId = 2;

interface Tab {
  id: string;
  name: string;
  nodes: Node<ProtocolNodeData>[];
  edges: Edge[];
}

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [isMiniMapVisible, setIsMiniMapVisible] = useState(true);
  const [edgeType, setEdgeType] = useState<"default" | "straight" | "step" | "smoothstep">("default");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const executeFlowRef = useRef<(() => Promise<void>) | null>(null);
  const [isExecutingFlow, setIsExecutingFlow] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(() => {
    if (!fullscreenContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      fullscreenContainerRef.current.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Custom edge change handler to detect deletions
  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      // Check if any edge was removed
      const hasRemoval = changes.some((change) => change.type === "remove");
      if (hasRemoval) {
        setSelectedEdgeId(null);
      }
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>(
    []
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "1", name: "My Kratong #1", nodes: initialNodes, edges: initialEdges },
  ]);
  const [activeTabId, setActiveTabId] = useState("1");
  const { theme } = useTheme();

  // Share functionality state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | undefined>(undefined);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Loading shared flow state
  const [isLoadingSharedFlow, setIsLoadingSharedFlow] = useState(false);

  // Check if we should load a shared flow on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("s") || params.get("share");
    if (cid) {
      setIsLoadingSharedFlow(true);
      // Clear default nodes when loading shared flow
      setNodes([]);
      setEdges([]);
    }
  }, []);

  // Calculate sequence numbers based on graph topology when edges change
  useEffect(() => {
    const orderMap = calculateExecutionOrder(nodes, edges);

    // Update nodes with calculated sequence numbers
    setNodes((nds) =>
      nds.map((node) => {
        const sequenceNumber = orderMap.get(node.id);
        if (sequenceNumber !== undefined && sequenceNumber !== node.data.sequenceNumber) {
          return {
            ...node,
            data: {
              ...node.data,
              sequenceNumber,
            },
          };
        }
        return node;
      })
    );
  }, [edges]); // Recalculate when edges change

  // Initialize sequence numbers for nodes that don't have them
  useEffect(() => {
    const needsInitialization = nodes.some(
      (node) => node.data.sequenceNumber === undefined && node.data.protocol !== "wallet"
    );

    if (needsInitialization) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.data.sequenceNumber === undefined && node.data.protocol !== "wallet") {
            // Find max sequence and add to end
            const maxSeq = Math.max(
              0,
              ...nds
                .filter((n) => n.data.sequenceNumber !== undefined)
                .map((n) => n.data.sequenceNumber || 0)
            );
            return {
              ...node,
              data: {
                ...node.data,
                sequenceNumber: maxSeq + 1,
              },
            };
          }
          return node;
        })
      );
    }
  }, [nodes, setNodes]); // Only initialize missing sequence numbers

  // Save to history on changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHistory((prev) => [
        ...prev.slice(0, historyIndex + 1),
        { nodes, edges },
      ]);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [nodes, edges]);

  // Handle keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          target.tagName !== "SELECT"
        ) {
          event.preventDefault();
          setNodes((nds) => nds.filter((node) => !node.selected));
          setEdges((eds) => eds.filter((edge) => !edge.selected));
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setNodes, setEdges]);

  // When connecting from Uniswap (swap) to Transfer, pre-fill with output; if multiple swaps connect, combine their estimated outputs
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      setNodes((nds) => {
        const target = nds.find((n) => n.id === params.target);
        if (!target || (target.data as ProtocolNodeData).protocol !== "transfer")
          return nds;
        // All sources that will connect to target after this connect (current incoming + new edge)
        const incomingSourceIds = new Set(
          edges.filter((e) => e.target === params.target).map((e) => e.source)
        );
        incomingSourceIds.add(params.source);
        const sumsBySymbol: Record<string, number> = {};
        for (const sourceId of incomingSourceIds) {
          const src = nds.find((n) => n.id === sourceId);
          const d = src?.data as ProtocolNodeData | undefined;
          if (
            d?.protocol === "uniswap" &&
            d?.action === "swap" &&
            d?.estimatedAmountOutSymbol &&
            d?.estimatedAmountOut != null
          ) {
            const sym = d.estimatedAmountOutSymbol;
            const amt = parseFloat(d.estimatedAmountOut);
            if (!Number.isNaN(amt)) {
              sumsBySymbol[sym] = (sumsBySymbol[sym] ?? 0) + amt;
            }
          }
        }
        const symbols = Object.keys(sumsBySymbol);
        if (symbols.length === 0) return nds;
        // Use the symbol with the largest sum (or first if single)
        const asset = symbols.reduce((a, b) =>
          (sumsBySymbol[a] ?? 0) >= (sumsBySymbol[b] ?? 0) ? a : b
        );
        const total = sumsBySymbol[asset] ?? 0;
        const amountStr =
          total <= 0 ? "0" : total < 0.0001 ? total.toExponential(2) : total.toFixed(6);
        return nds.map((n) =>
          n.id === params.target
            ? {
                ...n,
                data: {
                  ...n.data,
                  asset,
                  amount: amountStr,
                },
              }
            : n
        );
      });
    },
    [setEdges, setNodes, edges]
  );

  // Handle edge selection to add animation
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          animated: e.id === edge.id,
          selected: e.id === edge.id,
        }))
      );
    },
    [setEdges]
  );

  const onPaneClick = useCallback(() => {
    // Deselect all edges when clicking on the pane
    setSelectedEdgeId(null);
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: false,
        selected: false,
      }))
    );
  }, [setEdges]);

  const handleDeleteEdge = useCallback(() => {
    if (selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  }, [selectedEdgeId, setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const protocol = event.dataTransfer.getData(
        "application/reactflow-protocol"
      );
      const label = event.dataTransfer.getData("application/reactflow-label");

      if (!protocol || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Ensure new node id never conflicts with existing nodes (avoid replacing on drop)
      const existingIds = new Set(nodes.map((n) => n.id));
      const maxN = nodes.reduce((max, n) => {
        const m = n.id.match(/^node-(\d+)$/);
        const num = m ? parseInt(m[1], 10) : 0;
        return Math.max(max, num);
      }, 0);
      let nextNum = maxN + 1;
      while (existingIds.has(`node-${nextNum}`)) nextNum++;
      const nextNodeId = `node-${nextNum}`;

      // Find the highest sequence number among existing nodes
      const maxSequence = Math.max(
        0,
        ...nodes
          .filter((n) => n.data.sequenceNumber !== undefined)
          .map((n) => n.data.sequenceNumber || 0)
      );

      const newNode: Node<ProtocolNodeData> = {
        id: nextNodeId,
        type: "protocol",
        position,
        data: {
          protocol: protocol as any,
          label: label,
          sequenceNumber: maxSequence + 1, // Add to the end
          // Set default action for Uniswap nodes
          ...(protocol === "uniswap" ? { action: "swap" as const } : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, nodes]
  );

  const handleAddNodeFromSidebar = useCallback(
    (protocol: string, label: string) => {
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const position = reactFlowInstance.screenToFlowPosition({
        x: centerX,
        y: centerY,
      });

      const existingIds = new Set(nodes.map((n) => n.id));
      const maxN = nodes.reduce((max, n) => {
        const m = n.id.match(/^node-(\d+)$/);
        const num = m ? parseInt(m[1], 10) : 0;
        return Math.max(max, num);
      }, 0);
      let nextNum = maxN + 1;
      while (existingIds.has(`node-${nextNum}`)) nextNum++;
      const nextNodeId = `node-${nextNum}`;

      const maxSequence = Math.max(
        0,
        ...nodes
          .filter((n) => n.data.sequenceNumber !== undefined)
          .map((n) => n.data.sequenceNumber || 0)
      );

      const newNode: Node<ProtocolNodeData> = {
        id: nextNodeId,
        type: "protocol",
        position,
        data: {
          protocol: protocol as any,
          label: label,
          sequenceNumber: maxSequence + 1,
          ...(protocol === "uniswap" ? { action: "swap" as const } : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, nodes]
  );

  const handleSave = () => {
    const tabName = tabs.find((t) => t.id === activeTabId)?.name || "My Kratong #1";

    // Normalize nodes before saving - ensure all Uniswap nodes have action field
    const normalizedNodes = nodes.map((node) => {
      if (node.data.protocol === "uniswap" && !node.data.action) {
        // Default to "swap" if no action is set
        return {
          ...node,
          data: {
            ...node.data,
            action: "swap" as const,
          },
        };
      }
      return node;
    });

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
  };

  const handleLoad = () => {
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
            const normalizedNodes = loadedNodes.map((node: Node<ProtocolNodeData>) => {
              if (node.data.protocol === "uniswap") {
                // If action is missing but swapFrom/swapTo exist, set action to "swap"
                if (!node.data.action && (node.data.swapFrom || node.data.swapTo)) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      action: "swap" as const,
                    },
                  };
                }
                // If action is missing and no swap data, default to "swap"
                if (!node.data.action) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      action: "swap" as const,
                    },
                  };
                }
              }
              return node;
            });

            // Always add loaded flow as a new tab
            const newTab: Tab = {
              id: `${tabId++}`,
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
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes as Node<ProtocolNodeData>[]);
      setEdges(prevState.edges);
      setHistoryIndex((prev) => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes as Node<ProtocolNodeData>[]);
      setEdges(nextState.edges);
      setHistoryIndex((prev) => prev + 1);
    }
  };

  const handleReset = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const handleShare = async (): Promise<string> => {
    setIsSharing(true);
    setShareError(null);

    try {
      const tabName = tabs.find((t) => t.id === activeTabId)?.name || "My Kratong";

      // Normalize nodes before sharing - ensure all Uniswap nodes have action field
      const normalizedNodes = nodes.map((node) => {
        if (node.data.protocol === "uniswap" && !node.data.action) {
          // Default to "swap" if no action is set
          return {
            ...node,
            data: {
              ...node.data,
              action: "swap" as const,
            },
          };
        }
        return node;
      });

      const flowData: FlowShareData = {
        nodes: normalizedNodes,
        edges: edges,
        name: tabName,
        timestamp: Date.now(),
      };

      const cid = await uploadFlowToIPFS(flowData);
      const url = getShareUrl(cid);

      setShareUrl(url);
      setIsSharing(false);

      return cid;
    } catch (error) {
      console.error("Failed to share flow:", error);
      setIsSharing(false);
      setShareError(error instanceof Error ? error.message : "Failed to share flow");
      throw error;
    }
  };

  const handleOpenShareDialog = () => {
    setShareUrl(undefined);
    setShareError(null);
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setShareUrl(undefined);
    setShareError(null);
  };

  const handleLoadSharedFlow = useCallback((loadedNodes: Node[], loadedEdges: Edge[]) => {
    // Normalize nodes - ensure Uniswap nodes have action field set
    const normalizedNodes = loadedNodes.map((node: Node) => {
      const nodeData = node.data as ProtocolNodeData;
      if (nodeData.protocol === "uniswap") {
        // If action is missing but swapFrom/swapTo exist, set action to "swap"
        if (!nodeData.action && (nodeData.swapFrom || nodeData.swapTo)) {
          return {
            ...node,
            data: {
              ...nodeData,
              action: "swap" as const,
            },
          };
        }
        // If action is missing and no swap data, default to "swap"
        if (!nodeData.action) {
          return {
            ...node,
            data: {
              ...nodeData,
              action: "swap" as const,
            },
          };
        }
      }
      return node;
    });

    // Create a new tab for the shared flow
    const newTab: Tab = {
      id: `${tabId++}`,
      name: "Shared Kratong",
      nodes: normalizedNodes as Node<ProtocolNodeData>[],
      edges: loadedEdges,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setNodes(newTab.nodes);
    setEdges(newTab.edges);
    setIsLoadingSharedFlow(false);
  }, [setNodes, setEdges]);

  const handleLoadError = useCallback((message: string) => {
    console.error("Failed to load shared flow:", message);
    alert(`Failed to load shared flow: ${message}`);
    setIsLoadingSharedFlow(false);
    // Restore default nodes on error
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]);

  // Load shared flows from URL parameters
  useSharedFlowLoader({
    onLoadSharedFlow: handleLoadSharedFlow,
    onError: handleLoadError,
  });

  const handleNewTab = () => {
    const newTab: Tab = {
      id: `${tabId++}`,
      name: `My Kratong #${tabs.length + 1}`,
      nodes: initialNodes,
      edges: initialEdges,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setNodes(newTab.nodes);
    setEdges(newTab.edges);
  };

  const handleTabChange = (tabId: string) => {
    // Save current tab state
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, nodes, edges } : tab
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

  const handleTabClose = (tabId: string) => {
    if (tabs.length === 1) return;

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

  const handleReorderNodes = (newOrder: string[]) => {
    if (newOrder.length === 0) return;

    // Find wallet node
    const walletNode = nodes.find((n) => n.data.protocol === "wallet");
    if (!walletNode) return;

    const firstNodeId = newOrder[0];

    // Update sequence numbers
    setNodes((nds) =>
      nds.map((node) => {
        const orderIndex = newOrder.indexOf(node.id);
        if (orderIndex !== -1) {
          return {
            ...node,
            data: {
              ...node.data,
              sequenceNumber: orderIndex + 1, // +1 because sequence starts at 1
            },
          };
        }
        return node;
      })
    );

    // Ensure the first node is connected ONLY to wallet
    setEdges((eds) => {
      // Remove ALL incoming edges to the first node
      const filteredEdges = eds.filter((edge) => edge.target !== firstNodeId);

      // Add single edge from wallet to first node
      return [
        ...filteredEdges,
        {
          id: `${walletNode.id}-${firstNodeId}`,
          source: walletNode.id,
          target: firstNodeId,
          type: edgeType,
        },
      ];
    });
  };

  return (
    <div
      ref={fullscreenContainerRef}
      className={`flex flex-col h-full w-full bg-gray-50 dark:bg-gray-950 ${isFullscreen ? "min-h-screen min-w-screen" : ""}`}
    >
      <Toolbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isRightDrawerOpen={isRightDrawerOpen}
        onToggleRightDrawer={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
        isMiniMapVisible={isMiniMapVisible}
        onToggleMiniMap={() => setIsMiniMapVisible(!isMiniMapVisible)}
        edgeType={edgeType}
        onEdgeTypeChange={(type) => {
          setEdgeType(type);
          // Update all existing edges with new type
          setEdges((eds) => eds.map((e) => ({ ...e, type })));
        }}
        selectedEdgeId={selectedEdgeId}
        onDeleteEdge={handleDeleteEdge}
        onSave={handleSave}
        onLoad={handleLoad}
        onShare={handleOpenShareDialog}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        onNewTab={handleNewTab}
        onExecuteFlow={() => executeFlowRef.current?.()}
        isExecutingFlow={isExecutingFlow}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />
      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        onTabAdd={handleNewTab}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
            isOpen={isSidebarOpen}
            onAddNode={handleAddNodeFromSidebar}
          />
        <div
          ref={reactFlowWrapper}
          className="flex-1 bg-gray-50 dark:bg-gray-950"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes as NodeTypes}
            fitView
            defaultEdgeOptions={{
              style: { strokeWidth: 2 },
            }}
            edgesFocusable
            elementsSelectable
          >
            <Background
              gap={16}
              size={1}
              color={theme === "dark" ? "#ffffff" : "#d1d5db"}
              style={{
                backgroundColor: theme === "dark" ? "#030712" : "#f9fafb",
              }}
            />
            <Controls />
            {isMiniMapVisible && <MiniMap />}
          </ReactFlow>
        </div>
        <RightDrawer
          isOpen={isRightDrawerOpen}
          onClose={() => setIsRightDrawerOpen(false)}
          nodes={nodes}
          edges={edges}
          onReorderNodes={handleReorderNodes}
          onRegisterExecute={(execute) => {
            executeFlowRef.current = execute;
          }}
          onExecutionChange={setIsExecutingFlow}
        />
      </div>
      <ShareDialog
        open={shareDialogOpen}
        onClose={handleCloseShareDialog}
        onShare={handleShare}
        shareUrl={shareUrl}
        isSharing={isSharing}
      />

      {/* Loading overlay for shared flows */}
      {isLoadingSharedFlow && (
        <div className="fixed inset-0 z-[200] bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Receiving Kratong
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Loading flow from IPFS...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Flow() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
