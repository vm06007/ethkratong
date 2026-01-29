import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import { cn } from "@/lib/utils";
import { protocolTemplates } from "@/data/protocols";

function ProtocolNode({ data, selected }: NodeProps<ProtocolNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false);

  const template = protocolTemplates.find((t) => t.protocol === data.protocol);
  const color = template?.color || "bg-gray-500";

  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-white shadow-lg transition-all",
        selected ? "border-blue-500 shadow-xl" : "border-gray-300",
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
          "px-4 py-2 text-white font-semibold rounded-t-md cursor-pointer",
          color
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {data.label}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {isExpanded && (
          <>
            {/* Action Selection */}
            <div>
              <label className="text-xs text-gray-600 block mb-1">
                Action:
              </label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
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
                <label className="text-xs text-gray-600 block mb-1">
                  Asset:
                </label>
                <input
                  type="text"
                  placeholder="e.g., USDC, ETH"
                  className="w-full border rounded px-2 py-1 text-sm"
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
                <label className="text-xs text-gray-600 block mb-1">
                  Amount:
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  className="w-full border rounded px-2 py-1 text-sm"
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
          <div className="text-sm text-gray-600">
            <div>
              <span className="font-medium">{data.action}</span>
              {data.asset && <span> • {data.asset}</span>}
            </div>
            {data.amount && (
              <div className="text-xs text-gray-500">{data.amount}</div>
            )}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-green-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ProtocolNode);
