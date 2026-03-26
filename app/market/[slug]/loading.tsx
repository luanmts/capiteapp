import { ArrowLeft } from "lucide-react";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-medium rounded animate-pulse ${className}`} />;
}

export default function MarketLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      {/* Back */}
      <div className="flex items-center gap-1.5 text-text-tint mb-6">
        <ArrowLeft className="w-4 h-4" />
        <SkeletonBlock className="h-4 w-32" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main skeleton */}
        <div className="flex-1 space-y-5">
          {/* Header card */}
          <div className="bg-card border border-white/[0.06] rounded-xl p-5 space-y-4 animate-pulse">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <SkeletonBlock className="h-5 w-24 rounded-full" />
                  <SkeletonBlock className="h-5 w-20 rounded-full" />
                </div>
                <SkeletonBlock className="h-6 w-full" />
                <SkeletonBlock className="h-6 w-3/4" />
              </div>
            </div>
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <div className="flex gap-6 pt-2 border-t border-white/[0.04]">
              <SkeletonBlock className="h-10 w-24" />
              <SkeletonBlock className="h-10 w-24" />
              <SkeletonBlock className="h-10 w-24" />
            </div>
          </div>

          {/* Chart card */}
          <div className="bg-card border border-white/[0.06] rounded-xl p-5 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <SkeletonBlock className="h-4 w-48" />
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-7 w-10 rounded-lg" />
                ))}
              </div>
            </div>
            <SkeletonBlock className="h-44 w-full rounded-lg" />
          </div>

          {/* Selections card */}
          <div className="bg-card border border-white/[0.06] rounded-xl p-5 space-y-3 animate-pulse">
            <SkeletonBlock className="h-4 w-40 mb-1" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
          </div>

          {/* Recent trades */}
          <div className="bg-card border border-white/[0.06] rounded-xl p-5 space-y-3 animate-pulse">
            <SkeletonBlock className="h-4 w-48 mb-1" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Trade panel skeleton */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="bg-card border border-white/[0.06] rounded-xl p-5 space-y-5 animate-pulse">
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-32" />
              <div className="grid grid-cols-2 gap-2">
                <SkeletonBlock className="h-16 rounded-xl" />
                <SkeletonBlock className="h-16 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-12 rounded-xl" />
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-8 w-12 rounded-lg" />
                ))}
              </div>
            </div>
            <SkeletonBlock className="h-20 rounded-xl" />
            <SkeletonBlock className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
