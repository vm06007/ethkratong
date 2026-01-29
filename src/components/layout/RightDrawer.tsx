import { X, Play, CheckCircle2, AlertCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node<ProtocolNodeData>[];
  edges: Edge[];
  onReorderNodes: (newOrder: string[]) => void;
}

interface SortableStepProps {
  node: Node<ProtocolNodeData>;
  index: number;
  isExecuted: boolean;
  isConfigured: boolean;
}

function SortableStep({ node, index, isExecuted, isConfigured }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-all",
        isExecuted
          ? "border-green-500 dark:border-green-600"
          : isConfigured
          ? "border-gray-300 dark:border-gray-600"
          : "border-orange-400 dark:border-orange-600",
        isDragging && "shadow-xl z-50"
      )}
    >
      {/* Step Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
            {node.data.sequenceNumber}
          </span>
          <span className="font-semibold text-sm dark:text-gray-100">
            {node.data.label}
          </span>
        </div>
        {isExecuted && (
          <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
        )}
      </div>

      {/* Action Details */}
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 ml-11">
        {node.data.action ? (
          <>
            <div className="flex justify-between">
              <span className="font-medium">Action:</span>
              <span className="capitalize">{node.data.action}</span>
            </div>
            {node.data.asset && (
              <div className="flex justify-between">
                <span className="font-medium">Asset:</span>
                <span>{node.data.asset}</span>
              </div>
            )}
            {node.data.amount && (
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span>{node.data.amount}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-orange-500 dark:text-orange-400">
            ⚠ Action not configured
          </div>
        )}
      </div>
    </div>
  );
}

export function RightDrawer({ isOpen, onClose, nodes, edges, onReorderNodes }: RightDrawerProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executedSteps, setExecutedSteps] = useState<Set<string>>(new Set());

  // Sort nodes by sequence number for display
  const sortedNodes = [...nodes]
    .filter((node) => node.data.sequenceNumber !== undefined && node.data.sequenceNumber > 0)
    .sort((a, b) => (a.data.sequenceNumber || 0) - (b.data.sequenceNumber || 0));

  const hasActions = sortedNodes.length > 0;
  const allActionsConfigured = sortedNodes.every(
    (node) => node.data.action && node.data.amount
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedNodes.findIndex((n) => n.id === active.id);
      const newIndex = sortedNodes.findIndex((n) => n.id === over.id);

      const reorderedNodes = arrayMove(sortedNodes, oldIndex, newIndex);
      const newOrder = reorderedNodes.map((n) => n.id);

      onReorderNodes(newOrder);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    // Placeholder for actual execution logic
    console.log("Executing transaction sequence:", sortedNodes);

    // Simulate execution
    for (const node of sortedNodes) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setExecutedSteps((prev) => new Set(prev).add(node.id));
    }

    setIsExecuting(false);
  };

  return (
    <aside
      className={cn(
        "w-80 bg-gray-100 dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full absolute right-0 z-10 h-full"
      )}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold dark:text-gray-100">Execution Plan</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!hasActions ? (
            <div className="flex-1 flex items-center justify-center text-center px-4">
              <div className="space-y-2">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connect nodes to create an execution sequence
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Sequence List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedNodes.map((n) => n.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {sortedNodes.map((node, index) => {
                      const isExecuted = executedSteps.has(node.id);
                      const isConfigured = !!(node.data.action && node.data.amount);

                      return (
                        <SortableStep
                          key={node.id}
                          node={node}
                          index={index}
                          isExecuted={isExecuted}
                          isConfigured={isConfigured}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Execute Button */}
              <div className="border-t border-gray-300 dark:border-gray-700 pt-4">
                <button
                  onClick={handleExecute}
                  disabled={!allActionsConfigured || isExecuting}
                  className={cn(
                    "w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2",
                    allActionsConfigured && !isExecuting
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:scale-105"
                      : "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
                  )}
                >
                  {isExecuting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Execute Strategy</span>
                    </>
                  )}
                </button>
                {!allActionsConfigured && (
                  <p className="text-xs text-center text-orange-500 dark:text-orange-400 mt-2">
                    Configure all actions before executing
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
