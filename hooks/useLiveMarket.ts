"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { settleMarket } from "@/lib/settlementApi";
import { fetchActiveRound, fetchRoundOdds } from "@/lib/marketsApi";

export type MarketPhase = "pre" | "live" | "transitioning" | "closed";

export interface LiveMarketState {
  phase: MarketPhase;
  minsLeft: number;
  secsLeft: number;
  priceTobeat: number;
  currentPrice: number;
  priceDelta: number;
  priceHistory: Array<{ t: number; price: number }>;
  newSlotLabel: string | null;
  roundKey: number;
  resolvedDirection: "up" | "down" | "cancelled" | null;
  /** ID do round ativo no banco — null até ser carregado */
  roundId: string | null;
  /** Odds atuais do round ativo — null até serem carregadas */
  currentYesOdd: number | null;
  currentNoOdd: number | null;
}

const TRANSITION_HOLD_MS = 2_000;
const SLUG = "bitcoin-70k-5min";

async function fetchBinancePrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = parseFloat(data.price);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

function currentWindowClose(): number {
  const STEP = 5 * 60 * 1000;
  return Math.floor(Date.now() / STEP) * STEP + STEP;
}

export function useLiveMarket(
  _closesAt: string,
  _isLive: boolean,
  _marketId?: string
): LiveMarketState & { refreshOdds: () => Promise<void> } {
  const priceRef        = useRef<number>(0);
  const priceTobeatRef  = useRef<number>(0);
  const roundIdRef      = useRef<string | null>(null);
  const phaseRef        = useRef<MarketPhase>("live");
  const prevCloseMs     = useRef(currentWindowClose());
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef  = useRef(false);
  const tickRef         = useRef(0);

  const [state, setState] = useState<LiveMarketState>({
    phase: "live",
    minsLeft: 4,
    secsLeft: 59,
    priceTobeat: 0,
    currentPrice: 0,
    priceDelta: 0,
    priceHistory: [],
    newSlotLabel: null,
    roundKey: 0,
    resolvedDirection: null,
    roundId: null,
    currentYesOdd: null,
    currentNoOdd: null,
  });

  // Busca round ativo e preço inicial do banco
  const initRound = useCallback(async () => {
    const [round, price] = await Promise.all([
      fetchActiveRound(SLUG),
      fetchBinancePrice(),
    ]);

    if (round) {
      priceTobeatRef.current = round.startPrice;
      roundIdRef.current     = round.roundId;
    }
    if (price) {
      priceRef.current = price;
    } else if (round) {
      priceRef.current = round.startPrice;
    }

    // Busca odds atuais do round ativo
    let currentYesOdd: number | null = null;
    let currentNoOdd: number | null = null;
    if (round?.roundId) {
      const odds = await fetchRoundOdds(round.roundId);
      currentYesOdd = odds.currentYesOdd;
      currentNoOdd  = odds.currentNoOdd;
    }

    console.log("[ODDS UI]", {
      source: "useLiveMarket.initRound",
      slug: SLUG,
      roundId: round?.roundId ?? null,
      currentYesOdd,
      currentNoOdd,
    });

    initializedRef.current = true;

    setState((prev) => ({
      ...prev,
      priceTobeat:   priceTobeatRef.current,
      currentPrice:  priceRef.current,
      priceDelta:    priceRef.current - priceTobeatRef.current,
      roundId:       roundIdRef.current,
      currentYesOdd,
      currentNoOdd,
    }));
  }, []);

  useEffect(() => {
    initRound();
  }, [initRound]);

  // Refresh manual das odds — chamado após aposta bem-sucedida
  const refreshOdds = useCallback(async () => {
    if (!roundIdRef.current) return;
    const odds = await fetchRoundOdds(roundIdRef.current);
    console.log("[ODDS UI]", {
      source: "useLiveMarket.refreshOdds",
      roundId: roundIdRef.current,
      currentYesOdd: odds.currentYesOdd,
      currentNoOdd:  odds.currentNoOdd,
    });
    setState((prev) => ({
      ...prev,
      currentYesOdd: odds.currentYesOdd,
      currentNoOdd:  odds.currentNoOdd,
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!initializedRef.current) return;

      const closeMs   = currentWindowClose();
      const now       = Date.now();
      const remaining = Math.max(0, closeMs - now);

      // Busca preço real da Binance
      const newPrice = await fetchBinancePrice();
      if (newPrice) priceRef.current = newPrice;

      // A cada 10s, atualiza odds do round ativo
      tickRef.current += 1;
      if (tickRef.current % 10 === 0 && roundIdRef.current) {
        const odds = await fetchRoundOdds(roundIdRef.current);
        if (odds.currentYesOdd !== null || odds.currentNoOdd !== null) {
          setState((prev) => ({
            ...prev,
            currentYesOdd: odds.currentYesOdd,
            currentNoOdd:  odds.currentNoOdd,
          }));
        }
      }

      // Detecta virada de round
      if (closeMs !== prevCloseMs.current) {
        prevCloseMs.current = closeMs;

        const delta = priceRef.current - priceTobeatRef.current;
        const finalDirection: "up" | "down" | "cancelled" =
          Math.abs(delta) < 0.01 ? "cancelled" : delta > 0 ? "up" : "down";

        // Settle do round anterior
        const token = typeof window !== "undefined"
          ? localStorage.getItem("capite_token")
          : null;

        if (token && roundIdRef.current) {
          const outcome = finalDirection === "up"
            ? "yes"
            : finalDirection === "down"
            ? "no"
            : "cancelled";
          settleMarket(roundIdRef.current, outcome, token);
        }

        // Busca novo round do banco
        const newRound = await fetchActiveRound(SLUG);
        if (newRound) {
          priceTobeatRef.current = newRound.startPrice;
          roundIdRef.current     = newRound.roundId;
        } else {
          // Fallback: usa preço atual como novo startPrice
          priceTobeatRef.current = priceRef.current;
        }

        const slotStart = new Date(closeMs - 5 * 60 * 1000);
        const newLabel  = `${String(slotStart.getHours()).padStart(2, "0")}:${String(slotStart.getMinutes()).padStart(2, "0")}`;

        phaseRef.current = "transitioning";
        if (transitionTimer.current) clearTimeout(transitionTimer.current);
        transitionTimer.current = setTimeout(() => {
          phaseRef.current = "live";
          setState((prev) => ({
            ...prev,
            phase:             "live",
            newSlotLabel:      newLabel,
            roundKey:          prev.roundKey + 1,
            resolvedDirection: finalDirection,
          }));
          setTimeout(() => setState((prev) => ({ ...prev, newSlotLabel: null })), 3_000);
          setTimeout(() => setState((prev) => ({ ...prev, resolvedDirection: null })), 1_000);
        }, TRANSITION_HOLD_MS);
      }

      setState((prev) => ({
        phase:        phaseRef.current,
        minsLeft:     Math.floor(remaining / 60000),
        secsLeft:     Math.floor((remaining % 60000) / 1000),
        priceTobeat:  priceTobeatRef.current,
        currentPrice: priceRef.current,
        priceDelta:   priceRef.current - priceTobeatRef.current,
        priceHistory: [...prev.priceHistory, { t: now, price: priceRef.current }].slice(-180),
        newSlotLabel: prev.newSlotLabel,
        roundKey:     prev.roundKey,
        resolvedDirection: prev.resolvedDirection,
        roundId:       roundIdRef.current,
        currentYesOdd: prev.currentYesOdd,
        currentNoOdd:  prev.currentNoOdd,
      }));
    }, 1000);

    return () => {
      clearInterval(interval);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  // Busca odds do novo round após transição
  useEffect(() => {
    if (!state.roundId) return;
    fetchRoundOdds(state.roundId).then((odds) => {
      if (odds.currentYesOdd !== null || odds.currentNoOdd !== null) {
        setState((prev) => ({
          ...prev,
          currentYesOdd: odds.currentYesOdd,
          currentNoOdd:  odds.currentNoOdd,
        }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundId]);

  return { ...state, refreshOdds };
}