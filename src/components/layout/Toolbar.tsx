import {
  Save,
  FolderOpen,
  Share2,
  Undo2,
  Redo2,
  RotateCcw,
  Palette,
  Search,
  Map,
  Plus,
  Upload,
  Globe,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Workflow,
  Trash2,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { WalletConnect } from "../WalletConnect";

interface ToolbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isRightDrawerOpen: boolean;
  onToggleRightDrawer: () => void;
  isMiniMapVisible: boolean;
  onToggleMiniMap: () => void;
  edgeType: "default" | "straight" | "step" | "smoothstep";
  onEdgeTypeChange: (type: "default" | "straight" | "step" | "smoothstep") => void;
  selectedEdgeId: string | null;
  onDeleteEdge: () => void;
  onSave: () => void;
  onLoad: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onNewTab: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  isSidebarOpen,
  onToggleSidebar,
  isRightDrawerOpen,
  onToggleRightDrawer,
  isMiniMapVisible,
  onToggleMiniMap,
  edgeType,
  onEdgeTypeChange,
  selectedEdgeId,
  onDeleteEdge,
  onSave,
  onLoad,
  onUndo,
  onRedo,
  onReset,
  onNewTab,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showEdgeMenu, setShowEdgeMenu] = useState(false);

  const iconButton = "p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const iconClass = "w-5 h-5 text-gray-700 dark:text-gray-300";

  const edgeTypes = [
    { value: "default" as const, label: "Curved" },
    { value: "straight" as const, label: "Straight" },
    { value: "step" as const, label: "Step" },
    { value: "smoothstep" as const, label: "Smooth Step" },
  ];

  return (
    <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm transition-colors">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={iconButton}
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className={iconClass} />
          ) : (
            <PanelLeftOpen className={iconClass} />
          )}
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* File Operations */}
        <button onClick={onSave} className={iconButton} aria-label="Save">
          <Save className={iconClass} />
        </button>
        <button onClick={onLoad} className={iconButton} aria-label="Load">
          <FolderOpen className={iconClass} />
        </button>
        <button className={iconButton} aria-label="Share">
          <Share2 className={iconClass} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={iconButton}
          aria-label="Undo"
        >
          <Undo2 className={iconClass} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={iconButton}
          aria-label="Redo"
        >
          <Redo2 className={iconClass} />
        </button>
        <button onClick={onReset} className={iconButton} aria-label="Reset">
          <RotateCcw className={iconClass} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Tools */}
        <button className={iconButton} aria-label="Color palette">
          <Palette className={iconClass} />
        </button>
        <button className={iconButton} aria-label="Search">
          <Search className={iconClass} />
        </button>
        <button
          onClick={onToggleMiniMap}
          className={iconButton}
          aria-label="Toggle minimap"
        >
          <Map className={iconClass} />
        </button>

        {/* Edge Type Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowEdgeMenu(!showEdgeMenu)}
            className={iconButton}
            aria-label="Edge type"
          >
            <Workflow className={iconClass} />
          </button>
          {showEdgeMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-[140px]">
              {edgeTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    onEdgeTypeChange(type.value);
                    setShowEdgeMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 ${
                    edgeType === type.value ? "bg-blue-50 dark:bg-blue-900/20 font-medium" : ""
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete Edge (conditional) */}
        {selectedEdgeId && (
          <button
            onClick={onDeleteEdge}
            className="p-2 rounded-lg bg-red-500 hover:bg-red-600 border border-red-600 transition-colors"
            aria-label="Delete connection"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Center Section - Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          ETH Kratong
        </h1>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          EIP-7702 Powered
        </span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* New Tab */}
        <button onClick={onNewTab} className={iconButton} aria-label="New tab">
          <Plus className={iconClass} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Share/Upload */}
        <button className={iconButton} aria-label="Upload">
          <Upload className={iconClass} />
        </button>

        {/* Globe Menu */}
        <button className={iconButton} aria-label="Links">
          <Globe className={iconClass} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Wallet Connect */}
        <WalletConnect />

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={iconButton}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className={iconClass} />
          ) : (
            <Sun className={iconClass} />
          )}
        </button>

        {/* Right Drawer Toggle */}
        <button
          onClick={onToggleRightDrawer}
          className={iconButton}
          aria-label="Toggle right panel"
        >
          {isRightDrawerOpen ? (
            <PanelRightClose className={iconClass} />
          ) : (
            <PanelRightOpen className={iconClass} />
          )}
        </button>
      </div>
    </div>
  );
}
