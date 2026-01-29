import { protocolTemplates } from "@/data/protocols";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const onDragStart = (
    event: React.DragEvent,
    protocol: string,
    label: string
  ) => {
    event.dataTransfer.setData("application/reactflow-protocol", protocol);
    event.dataTransfer.setData("application/reactflow-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-300 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">DeFi Protocols</h2>
      <div className="space-y-2">
        {protocolTemplates.map((template) => (
          <div
            key={template.protocol}
            className={cn(
              "p-3 rounded-lg border-2 border-gray-300 bg-white cursor-move",
              "hover:shadow-md transition-shadow",
              template.color.replace("bg-", "hover:border-")
            )}
            draggable
            onDragStart={(e) =>
              onDragStart(e, template.protocol, template.label)
            }
          >
            <div className="font-semibold text-sm">{template.label}</div>
            <div className="text-xs text-gray-600 mt-1">
              {template.description}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {template.availableActions.map((action) => (
                <span
                  key={action}
                  className="text-xs bg-gray-200 px-2 py-0.5 rounded"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
