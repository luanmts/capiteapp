"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { settleMarket } from "@/lib/settlementApi";
import { fetchActiveRound, fetchRoundOdds, fetchOilPrice } from "@/lib/marketsApi";

async function fetchBitcoinPrice(): Promise<number | null> {
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

async function fetchEthPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
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

/** Seleciona a fonte de preço REST (fallback / ativos sem WS). */
function selectPriceFetcher(slug: string): () => Promise<number | null> {
  if (slug === "petroleo-5min") return fetchOilPrice;
  if (slug === "eth-5min")      return fetchEthPrice;
  return fetchBitcoinPrice;
}

/**
 * Retorna o stream aggTrade da Binance para o slug.
 * Retorna null para ativos sem suporte WS (ex: petróleo).
 * Adicionar SOL: "sol-5min" → "solusdt@aggTrade"
 */
function selectWsStream(slug: string): string | null {
  const BASE = "wss://stream.binance.com:9443/ws";
  if (slug === "eth-5min") return `${BASE}/ethusdt@aggTrade`;
  if (slug === "petroleo-5min") return null;
  return `${BASE}/btcusdt@aggTrade`; // BTC é o default
}

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

function currentWindowClose(): number {
  const STEP = 5 * 60 * 1000;
  return Math.floor(Date.now() / STEP) * STEP + STEP;
}

export function useLiveMarket(
  _closesAt: string,
  _isLive: boolean,
  templateSlug: string = "bitcoin-70k-5min",
): LiveMarketState & { refreshOdds: () => Promise<void>; priceRef: React.MutableRefObject<number> } {
  const priceRef        = useRef<number>(0);
  const priceTobeatRef  = useRef<number>(0);
  const roundIdRef      = useRef<string | null>(null);
  const phaseRef        = useRef<MarketPhase>("live");
  const prevCloseMs     = useRef(currentWindowClose());
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef  = useRef(false);
  const tickRef         = useRef(0);
  const slugRef         = useRef(templateSlug);
  // Fonte de preço REST — usada apenas como fallback quando WS não está ativo
  const fetchPriceRef   = useRef(selectPriceFetcher(templateSlug));
  // true enquanto o WebSocket estiver conectado e entregando preços
  const wsActiveRef     = useRef(false);

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
      fetchActiveRound(slugRef.current),
      fetchPriceRef.current(),
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

    initializedRef.current = true;

    // Seed inicial: 2 pontos com o preço de abertura para o gráfico aparecer imediatamente
    const seedPrice = priceRef.current || priceTobeatRef.current;
    const seedNow   = Date.now();
    const seedHistory = seedPrice > 0
      ? [{ t: seedNow - 1000, price: seedPrice }, { t: seedNow, price: seedPrice }]
      : [];

    setState((prev) => ({
      ...prev,
      priceTobeat:   priceTobeatRef.current,
      currentPrice:  priceRef.current,
      priceDelta:    priceRef.current - priceTobeatRef.current,
      priceHistory:  seedHistory,
      roundId:       roundIdRef.current,
      currentYesOdd,
      currentNoOdd,
    }));
  }, []);

  useEffect(() => {
    initRound();
  }, [initRound]);

  // WebSocket Binance aggTrade — atualiza priceRef em tempo real
  // Fallback automático para REST polling se WS não estiver disponível
  useEffect(() => {
    const streamUrl = selectWsStream(slugRef.current);
    if (!streamUrl) return; // petróleo não tem WS — REST polling permanece

    const url = streamUrl; // narrowed to string (não null)
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      ws = new WebSocket(url);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          // aggTrade: campo "p" = price do trade executado
          const price = parseFloat(msg.p);
          if (!isNaN(price) && price > 0) {
            priceRef.current  = price;
            wsActiveRef.current = true;
          }
        } catch { /* ignora frames malformados */ }
      };

      ws.onopen = () => { wsActiveRef.current = true; };

      ws.onclose = () => {
        wsActiveRef.current = false;
        if (!destroyed) {
          // Reconecta após 3s — mantém REST como fallback no intervalo enquanto isso
          reconnectTimer = setTimeout(connect, 3_000);
        }
      };

      ws.onerror = () => {
        wsActiveRef.current = false;
        ws?.close(); // dispara onclose → reconnect
      };
    }

    connect();

    return () => {
      destroyed = true;
      wsActiveRef.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []); // slug não muda durante o ciclo de vida do componente

  // Timer independente — atualiza minsLeft/secsLeft e propaga mudanças de fase a cada 250ms
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const closeMs   = currentWindowClose();
      const remaining = Math.max(0, closeMs - Date.now());
      const newMins   = Math.floor(remaining / 60000);
      const newSecs   = Math.floor((remaining % 60000) / 1000);
      const newPhase  = phaseRef.current;
      setState((prev) => {
        if (prev.minsLeft === newMins && prev.secsLeft === newSecs && prev.phase === newPhase) return prev;
        return { ...prev, minsLeft: newMins, secsLeft: newSecs, phase: newPhase };
      });
    }, 250);
    return () => clearInterval(timerInterval);
  }, []);

  // Refresh manual das odds — chamado após aposta bem-sucedida
  const refreshOdds = useCallback(async () => {
    if (!roundIdRef.current) return;
    const odds = await fetchRoundOdds(roundIdRef.current);
    setState((prev) => ({
      ...prev,
      currentYesOdd: odds.currentYesOdd,
      currentNoOdd:  odds.currentNoOdd,
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!initializedRef.current) return;

      const closeMs = currentWindowClose();
      const now     = Date.now();

      // 1. Detecta virada de round ANTES de qualquer fetch de rede
      //    Garante que phase:"transitioning" propaga via timer (250ms) sem esperar Binance
      if (closeMs !== prevCloseMs.current) {
        prevCloseMs.current = closeMs;

        const delta = priceRef.current - priceTobeatRef.current;
        const finalDirection: "up" | "down" | "cancelled" =
          Math.abs(delta) < 0.01 ? "cancelled" : delta > 0 ? "up" : "down";

        // Fase transição IMEDIATA — o timer (250ms) já propaga para o estado
        phaseRef.current = "transitioning";

        // Settle fire & forget
        const token = typeof window !== "undefined"
          ? localStorage.getItem("capite_token") : null;
        if (token && roundIdRef.current) {
          const outcome = finalDirection === "up" ? "yes"
            : finalDirection === "down" ? "no" : "cancelled";
          settleMarket(roundIdRef.current, outcome, token);
        }

        // Busca novo round (pode ter latência, mas fase já está em transitioning)
        const newRound = await fetchActiveRound(slugRef.current);
        if (newRound) {
          priceTobeatRef.current = newRound.startPrice;
          roundIdRef.current     = newRound.roundId;
        } else {
          priceTobeatRef.current = priceRef.current;
        }

        const slotStart = new Date(closeMs - 5 * 60 * 1000);
        const newLabel  = `${String(slotStart.getHours()).padStart(2, "0")}:${String(slotStart.getMinutes()).padStart(2, "0")}`;

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

        return; // Pula atualização de preço neste tick — próximo tick retoma normal
      }

      // 2. Tick normal: atualiza preço
      // Se WS está ativo, priceRef já foi atualizado em tempo real pelo onmessage.
      // Só faz fetch REST como fallback (ex: petróleo ou WS caído temporariamente).
      if (!wsActiveRef.current) {
        const newPrice = await fetchPriceRef.current();
        if (newPrice) priceRef.current = newPrice;
      }

      // A cada 50 ticks (~5s @ 100ms), atualiza odds do round ativo
      tickRef.current += 1;
      if (tickRef.current % 50 === 0 && roundIdRef.current) {
        const odds = await fetchRoundOdds(roundIdRef.current);
        if (odds.currentYesOdd !== null || odds.currentNoOdd !== null) {
          setState((prev) => ({
            ...prev,
            currentYesOdd: odds.currentYesOdd,
            currentNoOdd:  odds.currentNoOdd,
          }));
        }
      }

      setState((prev) => ({
        ...prev,
        phase:        phaseRef.current,
        priceTobeat:  priceTobeatRef.current,
        currentPrice: priceRef.current,
        priceDelta:   priceRef.current - priceTobeatRef.current,
        priceHistory: [...prev.priceHistory, { t: now, price: priceRef.current }].slice(-600),
        roundId:      roundIdRef.current,
      }));
    }, 100);

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

  return { ...state, refreshOdds, priceRef };
}