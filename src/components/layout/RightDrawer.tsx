import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RightDrawer({ isOpen, onClose }: RightDrawerProps) {
  return (
    <aside
      className={cn(
        "w-80 bg-gray-100 dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full absolute right-0 z-10 h-full"
      )}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold dark:text-gray-100">Tools</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Search Section */}
          <div>
            <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">
              Search
            </h3>
            <input
              type="text"
              placeholder="Search nodes..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 text-sm"
            />
          </div>

          {/* History Stack Section */}
          <div>
            <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">
              History
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-300 dark:border-gray-600">
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div className="py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                  Added Aave node
                </div>
                <div className="py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                  Connected Wallet → Aave
                </div>
                <div className="py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                  Modified Aave action
                </div>
              </div>
            </div>
          </div>

          {/* Color Palette Section */}
          <div>
            <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">
              Node Colors
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {[
                "bg-red-500",
                "bg-orange-500",
                "bg-yellow-500",
                "bg-green-500",
                "bg-blue-500",
                "bg-indigo-500",
                "bg-purple-500",
                "bg-pink-500",
                "bg-gray-500",
                "bg-black",
              ].map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform",
                    color
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
