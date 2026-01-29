import { Moon, Sun, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface TopBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ isSidebarOpen, onToggleSidebar }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm transition-colors">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          DeFi Strategy Builder
        </h1>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          EIP-7702 Powered
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <PanelLeftOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>
        <button className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Export Strategy
        </button>
        <button className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-gray-300">
          Clear Canvas
        </button>
      </div>
    </div>
  );
}
