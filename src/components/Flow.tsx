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
import { useTheme } from "@/hooks/useTheme";
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

let nodeId = 2;
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
    { id: "1", name: "Strategy 1", nodes: initialNodes, edges: initialEdges },
  ]);
  const [activeTabId, setActiveTabId] = useState("1");
  const { theme } = useTheme();

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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
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

      // Find the highest sequence number among existing nodes
      const maxSequence = Math.max(
        0,
        ...nodes
          .filter((n) => n.data.sequenceNumber !== undefined)
          .map((n) => n.data.sequenceNumber || 0)
      );

      const newNode: Node<ProtocolNodeData> = {
        id: `node-${nodeId++}`,
        type: "protocol",
        position,
        data: {
          protocol: protocol as any,
          label: label,
          sequenceNumber: maxSequence + 1, // Add to the end
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, nodes]
  );

  const handleSave = () => {
    const strategy = {
      nodes,
      edges,
      name: tabs.find((t) => t.id === activeTabId)?.name || "Strategy",
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
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
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

  const handleNewTab = () => {
    const newTab: Tab = {
      id: `${tabId++}`,
      name: `Strategy ${tabId}`,
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
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-950">
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        onNewTab={handleNewTab}
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
        <Sidebar isOpen={isSidebarOpen} />
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
        />
      </div>
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
