import { X, Play, CheckCircle2, AlertCircle, GripVertical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node, Edge } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useChainId } from "wagmi";
import { useWalletCapabilities } from "@/hooks/useWalletCapabilities";
import {
  prepareBatchedCalls,
  executeBatchedTransaction,
  trackBatchedTransactionStatus,
  sendSingleTransaction,
} from "@/services/batchedExecution";
import { getAbiFunctions } from "@/services/contractService";
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
  isExecuted: boolean;
  isConfigured: boolean;
}

function SortableStep({ node, isExecuted, isConfigured }: SortableStepProps) {
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
        {/* For transfer nodes, check if all required fields are present */}
        {node.data.protocol === "transfer" ? (
          node.data.asset && node.data.amount && node.data.recipientAddress ? (
            <>
              <div className="flex justify-between">
                <span className="font-medium">Action:</span>
                <span className="capitalize">Transfer</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Asset:</span>
                <span>{node.data.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span>{node.data.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">To:</span>
                <span className="font-mono">
                  {node.data.recipientAddress.slice(0, 6)}...{node.data.recipientAddress.slice(-4)}
                </span>
              </div>
            </>
          ) : (
            <div className="text-orange-500 dark:text-orange-400">
              ⚠ Action not configured
            </div>
          )
        ) : node.data.protocol === "custom" ? (
          node.data.contractAddress && node.data.customContractVerified && node.data.selectedFunction ? (
            <>
              <div className="flex justify-between">
                <span className="font-medium">Contract:</span>
                <span className="font-mono">
                  {node.data.contractAddress.slice(0, 6)}...{node.data.contractAddress.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Function:</span>
                <span>{node.data.selectedFunction}</span>
              </div>
            </>
          ) : (
            <div className="text-orange-500 dark:text-orange-400">
              ⚠ Set contract address and verify
            </div>
          )
        ) : node.data.action ? (
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

export function RightDrawer({ isOpen, onClose, nodes, edges: _edges, onReorderNodes }: RightDrawerProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executedSteps, setExecutedSteps] = useState<Set<string>>(new Set());
  const [executionError, setExecutionError] = useState<string | null>(null);

  const activeAccount = useActiveAccount();
  const chainId = useChainId();
  const { supportsBatch, isLoading: isCheckingCapabilities } = useWalletCapabilities();

  // Sort nodes by sequence number for display
  const sortedNodes = [...nodes]
    .filter((node) => node.data.sequenceNumber !== undefined && node.data.sequenceNumber > 0)
    .sort((a, b) => (a.data.sequenceNumber || 0) - (b.data.sequenceNumber || 0));

  const hasActions = sortedNodes.length > 0;

  // Check if all actions are configured
  const allActionsConfigured = sortedNodes.every((node) => {
    // For transfer nodes, check asset, amount, and recipient address (action is implicit)
    if (node.data.protocol === "transfer") {
      return !!(node.data.amount && node.data.asset && node.data.recipientAddress);
    }
    // For custom contract nodes, check contract verified + function + args
    if (node.data.protocol === "custom") {
      if (!node.data.contractAddress || !node.data.customContractVerified || !node.data.selectedFunction) {
        return false;
      }
      const fns = node.data.contractAbi ? getAbiFunctions(node.data.contractAbi) : [];
      const fn = fns.find((f) => f.name === node.data.selectedFunction);
      const inputs = fn?.inputs || [];
      const args = node.data.functionArgs || {};
      const allArgsFilled = inputs.every((inp) => (args[inp.name] ?? "").trim() !== "");
      return allArgsFilled;
    }
    return !!(node.data.action && node.data.amount);
  });

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
    if (!activeAccount?.address) {
      setExecutionError("No wallet connected");
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);

    try {
      const effectiveChainId = chainId || 1;

      console.log("🚀 Starting execution:", {
        nodeCount: sortedNodes.length,
        supportsBatch,
        chainId: effectiveChainId,
      });

      // Prepare all calls (transfers + custom contract nodes) in order
      const calls = await prepareBatchedCalls(sortedNodes, effectiveChainId);

      if (calls.length === 0) {
        throw new Error("No valid actions to execute");
      }

      console.log(`Prepared ${calls.length} call(s)`);

      if (supportsBatch && calls.length > 0) {
        console.log("Using batched EIP-7702 execution");
        const result = await executeBatchedTransaction(calls, activeAccount.address, effectiveChainId);
        console.log("Batch submitted:", result.id);
        const txHash = await trackBatchedTransactionStatus(result.id);
        console.log("Transaction confirmed:", txHash);
      } else {
        console.log("Sending transactions sequentially");
        for (const call of calls) {
          const txHash = await sendSingleTransaction(call, activeAccount.address, effectiveChainId);
          console.log("Transaction submitted:", txHash);
        }
      }

      // Mark all steps as executed
      sortedNodes.forEach((node) => {
        setExecutedSteps((prev) => new Set(prev).add(node.id));
      });
      setExecutionError(null);
      console.log("Execution completed successfully");
    } catch (error: any) {
      console.error("Execution failed:", error);

      // Check for user rejection (code 4001 is standard rejection code)
      if (error?.code === 4001 || error?.message?.toLowerCase().includes("user rejected")) {
        setExecutionError("Transaction rejected by user");
      } else {
        setExecutionError(error instanceof Error ? error.message : "Execution failed");
      }
    } finally {
      // Always reset executing state
      setIsExecuting(false);
    }
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
                    {sortedNodes.map((node) => {
                      const isExecuted = executedSteps.has(node.id);

                      // Check configuration based on node type
                      // Check configuration based on node type
                      let isConfigured: boolean;
                      if (node.data.protocol === "transfer") {
                        isConfigured = !!(node.data.amount && node.data.asset && node.data.recipientAddress);
                      } else if (node.data.protocol === "custom") {
                        const hasBase = !!(node.data.contractAddress && node.data.customContractVerified && node.data.selectedFunction);
                        const fns = node.data.contractAbi ? getAbiFunctions(node.data.contractAbi) : [];
                        const fn = fns.find((f) => f.name === node.data.selectedFunction);
                        const inputs = fn?.inputs || [];
                        const args = node.data.functionArgs || {};
                        isConfigured = hasBase && inputs.every((inp) => (args[inp.name] ?? "").trim() !== "");
                      } else {
                        isConfigured = !!(node.data.action && node.data.amount);
                      }

                      return (
                        <SortableStep
                          key={node.id}
                          node={node}
                          isExecuted={isExecuted}
                          isConfigured={isConfigured}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Execute Button */}
              <div className="border-t border-gray-300 dark:border-gray-700 pt-4 space-y-2">
                {/* Batching Status Indicator */}
                {!isCheckingCapabilities && supportsBatch && (
                  <div className="flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-400 mb-2">
                    <Zap className="w-4 h-4" />
                    <span>Atomic batching enabled</span>
                  </div>
                )}

                <button
                  onClick={handleExecute}
                  disabled={!allActionsConfigured || isExecuting || !activeAccount}
                  className={cn(
                    "w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2",
                    allActionsConfigured && !isExecuting && activeAccount
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

                {/* Error Message */}
                {executionError && (
                  <p className="text-xs text-center text-red-500 dark:text-red-400">
                    {executionError}
                  </p>
                )}

                {/* Configuration Warning */}
                {!allActionsConfigured && !executionError && (
                  <p className="text-xs text-center text-orange-500 dark:text-orange-400">
                    Configure all actions before executing
                  </p>
                )}

                {/* No Wallet Warning */}
                {!activeAccount && !executionError && (
                  <p className="text-xs text-center text-orange-500 dark:text-orange-400">
                    Connect wallet to execute
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
