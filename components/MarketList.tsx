"use client";

import { useState } from "react";
import { Market, GroupedMarket } from "@/types";
import MarketCard from "./MarketCard";
import MarketSkeleton from "./MarketSkeleton";
import { ChevronDown } from "lucide-react";

interface MarketListProps {
  markets: (Market | GroupedMarket)[];
  isLoading?: boolean;
}

const PAGE_SIZE = 8;

export default function MarketList({ markets, isLoading = false }: MarketListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleMarkets = markets.slice(0, visibleCount);
  const hasMore = visibleCount < markets.length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MarketSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!isLoading && markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-4xl mb-4">🔍</span>
        <h3 className="text-lg font-semibold text-white mb-2">
          Nenhum mercado encontrado
        </h3>
        <p className="text-sm text-text-tint max-w-sm">
          Tente ajustar os filtros ou buscar por outro termo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleMarkets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-medium border border-white/[0.08] text-sm text-text-tint hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Carregar mais ({markets.length - visibleCount} restantes)</span>
          </button>
        </div>
      )}
    </div>
  );
}
