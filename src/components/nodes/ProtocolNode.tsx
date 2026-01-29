import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import { cn } from "@/lib/utils";
import { allProtocols } from "@/data/protocols";
import { X } from "lucide-react";

function ProtocolNode({ data, selected, id }: NodeProps<ProtocolNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { deleteElements } = useReactFlow();

  const template = allProtocols.find((t) => t.protocol === data.protocol);
  const color = template?.color || "bg-gray-500";

  // These protocols are terminal nodes - no output handle
  const isTerminalNode = data.protocol === "transfer" || data.protocol === "custom";

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-white dark:bg-gray-800 shadow-lg transition-all",
        selected ? "border-blue-500 shadow-xl" : "border-gray-300 dark:border-gray-600",
        "min-w-[200px]"
      )}
    >
      {/* Input Handle */}
      {data.protocol !== "wallet" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-blue-500 !w-3 !h-3"
        />
      )}

      {/* Header */}
      <div
        className={cn(
          "px-4 py-2 text-white font-semibold rounded-t-md cursor-pointer relative",
          color
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <span>{data.label}</span>
          <button
            onClick={handleDelete}
            className="hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Delete node"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {isExpanded && (
          <>
            {/* Action Selection */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                Action:
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                value={data.action || ""}
                onChange={(e) => {
                  // Will be handled by parent flow component
                  console.log("Action changed:", e.target.value);
                }}
              >
                <option value="">Select action</option>
                {template?.availableActions.map((action) => (
                  <option key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Input */}
            {(data.action === "lend" ||
              data.action === "deposit" ||
              data.action === "borrow") && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Asset:
                </label>
                <input
                  type="text"
                  placeholder="e.g., USDC, ETH"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                  value={data.asset || ""}
                  onChange={(e) => {
                    console.log("Asset changed:", e.target.value);
                  }}
                />
              </div>
            )}

            {/* Amount Input */}
            {data.action && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Amount:
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                  value={data.amount || ""}
                  onChange={(e) => {
                    console.log("Amount changed:", e.target.value);
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Compact View */}
        {!isExpanded && data.action && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <div>
              <span className="font-medium">{data.action}</span>
              {data.asset && <span> • {data.asset}</span>}
            </div>
            {data.amount && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.amount}</div>
            )}
          </div>
        )}
      </div>

      {/* Output Handle - only for non-terminal nodes */}
      {!isTerminalNode && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-green-500 !w-3 !h-3"
        />
      )}
    </div>
  );
}

export default memo(ProtocolNode);
