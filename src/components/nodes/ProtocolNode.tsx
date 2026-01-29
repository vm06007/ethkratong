import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { ProtocolNode as ProtocolNodeType } from "@/types";
import { cn } from "@/lib/utils";
import { useProtocolNode } from "./protocol-node/useProtocolNode";
import { ProtocolNodeHeader } from "./protocol-node/ProtocolNodeHeader";
import { ProtocolNodeWalletBody } from "./protocol-node/ProtocolNodeWalletBody";
import { ProtocolNodeExpandedBody } from "./protocol-node/ProtocolNodeExpandedBody";
import { ProtocolNodeCompactView } from "./protocol-node/ProtocolNodeCompactView";
import { UniswapExpandedModal } from "./protocol-node/UniswapExpandedModal";
import { UniswapConfigModal } from "./protocol-node/UniswapConfigModal";

function ProtocolNode({ data, selected, id }: NodeProps<ProtocolNodeType>) {
    const { deleteElements } = useReactFlow();
    const state = useProtocolNode(id, data);
    const [viewInFrameOpen, setViewInFrameOpen] = useState(false);
    const [expandedViewOpen, setExpandedViewOpen] = useState(false);

    const {
        isExpanded,
        setIsExpanded,
        template,
        color,
        isTerminalNode,
        tokenBalances,
        transferBalances,
        isVerifyingContract,
        setIsVerifyingContract,
        contractVerifyError,
        setContractVerifyError,
        currentViewValue,
        currentViewLoading,
        currentViewError,
        currentChain,
        activeAccount,
        updateNodeData,
    } = state;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteElements({ nodes: [{ id }] });
    };

    return (
        <div
            className={cn(
                "rounded-lg border-2 bg-white dark:bg-gray-800 shadow-lg transition-all",
                selected ? "border-blue-500 shadow-xl" : "border-gray-300 dark:border-gray-600",
                data.protocol === "transfer"
                    ? "w-fit min-w-[240px] max-w-[320px]"
                    : "min-w-[200px]"
            )}
        >
            {data.protocol !== "wallet" && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!bg-blue-500 !w-3 !h-3 !z-10"
                />
            )}

            <ProtocolNodeHeader
                data={data}
                template={template}
                color={color}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                onDelete={handleDelete}
                onViewInFrame={
                    data.protocol === "uniswap"
                        ? () => setViewInFrameOpen(true)
                        : undefined
                }
                onExpandedView={
                    data.protocol === "uniswap"
                        ? () => setExpandedViewOpen(true)
                        : undefined
                }
            />

            <div className="px-4 py-3 space-y-2">
                {data.protocol === "wallet" && (
                    <ProtocolNodeWalletBody
                        activeAccount={activeAccount}
                        tokenBalances={tokenBalances}
                        currentChain={{ name: currentChain?.name ?? "Unknown" }}
                    />
                )}

                {data.protocol !== "wallet" && isExpanded && (
                    <ProtocolNodeExpandedBody
                        data={data}
                        template={template}
                        chainId={state.chainId ?? undefined}
                        activeAccount={activeAccount}
                        transferBalances={transferBalances}
                        isVerifyingContract={isVerifyingContract}
                        contractVerifyError={contractVerifyError}
                        currentViewValue={currentViewValue}
                        currentViewLoading={currentViewLoading}
                        currentViewError={currentViewError}
                        onUpdateData={updateNodeData}
                        onSetVerifying={setIsVerifyingContract}
                        onSetVerifyError={setContractVerifyError}
                    />
                )}

                {data.protocol !== "wallet" && !isExpanded && (
                    <ProtocolNodeCompactView data={data} />
                )}
            </div>

            {!isTerminalNode && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!bg-green-500 !w-3 !h-3 !z-10"
                />
            )}

            {data.protocol === "uniswap" && (
                <>
                    <UniswapExpandedModal
                        open={viewInFrameOpen}
                        onOpenChange={setViewInFrameOpen}
                        chainId={state.chainId ?? undefined}
                        action={
                            data.action === "addLiquidity" ? "addLiquidity" : "swap"
                        }
                        swapFrom={data.swapFrom}
                        swapTo={data.swapTo}
                        liquidityTokenA={data.liquidityTokenA}
                        liquidityTokenB={data.liquidityTokenB}
                    />
                    <UniswapConfigModal
                        open={expandedViewOpen}
                        onOpenChange={setExpandedViewOpen}
                        data={data}
                        chainId={state.chainId ?? undefined}
                        onUpdateData={updateNodeData}
                    />
                </>
            )}
        </div>
    );
}

export default memo(ProtocolNode);
