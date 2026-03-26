export default function MarketSkeleton() {
  return (
    <div className="bg-card border border-white/[0.06] rounded-xl p-4 animate-pulse">
      {/* Category badge */}
      <div className="h-5 w-20 bg-gray-medium rounded-full mb-3" />

      {/* Title area */}
      <div className="flex items-start gap-2 mb-4">
        <div className="h-8 w-8 bg-gray-medium rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-medium rounded w-full" />
          <div className="h-4 bg-gray-medium rounded w-3/4" />
        </div>
      </div>

      {/* Selections */}
      <div className="space-y-2 mb-4">
        <div className="h-9 bg-gray-medium rounded-lg" />
        <div className="h-9 bg-gray-medium rounded-lg" />
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <div className="h-4 w-16 bg-gray-medium rounded" />
        <div className="h-4 w-20 bg-gray-medium rounded" />
      </div>
    </div>
  );
}
