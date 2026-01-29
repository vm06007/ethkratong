import { useCallback, useRef, useState } from "react";
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
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ProtocolNode from "./nodes/ProtocolNode";
import { Sidebar } from "./layout/Sidebar";
import { TopBar } from "./layout/TopBar";
import type { ProtocolNodeData } from "@/types";

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

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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

      const newNode: Node<ProtocolNodeData> = {
        id: `node-${nodeId++}`,
        type: "protocol",
        position,
        data: {
          protocol: protocol as any,
          label: label,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  return (
    <div className="flex flex-col h-full w-full">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
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
