import { useState } from "react";
import { protocolCategories } from "@/data/protocols";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Wallet,
  Building2,
  Repeat,
  TrendingUp,
  Settings,
} from "lucide-react";

const iconMap = {
  wallet: Wallet,
  building: Building2,
  repeat: Repeat,
  "trending-up": TrendingUp,
  settings: Settings,
};

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "Wallet",
    "Lending Protocols",
  ]);

  const onDragStart = (
    event: React.DragEvent,
    protocol: string,
    label: string
  ) => {
    event.dataTransfer.setData("application/reactflow-protocol", protocol);
    event.dataTransfer.setData("application/reactflow-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredCategories = protocolCategories
    .map((category) => ({
      ...category,
      protocols: category.protocols.filter(
        (protocol) =>
          protocol.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          protocol.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.protocols.length > 0);

  return (
    <aside
      className={cn(
        "w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full absolute z-10 h-full"
      )}
    >
      {/* Search */}
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search protocols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Protocol Categories */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredCategories.map((category) => {
          const isExpanded = expandedCategories.includes(category.name);
          const IconComponent = iconMap[category.icon as keyof typeof iconMap];

          return (
            <div key={category.name}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center gap-2 text-left py-2 text-sm font-semibold dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 rounded px-2 transition-colors"
              >
                {IconComponent && <IconComponent className="w-4 h-4" />}
                <span className="flex-1">{category.name}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Protocols */}
              {isExpanded && (
                <div className="mt-2 space-y-2 ml-2">
                  {category.protocols.map((template) => (
                    <div
                      key={template.protocol}
                      className={cn(
                        "p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-move",
                        "hover:shadow-md transition-shadow",
                        template.color.replace("bg-", "hover:border-")
                      )}
                      draggable
                      onDragStart={(e) =>
                        onDragStart(e, template.protocol, template.label)
                      }
                    >
                      <div className="font-semibold text-sm dark:text-gray-100">
                        {template.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {template.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.availableActions.map((action) => (
                          <span
                            key={action}
                            className="text-xs bg-gray-200 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
