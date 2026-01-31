import { useState, useRef, useCallback } from "react";
import type { Node } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import { validateFlowExecution } from "@/lib/flow";

/**
 * Hook to manage flow execution state and validation
 */
export function useFlowExecution(
  nodes: Node[],
  activeAccount: { address: string } | undefined,
  addToast: (message: string, type: "success" | "error" | "info") => void
) {
  const executeFlowRef = useRef<(() => Promise<void>) | null>(null);
  const [isExecutingFlow, setIsExecutingFlow] = useState(false);

  // Function to check if flow can be executed
  const canExecuteFlow = useCallback(() => {
    return validateFlowExecution(nodes as Node<ProtocolNodeData>[], activeAccount);
  }, [nodes, activeAccount]);

  const handleExecuteFlow = useCallback(async () => {
    const { canExecute, reason } = canExecuteFlow();
    if (!canExecute) {
      addToast(reason || "Cannot execute flow", "error");
      return;
    }

    if (executeFlowRef.current) {
      try {
        await executeFlowRef.current();
      } catch (error) {
        // Errors are already handled in the execute function
        console.error("Flow execution error:", error);
      }
    }
  }, [canExecuteFlow, addToast]);

  return {
    isExecutingFlow,
    setIsExecutingFlow,
    canExecuteFlow,
    handleExecuteFlow,
    executeFlowRef,
  };
}
