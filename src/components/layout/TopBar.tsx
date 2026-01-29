export function TopBar() {
  return (
    <div className="h-14 bg-white border-b border-gray-300 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          DeFi Strategy Builder
        </h1>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          EIP-7702 Powered
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Export Strategy
        </button>
        <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Clear Canvas
        </button>
      </div>
    </div>
  );
}
