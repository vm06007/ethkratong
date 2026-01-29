import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  name: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
}

export function Tabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
}: TabsProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 px-2 py-1">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors group",
            activeTabId === tab.id
              ? "bg-white dark:bg-gray-800 border border-b-0 border-gray-300 dark:border-gray-600"
              : "hover:bg-gray-200 dark:hover:bg-gray-800"
          )}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="text-sm dark:text-gray-200">{tab.name}</span>
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-700 rounded p-0.5"
            >
              <X className="w-3 h-3 dark:text-gray-400" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onTabAdd}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
        aria-label="New tab"
      >
        <Plus className="w-4 h-4 dark:text-gray-400" />
      </button>
    </div>
  );
}
