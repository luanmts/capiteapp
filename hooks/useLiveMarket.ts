"use client";

import { useState, useEffect, useRef } from "react";
import { settleMarket } from "@/lib/settlementApi";

export type MarketPhase = "pre" | "live" | "transitioning" | "closed";

export interface LiveMarketState {
  phase: MarketPhase;
  minsLeft: number;
  secsLeft: number;
  priceTobeat: number;
  currentPrice: number;
  priceDelta: number;
  priceHistory: Array<{ t: number; price: number }>;
  /** Label of the slot that just became active, set for 3s after roll-over */
  newSlotLabel: string | null;
  /** Increments each new round — use as React key to re-trigger entry animations */
  roundKey: number;
  /** Direction of the round that just resolved; set for ~1000ms after roll-over */
  resolvedDirection: "up" | "down" | "cancelled" | null;
}

// Mock BTC prices — simulates a live tracking window already in progress
const BTC_PRICE_TO_BEAT = 70_548.32; // price recorded at window open
const BTC_CURRENT_START = 70_604.9; // current price when component mounts

function randomWalk(prev: number): number {
  // Small random walk with very slight upward bias
  return prev + (Math.random() - 0.47) * 14;
}

// Returns the close timestamp of the current 5-minute window
function currentWindowClose(): number {
  const STEP = 5 * 60 * 1000;
  return Math.floor(Date.now() / STEP) * STEP + STEP;
}

// How long to show the transition toast after the window rolls over (ms)
const TRANSITION_HOLD_MS = 2_000;

export function useLiveMarket(_closesAt: string, _isLive: boolean, marketId?: string): LiveMarketState {
  const priceRef        = useRef(BTC_CURRENT_START);
  const priceTobeatRef  = useRef(BTC_PRICE_TO_BEAT);
  const phaseRef        = useRef<MarketPhase>("live");
  const prevCloseMs     = useRef(currentWindowClose());
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<LiveMarketState>({
    phase: "live",
    minsLeft: 4,
    secsLeft: 59,
    priceTobeat: BTC_PRICE_TO_BEAT,
    currentPrice: BTC_CURRENT_START,
    priceDelta: BTC_CURRENT_START - BTC_PRICE_TO_BEAT,
    priceHistory: [],
    newSlotLabel: null,
    roundKey: 0,
    resolvedDirection: null,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const closeMs   = currentWindowClose();
      const now       = Date.now();
      const remaining = Math.max(0, closeMs - now);

      priceRef.current = randomWalk(priceRef.current);
      const newPrice = priceRef.current;

      // Detect window roll-over: close timestamp changed to a new 5-min slot
      if (closeMs !== prevCloseMs.current) {
        prevCloseMs.current = closeMs;

        // Capture direction BEFORE updating priceTobeatRef
        // Tie (delta < $0.01) → cancelled with full refund
        const delta = newPrice - priceTobeatRef.current;
        const finalDirection: "up" | "down" | "cancelled" =
          Math.abs(delta) < 0.01 ? "cancelled" : delta > 0 ? "up" : "down";

        priceTobeatRef.current = newPrice;

        // Build new slot label: the start of this window HH:MM
        const slotStart = new Date(closeMs - 5 * 60 * 1000);
        const newLabel  = `${String(slotStart.getHours()).padStart(2, "0")}:${String(slotStart.getMinutes()).padStart(2, "0")}`;

        // Notifica o backend sobre o resultado do round (fire-and-forget)
        if (marketId) {
          const token = typeof window !== "undefined" ? localStorage.getItem("capite_token") : null;
          if (token) {
            const outcome = finalDirection === "up" ? "yes" : finalDirection === "down" ? "no" : "cancelled";
            settleMarket(marketId, outcome, token);
          }
        }

        // Transitioning: blur + feedback
        phaseRef.current = "transitioning";
        if (transitionTimer.current) clearTimeout(transitionTimer.current);
        transitionTimer.current = setTimeout(() => {
          phaseRef.current = "live";
          setState((prev) => ({
            ...prev,
            phase: "live",
            newSlotLabel: newLabel,
            roundKey: prev.roundKey + 1,
            resolvedDirection: finalDirection,
          }));
          // Clear badge after 3 s
          setTimeout(() => setState((prev) => ({ ...prev, newSlotLabel: null })), 3_000);
          // Clear resolvedDirection after 1000 ms
          setTimeout(() => setState((prev) => ({ ...prev, resolvedDirection: null })), 1_000);
        }, TRANSITION_HOLD_MS);
      }

      setState((prev) => ({
        phase: phaseRef.current,
        minsLeft: Math.floor(remaining / 60000),
        secsLeft: Math.floor((remaining % 60000) / 1000),
        priceTobeat: priceTobeatRef.current,
        currentPrice: newPrice,
        priceDelta: newPrice - priceTobeatRef.current,
        priceHistory: [...prev.priceHistory, { t: now, price: newPrice }].slice(-180),
        newSlotLabel: prev.newSlotLabel,
        roundKey: prev.roundKey,
        resolvedDirection: prev.resolvedDirection,
      }));
    }, 1000);

    return () => {
      clearInterval(interval);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  return state;
}
