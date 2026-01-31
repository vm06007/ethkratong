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
import { TabCloseConfirmDialog } from "./dialogs/TabCloseConfirmDialog";
import { SharedFlowLoadingOverlay } from "./overlays/SharedFlowLoadingOverlay";
import { useTheme } from "@/hooks/useTheme";
import { useSharedFlowLoader } from "@/hooks/useSharedFlowLoader";
import { useFlowToast } from "@/hooks/useFlowToast";
import { useFlowUI } from "@/hooks/useFlowUI";
import { useFlowHistory } from "@/hooks/useFlowHistory";
import { useFlowWorkspace } from "@/hooks/useFlowWorkspace";
import { useFlowExecution } from "@/hooks/useFlowExecution";
import { useFlowSequence } from "@/hooks/useFlowSequence";
import { useFlowEditor } from "@/hooks/useFlowEditor";
import { useFlowFileOperations } from "@/hooks/useFlowFileOperations";
import { useFlowShare } from "@/hooks/useFlowShare";
import type { ProtocolNodeData } from "@/types";
import { ToastContainer } from "./ui/toast";
import { useActiveAccount } from "thirdweb/react";

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

// Helper function to get initial workspace from localStorage or defaults
function getInitialWorkspace() {
  const WORKSPACE_STORAGE_KEY = "ethkratong-workspace";

  // Check if we're loading a shared flow
  const params = new URLSearchParams(window.location.search);
  const cid = params.get("s") || params.get("share");
  if (cid) {
    // Return empty state for shared flow loading
    return {
      tabs: [{ id: "1", name: "My Kratong #1", nodes: [], edges: [] }],
      activeTabId: "1",
      nodes: [],
      edges: [],
    };
  }

  // Try to restore from localStorage
  try {
    const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (saved) {
      const workspace = JSON.parse(saved);
      if (workspace.tabs && workspace.tabs.length > 0) {
        const activeTab = workspace.tabs.find((t: any) => t.id === workspace.activeTabId) || workspace.tabs[0];
        console.log("Workspace restored from localStorage");
        return {
          tabs: workspace.tabs,
          activeTabId: workspace.activeTabId || workspace.tabs[0].id,
          nodes: activeTab.nodes,
          edges: activeTab.edges,
        };
      }
    }
  } catch (error) {
    console.error("Failed to restore workspace from localStorage:", error);
  }

  // Return default state
  return {
    tabs: [{ id: "1", name: "My Kratong #1", nodes: initialNodes, edges: initialEdges }],
    activeTabId: "1",
    nodes: initialNodes,
    edges: initialEdges,
  };
}

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // Use useState with lazy initializer to only call getInitialWorkspace() once on mount
  const [initialWorkspace] = useState(() => getInitialWorkspace());

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkspace.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkspace.edges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [edgeType, setEdgeType] = useState<"default" | "straight" | "step" | "smoothstep">("default");

  // Get active account for execution validation
  const activeAccount = useActiveAccount();
  const { theme } = useTheme();

  // Check if loading shared flow
  const params = new URLSearchParams(window.location.search);
  const cid = params.get("s") || params.get("share");
  const isLoadingSharedFlowInitially = !!cid;

  // All custom hooks
  const toast = useFlowToast();
  const ui = useFlowUI();
  const workspace = useFlowWorkspace(
    {
      initialTabs: initialWorkspace.tabs,
      initialActiveTabId: initialWorkspace.activeTabId,
      isLoadingSharedFlow: isLoadingSharedFlowInitially,
    },
    nodes,
    edges,
    setNodes,
    setEdges
  );
  const history = useFlowHistory(nodes, edges, setNodes, setEdges);
  const execution = useFlowExecution(nodes, activeAccount, toast.addToast);
  const sequence = useFlowSequence(nodes, edges, setNodes, setEdges, edgeType);
  const editor = useFlowEditor(reactFlowInstance, reactFlowWrapper, nodes, setNodes);
  const fileOps = useFlowFileOperations(
    nodes,
    edges,
    workspace.tabs,
    workspace.activeTabId,
    workspace.setTabs,
    workspace.setActiveTabId,
    setNodes,
    setEdges,
    () => `${tabId++}`
  );
  const share = useFlowShare(
    nodes,
    edges,
    workspace.tabs,
    workspace.activeTabId,
    workspace.setTabs,
    workspace.setActiveTabId,
    setNodes,
    setEdges,
    () => `${tabId++}`
  );

  // Restore workspace from localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("s") || params.get("share");

    // If loading a shared flow, don't restore from localStorage
    if (cid) {
      share.setIsLoadingSharedFlow(true);
      setNodes([]);
      setEdges([]);
      return;
    }
  }, []);

  // Custom edge change handler to detect deletions
  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      // Check if any edge was removed
      const hasRemoval = changes.some((change) => change.type === "remove");
      if (hasRemoval) {
        ui.setSelectedEdgeId(null);
      }
      onEdgesChange(changes);
    },
    [onEdgesChange, ui]
  );

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

  // When connecting from Uniswap (swap) to Transfer, pre-fill with output
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
      ui.setSelectedEdgeId(edge.id);
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          animated: e.id === edge.id,
          selected: e.id === edge.id,
        }))
      );
    },
    [setEdges, ui]
  );

  const onPaneClick = useCallback(() => {
    // Deselect all edges when clicking on the pane
    ui.setSelectedEdgeId(null);
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: false,
        selected: false,
      }))
    );
  }, [setEdges, ui]);

  const handleDeleteEdge = useCallback(() => {
    if (ui.selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== ui.selectedEdgeId));
      ui.setSelectedEdgeId(null);
    }
  }, [ui.selectedEdgeId, setEdges, ui]);

  const handleSave = () => {
    workspace.saveWorkspaceToLocalStorage();
    workspace.setHasUnsavedChanges(false);
    toast.addToast("Workflow saved successfully", "success");
  };

  const handleReset = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const handleNewTab = () => {
    const newTab = {
      id: `${tabId++}`,
      name: `My Kratong #${workspace.tabs.length + 1}`,
      nodes: initialNodes,
      edges: initialEdges,
    };
    workspace.setTabs((prev) => [...prev, newTab]);
    workspace.setActiveTabId(newTab.id);
    setNodes(newTab.nodes);
    setEdges(newTab.edges);
  };

  // Load shared flows from URL parameters
  useSharedFlowLoader({
    onLoadSharedFlow: share.handleLoadSharedFlow,
    onError: (message) => share.handleLoadError(message, initialNodes, initialEdges),
  });

  return (
    <div
      ref={ui.fullscreenContainerRef}
      className={`flex flex-col h-full w-full bg-gray-50 dark:bg-gray-950 ${ui.isFullscreen ? "min-h-screen min-w-screen" : ""}`}
    >
      <Toolbar
        isSidebarOpen={ui.isSidebarOpen}
        onToggleSidebar={() => ui.setIsSidebarOpen(!ui.isSidebarOpen)}
        isRightDrawerOpen={ui.isRightDrawerOpen}
        onToggleRightDrawer={() => ui.setIsRightDrawerOpen(!ui.isRightDrawerOpen)}
        isMiniMapVisible={ui.isMiniMapVisible}
        onToggleMiniMap={() => ui.setIsMiniMapVisible(!ui.isMiniMapVisible)}
        edgeType={edgeType}
        onEdgeTypeChange={(type) => {
          setEdgeType(type);
          // Update all existing edges with new type
          setEdges((eds) => eds.map((e) => ({ ...e, type })));
        }}
        selectedEdgeId={ui.selectedEdgeId}
        onDeleteEdge={handleDeleteEdge}
        onSave={handleSave}
        onExport={fileOps.handleExport}
        onLoad={fileOps.handleLoad}
        onShare={share.handleOpenShareDialog}
        onUndo={history.handleUndo}
        onRedo={history.handleRedo}
        onReset={handleReset}
        onNewTab={handleNewTab}
        onExecuteFlow={execution.handleExecuteFlow}
        isExecutingFlow={execution.isExecutingFlow}
        onToggleFullscreen={ui.handleToggleFullscreen}
        isFullscreen={ui.isFullscreen}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />
      <Tabs
        tabs={workspace.tabs}
        activeTabId={workspace.activeTabId}
        onTabChange={workspace.handleTabChange}
        onTabClose={workspace.handleTabClose}
        onTabAdd={handleNewTab}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={ui.isSidebarOpen}
          onAddNode={editor.handleAddNodeFromSidebar}
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
            onDrop={editor.onDrop}
            onDragOver={editor.onDragOver}
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
            {ui.isMiniMapVisible && <MiniMap />}
          </ReactFlow>
        </div>
        <RightDrawer
          isOpen={ui.isRightDrawerOpen}
          onClose={() => ui.setIsRightDrawerOpen(false)}
          nodes={nodes as Node<ProtocolNodeData>[]}
          edges={edges}
          onReorderNodes={sequence.handleReorderNodes}
          onRegisterExecute={(execute) => {
            execution.executeFlowRef.current = execute;
          }}
          onExecutionChange={execution.setIsExecutingFlow}
        />
      </div>
      <ShareDialog
        open={share.shareDialogOpen}
        onClose={share.handleCloseShareDialog}
        onShare={share.handleShare}
        shareUrl={share.shareUrl}
        isSharing={share.isSharing}
      />

      <TabCloseConfirmDialog
        open={workspace.showTabCloseConfirm}
        onOpenChange={workspace.setShowTabCloseConfirm}
        onConfirm={workspace.handleTabCloseConfirm}
      />

      <SharedFlowLoadingOverlay isVisible={share.isLoadingSharedFlow} />

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
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
