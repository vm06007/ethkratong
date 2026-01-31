interface SharedFlowLoadingOverlayProps {
  isVisible: boolean;
}

/**
 * Loading overlay displayed while loading shared flows from IPFS
 */
export function SharedFlowLoadingOverlay({ isVisible }: SharedFlowLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Receiving Kratong
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Loading flow from IPFS...
          </p>
        </div>
      </div>
    </div>
  );
}
