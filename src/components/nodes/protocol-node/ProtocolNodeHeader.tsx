import { MoreVertical, Trash2, ExternalLink } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import type { ProtocolNodeData, NodeTemplate } from "@/types";

interface ProtocolNodeHeaderProps {
    data: ProtocolNodeData;
    template: NodeTemplate | undefined;
    color: string;
    onToggleExpand: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

export function ProtocolNodeHeader({
    data,
    template,
    color,
    onToggleExpand,
    onDelete,
}: ProtocolNodeHeaderProps) {
    return (
        <div
            className={cn(
                "px-4 py-2 text-white font-semibold rounded-t-md cursor-pointer relative",
                color
            )}
            onClick={onToggleExpand}
        >
            <div className="flex items-center justify-between">
                <span>
                    {data.sequenceNumber !== undefined && data.sequenceNumber > 0
                        ? `${data.sequenceNumber}. ${data.label}`
                        : data.label}
                </span>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="hover:bg-white/20 rounded p-1 transition-colors"
                            aria-label="Node options"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50"
                            sideOffset={5}
                        >
                            {template?.url && (
                                <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(template.url, "_blank", "noopener,noreferrer");
                                    }}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>View Protocol</span>
                                </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(e as React.MouseEvent);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
        </div>
    );
}
