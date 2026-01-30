import {
  Save,
  FolderOpen,
  Share2,
  Undo2,
  Redo2,
  RotateCcw,
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
  AlertTriangle,
  Play,
  Maximize2,
  Minimize2,
  Github,
  Twitter,
  Mail,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { WalletConnect } from "../WalletConnect";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onExecuteFlow?: () => void;
  isExecutingFlow?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  isSidebarOpen,
  onToggleSidebar,
  isRightDrawerOpen,
  onToggleRightDrawer,
  isMiniMapVisible: _isMiniMapVisible,
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
  onExecuteFlow,
  isExecutingFlow,
  onToggleFullscreen,
  isFullscreen,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showEdgeMenu, setShowEdgeMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetClick = () => setShowResetConfirm(true);
  const handleResetConfirm = () => {
    onReset();
    setShowResetConfirm(false);
  };

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
        <button onClick={handleResetClick} className={iconButton} aria-label="Reset">
          <RotateCcw className={iconClass} />
        </button>

        {/* Reset confirmation dialog */}
        <Dialog.Root open={showResetConfirm} onOpenChange={setShowResetConfirm}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={cn(
                        "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    )}
                />
                <Dialog.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%]",
                        "rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl",
                        "p-5 space-y-4",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Reset current Kratong?
                            </Dialog.Title>
                            <Dialog.Description className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                                This will reset the current Kratong and clear all nodes and connections. Make sure you have saved your changes if you want to keep them. Do you wish to proceed?
                            </Dialog.Description>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                No
                            </button>
                        </Dialog.Close>
                        <button
                            type="button"
                            onClick={handleResetConfirm}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                        >
                            Yes
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Tools */}
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
      <div className="flex items-center gap-2">
        <img
          src="/loy-krathong.svg"
          alt=""
          className="h-[40px] w-auto object-contain"
        />
        <h1 className="text-black dark:text-[#efeaea] font-medium text-[23px] tracking-normal font-mono [text-shadow:revert-layer]">
          ETHKratong
        </h1>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={iconButton} aria-label="Community & Links">
              <Globe className={iconClass} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem asChild>
              <a
                href="https://github.com/ethkratong/ethkratong"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="https://x.com/ethkratong"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                <span>X (Twitter)</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="mailto:hi@ethkratong.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Wallet Connect */}
        <WalletConnect />

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Fullscreen canvas */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className={iconButton}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen canvas"}
          >
            {isFullscreen ? (
              <Minimize2 className={iconClass} />
            ) : (
              <Maximize2 className={iconClass} />
            )}
          </button>
        )}

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

        {/* Execute flow (same as drawer Launch button) */}
        {onExecuteFlow && (
          <button
            onClick={onExecuteFlow}
            disabled={isExecutingFlow}
            className={iconButton}
            aria-label={isExecutingFlow ? "Executing..." : "Launch Kratong"}
          >
            {isExecutingFlow ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className={iconClass} />
            )}
          </button>
        )}

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
