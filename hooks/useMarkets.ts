"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Market, GroupedMarket } from "@/types";
import { markets as initialMarkets } from "@/lib/mockData";

type OrderBy = "recent" | "volume" | "closing";

interface UseMarketsReturn {
  markets: (Market | GroupedMarket)[];
  filteredMarkets: (Market | GroupedMarket)[];
  setCategory: (category: string) => void;
  setSearch: (search: string) => void;
  setOrderBy: (order: OrderBy) => void;
  isLoading: boolean;
  category: string;
  search: string;
  orderBy: OrderBy;
}

export function useMarkets(): UseMarketsReturn {
  const [markets, setMarkets] = useState<(Market | GroupedMarket)[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<OrderBy>("recent");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate async data fetching
    setIsLoading(true);
    const timer = setTimeout(() => {
      setMarkets(initialMarkets);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const handleSetCategory = useCallback((cat: string) => {
    setCategory(cat);
  }, []);

  const handleSetSearch = useCallback((s: string) => {
    setSearch(s);
  }, []);

  const handleSetOrderBy = useCallback((order: OrderBy) => {
    setOrderBy(order);
  }, []);

  const filteredMarkets = useMemo(() => {
    let result = [...markets];

    // Filter by category
    if (category !== "Todos") {
      result = result.filter((m) => m.category === category);
    }

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (orderBy) {
      case "volume":
        result.sort((a, b) => b.volume - a.volume);
        break;
      case "closing":
        result.sort(
          (a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime()
        );
        break;
      case "recent":
      default:
        // Live markets first, then by volume
        result.sort((a, b) => {
          if (a.live !== b.live) return b.live - a.live;
          return b.volume - a.volume;
        });
        break;
    }

    return result;
  }, [markets, category, search, orderBy]);

  return {
    markets,
    filteredMarkets,
    setCategory: handleSetCategory,
    setSearch: handleSetSearch,
    setOrderBy: handleSetOrderBy,
    isLoading,
    category,
    search,
    orderBy,
  };
}
