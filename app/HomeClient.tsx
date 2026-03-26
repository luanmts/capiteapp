"use client";

import { useState, useCallback } from "react";
import { Market, GroupedMarket } from "@/types";
import CategoryTabs from "@/components/CategoryTabs";
import SearchInput from "@/components/SearchInput";
import MarketList from "@/components/MarketList";
import LiveChat from "@/components/LiveChat";

interface HomeClientProps {
  initialMarkets: (Market | GroupedMarket)[];
}

export default function HomeClient({ initialMarkets }: HomeClientProps) {
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const filteredMarkets = (() => {
    let result = [...initialMarkets];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query)
      );
    }

    if (category === "Em Alta") {
      result.sort((a, b) => b.volume - a.volume);
    } else {
      if (category !== "Todos") {
        result = result.filter((m) => m.category === category);
      }
      result.sort((a, b) => {
        if (a.live !== b.live) return b.live - a.live;
        return b.volume - a.volume;
      });
    }

    return result;
  })();

  return (
    <>
      <LiveChat />
      <div className="flex gap-6">
        {/* Main Content — pr adds room for the fixed chat sidebar on desktop */}
        <div className="flex-1 min-w-0 lg:pr-80">
          {/* Page Title */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-white mb-1">Mercados</h1>
            <p className="text-sm text-text-tint">
              Preveja eventos do mundo real e ganhe recompensas
            </p>
          </div>

          {/* Busca — apenas mobile */}
          <div className="mb-4 lg:hidden">
            <SearchInput value={search} onChange={handleSearch} />
          </div>

          {/* Categorias */}
          <div className="mb-5">
            <CategoryTabs active={category} onChange={setCategory} />
          </div>

          {/* Market Count */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-text-tint">
              {filteredMarkets.length} mercado{filteredMarkets.length !== 1 ? "s" : ""}
            </span>
            {filteredMarkets.some((m) => m.live === 1) && (
              <span className="flex items-center gap-1.5 text-xs text-primary-yellow">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-yellow opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-yellow" />
                </span>
                {filteredMarkets.filter((m) => m.live === 1).length} ao vivo agora
              </span>
            )}
          </div>

          {/* Market Grid */}
          <MarketList markets={filteredMarkets} isLoading={false} />
        </div>
      </div>
    </>
  );
}
