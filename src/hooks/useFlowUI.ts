import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to manage UI visibility states and responsive behavior
 */
export function useFlowUI() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [isMiniMapVisible, setIsMiniMapVisible] = useState(window.innerWidth > 768);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Handle responsive window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
        setIsRightDrawerOpen(false);
        setIsMiniMapVisible(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!fullscreenContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      fullscreenContainerRef.current.requestFullscreen();
    }
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    isRightDrawerOpen,
    setIsRightDrawerOpen,
    isMiniMapVisible,
    setIsMiniMapVisible,
    selectedEdgeId,
    setSelectedEdgeId,
    isFullscreen,
    handleToggleFullscreen,
    fullscreenContainerRef,
  };
}
