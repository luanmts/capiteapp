"use client";

import { useEffect, useRef } from "react";
import { Market } from "@/types";
import { useBets } from "@/contexts/BetsContext";

/**
 * Lifecycle hook for non-live markets.
 *
 * When `closesAt` passes, settles all open bets for this market:
 *   - Determines the outcome (mock: deterministic from marketId until backend is ready)
 *   - Calls resolveBetsForMarket (won/lost) or cancelBetsForMarket (tie/invalid)
 *
 * Architecture: `settle()` is isolated so it can be replaced by an API call
 * without touching the rest of the lifecycle logic.
 */
export function useMarketResolution(market: Market) {
  const { resolveBetsForMarket, cancelBetsForMarket } = useBets();
  const lastResolvedRef = useRef<string | null>(null); // tracks marketId+closesAt resolved

  useEffect(() => {
    // Live markets are handled by useLiveMarket (resolvedDirection flow)
    if (market.live === 1) return;

    const key = `${market.id}:${market.closesAt}`;
    if (lastResolvedRef.current === key) return;

    const closeTime = new Date(market.closesAt).getTime();
    const delay = closeTime - Date.now();

    // ── Mock outcome resolution ────────────────────────────────────────────────
    // TODO (backend): replace this function body with an API call that returns
    // the actual outcome: { result: "first" | "second" | "cancelled" }
    const settle = () => {
      if (lastResolvedRef.current === key) return;
      lastResolvedRef.current = key;

      // Deterministic mock: odd marketId char code → first wins, even → second wins
      // Gives a stable outcome across re-renders without randomness
      const firstSelectionWins = market.id.charCodeAt(market.id.length - 1) % 2 === 1;
      resolveBetsForMarket(market.id, firstSelectionWins);
    };

    if (delay <= 0) {
      settle();
      return;
    }

    const timer = setTimeout(settle, delay);
    return () => clearTimeout(timer);
  }, [market.id, market.closesAt, market.live, resolveBetsForMarket, cancelBetsForMarket]);
}
