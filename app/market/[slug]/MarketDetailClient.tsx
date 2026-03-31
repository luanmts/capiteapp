"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Info, X } from "lucide-react";
import clsx from "clsx";
import { Market, GroupedMarket, Selection } from "@/types";
import { getCategoryColor, formatVolume, formatPercent, formatOdd } from "@/utils/formatters";
import LiveBadge from "@/components/LiveBadge";

const LiveChart = dynamic(() => import("@/components/LiveChart"), {
  ssr: false,
  loading: () => (
    <div className="h-44 flex items-center justify-center text-white/30 text-sm font-mono">
      Carregando gráfico...
    </div>
  ),
});
import PercentChart from "@/components/PercentChart";
import TradePanel from "@/components/TradePanel";
import TradeSheet from "@/components/TradeSheet";
import OddsDisplay from "@/components/OddsDisplay";
import { useLiveMarket } from "@/hooks/useLiveMarket";
import { useMarketResolution } from "@/hooks/useMarketResolution";
import { useTimer } from "@/hooks/useTimer";
import HowItWorks from "@/components/how-it-works";
import StoriesMultiChart from "@/components/StoriesMultiChart";
import HlsPlayer from "@/components/HlsPlayer";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { useBets } from "@/contexts/BetsContext";
import { fetchActiveRodoviaRound, ActiveRodoviaRound } from "@/lib/marketsApi";

interface Props {
  market: Market | GroupedMarket;
}

function isGrouped(m: Market | GroupedMarket): m is GroupedMarket {
  return "isGrouped" in m && m.isGrouped === true;
}

// Generate time slots anchored to the CURRENT 5-minute window.
// Slots are always fresh: past = completed rounds, 0 = live now, future = upcoming.
function buildSlots() {
  const STEP = 5 * 60 * 1000;
  const now = Date.now();

  // Start of the current 5-min window (floor to nearest 5 min)
  const currentStart = Math.floor(now / STEP) * STEP;
  const currentClose = currentStart + STEP;

  return [-2, -1, 0, 1, 2].map((offset) => {
    const slotStart = currentStart + offset * STEP;
    const d = new Date(slotStart);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return {
      label: `${hh}:${mm}`,
      isActive: offset === 0,
      isPast: offset < 0,
      isLive: offset === 0,
    };
  });
}

// Format window based on current time (recurring 5-min market) — shows start time
function formatWindow() {
  const STEP = 5 * 60 * 1000;
  const now = Date.now();
  const startMs = Math.floor(now / STEP) * STEP;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const day = new Date(now).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  return `${day} · ${fmt(startMs)}`;
}

// Mock últimos resultados (5 rodadas anteriores)
const RECENT_RESULTS = [false, false, true, false, false];
// true = "Mais de X" venceu, false = "Até X" venceu
const RODOVIA_RECENT_RESULTS = [true, false, true, true, false];

// ── Barra de ação sticky (mobile) ─────────────────────────────────────────────
function StickyActionBar({
  upSel,
  downSel,
  marketId,
  resolvedMarketId,
  marketTitle,
  marketIcon,
  marketImageUrl,
  upLabel = "Sobe",
  downLabel = "Desce",
  upIcon = "▲",
  downIcon = "▼",
  predictionsOpen = true,
  onBetSuccess,
}: {
  upSel: Selection | undefined;
  downSel: Selection | undefined;
  marketId: string;
  resolvedMarketId?: string;
  marketTitle: string;
  marketIcon?: string;
  marketImageUrl?: string;
  upLabel?: string;
  downLabel?: string;
  upIcon?: string;
  downIcon?: string;
  predictionsOpen?: boolean;
  onBetSuccess?: () => void;
}) {
  const { user, login } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [tradeDirection, setTradeDirection] = useState<"up" | "down" | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-gray-dark/98 backdrop-blur-md border-t border-white/[0.08]">
        {showInfo && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/5 border-b border-white/[0.05]">
            <button
              onClick={() => setHowItWorksOpen(true)}
              className="flex items-center gap-2 hover:opacity-75 transition-opacity"
            >
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm font-medium text-blue-400">Como funciona</span>
            </button>
            <button
              onClick={() => setShowInfo(false)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-text-tint" />
            </button>
          </div>
        )}
        {!predictionsOpen && (
          <div className="px-3 pt-2 pb-0 flex items-center justify-center gap-1.5">
            <svg className="w-3 h-3 text-text-tint/50 shrink-0" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] text-text-tint/50 font-medium">Previsões encerradas para esta rodada</span>
          </div>
        )}
        <div className={clsx("flex gap-2.5 px-3 py-3", !predictionsOpen && user && "opacity-35 pointer-events-none select-none")}>
          <button
            onClick={() => { if (!user) { setAuthOpen(true); return; } if (predictionsOpen) setTradeDirection("up"); }}
            disabled={!!user && !predictionsOpen}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-400 active:scale-[0.98] text-white flex items-center justify-center gap-1.5 transition-all"
          >
            <span>{upIcon}</span>
            <span>{upLabel} ({typeof upSel?.odd === "number" ? formatOdd(upSel.odd) : "–"})</span>
          </button>
          <button
            onClick={() => { if (!user) { setAuthOpen(true); return; } if (predictionsOpen) setTradeDirection("down"); }}
            disabled={!!user && !predictionsOpen}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-400 active:scale-[0.98] text-white flex items-center justify-center gap-1.5 transition-all"
          >
            <span>{downIcon}</span>
            <span>{downLabel} ({typeof downSel?.odd === "number" ? formatOdd(downSel.odd) : "–"})</span>
          </button>
        </div>

        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onLogin={(u) => { login(u); setAuthOpen(false); }}
        />
      </div>

      <TradeSheet
        isOpen={tradeDirection !== null}
        onClose={() => setTradeDirection(null)}
        direction={tradeDirection}
        upSel={upSel}
        downSel={downSel}
        marketId={marketId}
        resolvedMarketId={resolvedMarketId}
        marketTitle={marketTitle}
        marketIcon={marketIcon}
        marketImageUrl={marketImageUrl}
        onBetSuccess={onBetSuccess}
      />

      <HowItWorks
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
    </>
  );
}

// ── Live Crypto Layout ─────────────────────────────────────────────────────────
function LiveCryptoView({ market }: { market: Market }) {
  const hasValidSelections =
    Array.isArray(market.selections) &&
    market.selections.length >= 2 &&
    typeof market.selections[0]?.odd === "number" &&
    typeof market.selections[1]?.odd === "number";

  if (!hasValidSelections) {
    return (
      <div className="bg-card border border-red-500/30 rounded-xl p-4 text-red-300">
        {`Mercado inválido: seleções ou odds ausentes para ${market.slug}`}
      </div>
    );
  }

  const {
    phase, minsLeft, secsLeft, priceTobeat, currentPrice, priceDelta,
    priceHistory, newSlotLabel, roundKey, resolvedDirection, roundId,
    currentYesOdd, currentNoOdd, refreshOdds, priceRef,
  } = useLiveMarket(market.closesAt, market.live === 1, market.slug);

  const { resolveBetsForMarket, cancelBetsForMarket } = useBets();
  const lastResolvedRoundRef = useRef(-1);

  // Taxa USD→BRL para exibição dos preços; fallback conservador 5.8
  const [usdBrlRate, setUsdBrlRate] = useState(5.8);
  useEffect(() => {
    fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL")
      .then((r) => r.json())
      .then((d) => {
        const rate = parseFloat(d.USDBRL?.bid);
        if (!isNaN(rate) && rate > 4) setUsdBrlRate(rate);
      })
      .catch(() => {});
  }, []);

  const [slots, setSlots] = useState(() => buildSlots());
  useEffect(() => { setSlots(buildSlots()); }, [minsLeft]);

  useEffect(() => {
    if (resolvedDirection && roundKey !== lastResolvedRoundRef.current) {
      lastResolvedRoundRef.current = roundKey;
      if (resolvedDirection === "cancelled") {
        cancelBetsForMarket(market.id);
      } else {
        resolveBetsForMarket(market.id, resolvedDirection === "up");
      }
    }
  }, [resolvedDirection, roundKey, market.id, resolveBetsForMarket, cancelBetsForMarket]);

  const isUp = priceDelta >= 0;

  /** Preço cheio em BRL — sem abreviação. Usado em Preço Inicial e Preço Atual. */
  function fmtBrlFull(usd: number): string {
    const v = usd * usdBrlRate;
    return `R$\u00a0${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /** Delta abreviado em BRL — usado no badge de variação. */
  function fmtBrlDelta(usd: number): string {
    const v = usd * usdBrlRate;
    if (v >= 1_000) return `R$${(v / 1_000).toFixed(1)}k`;
    return `R$${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Usa odds ao vivo do round ativo; fallback para as odds do market inicial
  const upSel   = { ...market.selections[0], odd: currentYesOdd ?? market.selections[0]?.odd };
  const downSel = { ...market.selections[1], odd: currentNoOdd  ?? market.selections[1]?.odd };

  // Market com odds atualizadas para TradePanel (desktop)
  const liveMarket = {
    ...market,
    selections: market.selections.map((sel, i) => ({
      ...sel,
      odd: i === 0 ? (currentYesOdd ?? sel.odd)
         : i === 1 ? (currentNoOdd  ?? sel.odd)
         : sel.odd,
    })),
  };

  const lineColor       = isUp ? "#4ade80" : "#f87171";
  const timerColor      = phase === "live" ? "text-red-500" : "text-text-tint";
  const timerSep        = phase === "live" ? "text-red-500/50" : "text-text-tint/30";
  const isTransitioning = phase === "transitioning";

  // Blur + opacity on both content cards during transition
  const blurAnim = {
    animate: {
      opacity: isTransitioning ? 0.25 : 1,
      scale:   isTransitioning ? 0.99 : 1,
    },
    transition: { duration: 0.4, ease: "easeInOut" as const },
    style: { pointerEvents: isTransitioning ? "none" as const : "auto" as const },
  };

  // Slide-up entry for content inside each card on new round
  const contentEntry = {
    initial:    { opacity: 0, y: 10 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">

      {/* ── LEFT COLUMN ── */}
      <div className="flex-1 min-w-0 pb-36 lg:pb-0 flex flex-col gap-3">

        {/* ── New round badge (appears after transition) ── */}
        <AnimatePresence>
          {newSlotLabel && (
            <motion.div
              key={`badge-${newSlotLabel}`}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10"
            >
              <svg className="w-3 h-3 text-green-400 shrink-0" viewBox="0 0 12 12" fill="none">
                <path d="M2 6.5l2.5 2.5 5.5-5.5" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-semibold text-green-400">
                Rodada {newSlotLabel} iniciada
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BLOCO 1: header + timer ── */}
        <motion.div {...blurAnim} className="bg-card border border-white/[0.06] rounded-xl overflow-hidden">
          <motion.div key={roundKey} {...contentEntry} className="p-4 space-y-3">

            <div>
              {(phase === "live" || phase === "transitioning") && <LiveBadge />}
              {phase === "pre" && (
                <span className="text-[10px] font-semibold text-text-tint uppercase tracking-wider">Pré-mercado</span>
              )}
              {phase === "closed" && (
                <span className="text-[10px] font-semibold text-text-tint/50 uppercase tracking-wider">Encerrado</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {market.imageUrl ? (
                <Image src={market.imageUrl} alt={market.title} width={48} height={48}
                  className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl object-cover shrink-0" />
              ) : market.icon ? (
                <span className="text-2xl lg:text-3xl shrink-0 leading-none">{market.icon}</span>
              ) : null}
              <h1 className="flex-1 text-sm lg:text-xl font-bold text-white leading-snug line-clamp-2 min-w-0">
                {market.title}
              </h1>
              <div className="shrink-0 flex items-start gap-0.5">
                <div className="text-center">
                  <span suppressHydrationWarning className={clsx("block text-lg lg:text-3xl font-bold tabular-nums leading-none", timerColor)}>
                    {isTransitioning ? "--" : String(minsLeft).padStart(2, "0")}
                  </span>
                  <span className="block text-[8px] text-text-tint/50 uppercase tracking-widest mt-0.5">MINS</span>
                </div>
                <span className={clsx("text-base lg:text-2xl font-bold leading-none mt-0.5", timerSep)}>:</span>
                <div className="text-center">
                  <span suppressHydrationWarning className={clsx("block text-lg lg:text-3xl font-bold tabular-nums leading-none", timerColor)}>
                    {isTransitioning ? "--" : String(secsLeft).padStart(2, "0")}
                  </span>
                  <span className="block text-[8px] text-text-tint/50 uppercase tracking-widest mt-0.5">SECS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <span className="text-[11px] text-text-tint font-medium shrink-0">Últimos</span>
              {RECENT_RESULTS.map((won, i) => (
                <span key={i} className={clsx(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  won ? "bg-green-500 text-white" : "bg-red-500 text-white"
                )}>
                  {won ? "▲" : "▼"}
                </span>
              ))}
            </div>

          </motion.div>
        </motion.div>

        {/* ── BLOCO 2: preços + gráfico + time slots ── */}
        <motion.div {...blurAnim} className="relative bg-card border border-white/[0.06] rounded-xl overflow-hidden">

          {/* ── Transition overlay — sobreposto, sem empurrar layout ── */}
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                key="transition-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#0b0d12]/90 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-5 px-8">

                  {/* Spinner ring */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="19" fill="none"
                        stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                    </svg>
                    <motion.svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 48 48"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                    >
                      <circle cx="24" cy="24" r="19" fill="none"
                        stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"
                        strokeLinecap="round" strokeDasharray="42 78" />
                    </motion.svg>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  </div>

                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-semibold text-white/90 tracking-tight">
                      Iniciando próxima rodada
                    </p>
                    <p className="text-xs text-text-tint/55">
                      Carregando dados do novo mercado...
                    </p>
                  </div>

                  <div className="w-40 h-px bg-white/[0.07] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white/25 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "linear" }}
                    />
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="p-4">

            {/* Prices — re-enter on new round */}
            <motion.div
              key={`prices-${roundKey}`}
              {...contentEntry}
              className="flex items-start justify-between mb-3"
            >
              <div>
                <p className="text-[9px] font-semibold text-text-tint/70 uppercase tracking-wider mb-1">Preço Inicial</p>
                <p suppressHydrationWarning className="text-base font-bold text-white tabular-nums">
                  {fmtBrlFull(priceTobeat)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-text-tint/70 uppercase tracking-wider mb-1">Preço Atual</p>
                <div className="flex items-center justify-end gap-1.5">
                  <p suppressHydrationWarning className={clsx("text-base font-bold tabular-nums", isUp ? "text-green-400" : "text-red-400")}>
                    {fmtBrlFull(currentPrice)}
                  </p>
                  <span suppressHydrationWarning className={clsx(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    isUp ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                  )}>
                    {isUp ? "▲" : "▼"} {fmtBrlDelta(Math.abs(priceDelta))}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Chart */}
            <motion.div
              key={`chart-${roundKey}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <LiveChart history={priceHistory} priceTobeat={priceTobeat} lineColor={lineColor} usdRate={usdBrlRate} livePriceRef={priceRef} />
            </motion.div>

            {/* Time slots — active chip bounces + glows on new round */}
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2 overflow-x-auto no-scrollbar">
              {slots.map((slot) => {
                const isNewActive = slot.isActive && newSlotLabel === slot.label;
                return (
                  <motion.button
                    key={slot.label}
                    layout
                    suppressHydrationWarning
                    animate={isNewActive
                      ? { scale: [1, 1.13, 1], transition: { duration: 0.5, ease: "easeOut" } }
                      : {}}
                    className={clsx(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors",
                      slot.isActive
                        ? "bg-white text-gray-900 shadow-[0_0_14px_rgba(255,255,255,0.22)]"
                        : slot.isPast
                        ? "text-text-tint/50 border border-white/[0.06]"
                        : "text-text-tint border border-white/[0.08] hover:border-white/20 hover:text-white"
                    )}
                  >
                    {/* Ripple ring on newly-active chip */}
                    {isNewActive && (
                      <motion.span
                        className="absolute inset-0 rounded-full border border-white/50"
                        initial={{ opacity: 0.7, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                      />
                    )}
                    {slot.isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                    <span suppressHydrationWarning>{slot.label}</span>
                  </motion.button>
                );
              })}
              <button className="px-3 py-1.5 rounded-full text-xs font-medium text-text-tint border border-white/[0.08] hover:border-white/20 hover:text-white transition-all shrink-0">
                Mais →
              </button>
            </div>

          </div>
        </motion.div>

        {/* ── BLOCO 3: Regras do Mercado ── */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-4 text-sm">
          <h2 className="text-base font-bold text-white">Regras do Mercado</h2>
          <div className="space-y-1 text-text-tint leading-relaxed">
            <p>· Este mercado roda recorrentemente a cada 5 minutos (horário de Brasília).</p>
            <p>· Este mercado funciona das 09:00h às 00:00h (horário de Brasília).</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-white/80">Como resolve</p>
            <ol className="space-y-1 text-text-tint leading-relaxed list-none">
              <li>1. No início de cada rodada, o sistema registra o Preço de Início do BTC.</li>
              <li>2. No fim da rodada (5 min depois), o sistema registra o Preço de Fechamento.</li>
              <li>3. O resultado é definido comparando os dois preços:</li>
            </ol>
            <div className="pl-3 space-y-1 text-text-tint leading-relaxed border-l border-white/[0.08]">
              <p>· <span className="text-green-400 font-medium">Sobe</span> vence se Fechamento &gt; Início</p>
              <p>· <span className="text-red-400 font-medium">Desce</span> vence se Fechamento &lt; Início</p>
              <p>· Se Fechamento = Início, a rodada é anulada e há reembolso.</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-white/80">Fonte de preço</p>
            <p className="text-text-tint leading-relaxed">
              · O preço exibido e usado para resolver é obtido a partir das fontes de referência:{" "}
              <span className="text-white/70">Binance</span> e <span className="text-white/70">CoinMarketCap</span>.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-white/80">Falhas e reembolso</p>
            <p className="text-text-tint leading-relaxed">
              · Se houver indisponibilidade das fontes ou erro sistêmico, a rodada é anulada e todos recebem reembolso.
            </p>
          </div>
        </div>

      </div>

      {/* ── RIGHT COLUMN (desktop) ── */}
      <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-20">
          <TradePanel market={liveMarket} resolvedMarketId={roundId ?? undefined} predictionsOpen={roundId !== null} onBetSuccess={refreshOdds} />
        </div>
      </div>

      <StickyActionBar
        upSel={upSel}
        downSel={downSel}
        marketId={market.id}
        resolvedMarketId={roundId ?? undefined}
        marketTitle={market.title}
        marketIcon={market.icon}
        marketImageUrl={market.imageUrl}
        predictionsOpen={roundId !== null}
        onBetSuccess={refreshOdds}
      />
    </div>
  );
}

// ── Live Count (Rodovia) Layout ────────────────────────────────────────────────
function LiveCountView({ market }: { market: Market }) {
  const { phase, minsLeft, secsLeft, newSlotLabel, roundKey, resolvedDirection } = useLiveMarket(market.closesAt, market.live === 1, market.id);

  const { resolveBetsForMarket, cancelBetsForMarket } = useBets();
  const lastResolvedRoundRef = useRef(-1);

  const [slots, setSlots] = useState(() => buildSlots());
  useEffect(() => { setSlots(buildSlots()); }, [minsLeft]);

  // Estado para o round ativo da Rodovia
  const [rodoviaRound, setRodoviaRound] = useState<ActiveRodoviaRound | null>(null);
  const [carCount, setCarCount] = useState(0);
  const carCountRef = useRef(0);
  const [threshold, setThreshold] = useState(145);
  const [predOpen, setPredOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const prevRoundKeyRef = useRef(-1);

  // Zera o contador imediatamente quando o relógio do cliente detecta virada de round.
  // Sem isso, o carCount do round anterior fica visível até o próximo poll (até 5s).
  useEffect(() => {
    if (prevRoundKeyRef.current !== -1 && roundKey > prevRoundKeyRef.current) {
      setCarCount(0);
      carCountRef.current = 0;
    }
    prevRoundKeyRef.current = roundKey;
  }, [roundKey]);

  // Polling para buscar o round ativo da Rodovia
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    async function fetchRodoviaData() {
      try {
        const data = await fetchActiveRodoviaRound();
        if (!isMounted) return;
        
        if (data) {
          setRodoviaRound(data);
          setCarCount(data.currentCount);
          carCountRef.current = data.currentCount;
          setThreshold(data.threshold);
          setPredOpen(data.predictionsOpen);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    // Busca inicial
    fetchRodoviaData();

    // Polling a cada 5 segundos
    intervalId = setInterval(fetchRodoviaData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Resolve bets when the round ends — upSel (selections[0]) = "Mais de X"
  useEffect(() => {
    if (resolvedDirection && roundKey !== lastResolvedRoundRef.current) {
      lastResolvedRoundRef.current = roundKey;
      if (resolvedDirection === "cancelled") {
        cancelBetsForMarket(market.id);
      } else {
        // Usa o threshold real do backend
        resolveBetsForMarket(market.id, carCountRef.current > threshold);
      }
    }
  }, [resolvedDirection, roundKey, market.id, resolveBetsForMarket, cancelBetsForMarket, threshold]);

  const upSel = market.selections[0];
  const downSel = market.selections[1];
  const timerColor = phase === "live" ? "text-red-500" : "text-text-tint";
  const timerSep = phase === "live" ? "text-red-500/50" : "text-text-tint/30";
  const isTransitioning = phase === "transitioning";

  // Calcula o tempo restante para encerrar as previsões
  const totalSecs = minsLeft * 60 + secsLeft;
  const PRED_CLOSE_SECS = 150; // 2m30s remaining = predictions close
  const predSecsLeft = predOpen ? totalSecs - PRED_CLOSE_SECS : 0;
  const predMins = Math.floor(predSecsLeft / 60);
  const predSecs = predSecsLeft % 60;

  const blurAnim = {
    animate: { opacity: isTransitioning ? 0.25 : 1, scale: isTransitioning ? 0.99 : 1 },
    transition: { duration: 0.4, ease: "easeInOut" as const },
    style: { pointerEvents: isTransitioning ? "none" as const : "auto" as const },
  };

  // Formata os labels com o threshold real
  const upLabel = `Mais de ${threshold}`;
  const downLabel = `Até ${threshold}`;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* ── LEFT COLUMN ── */}
      <div className="flex-1 min-w-0 pb-36 lg:pb-0 flex flex-col gap-3">

        {/* ── New round badge ── */}
        <AnimatePresence>
          {newSlotLabel && (
            <motion.div
              key={`rodovia-badge-${newSlotLabel}`}
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10"
            >
              <svg className="w-3 h-3 text-green-400" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-semibold text-green-400">Rodada {newSlotLabel} iniciada</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BLOCO 1 + BLOCO 2 wrapped so the transition overlay sits on top of both */}
        <div className="relative flex flex-col gap-3">

          {/* ── Transition overlay — absolute, covers both cards ── */}
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                key="rodovia-transition-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#0d0f14]/90 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-4 px-8">
                  <div className="relative w-11 h-11 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                    </svg>
                    <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 44 44"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    >
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.45)"
                        strokeWidth="2.5" strokeLinecap="round" strokeDasharray="38 75" />
                    </motion.svg>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-white/90 tracking-tight">Iniciando próxima rodada</p>
                    <p className="text-xs text-text-tint/60">Carregando dados do novo mercado...</p>
                  </div>
                  <div className="w-40 h-px bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div className="h-full bg-white/30 rounded-full"
                      initial={{ width: "0%" }} animate={{ width: "100%" }}
                      transition={{ duration: 3, ease: "linear" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* BLOCO 1: badge + título + timer + últimos */}
        <motion.div {...blurAnim} className="bg-card border border-white/[0.06] rounded-xl overflow-hidden">
          <motion.div
            key={roundKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 space-y-3"
          >
            <div>
              {(phase === "live" || phase === "transitioning") && <LiveBadge />}
              {phase === "pre" && (
                <span className="text-[10px] font-semibold text-text-tint uppercase tracking-wider">Pré-mercado</span>
              )}
              {phase === "closed" && (
                <span className="text-[10px] font-semibold text-text-tint/50 uppercase tracking-wider">Encerrado</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {market.imageUrl ? (
                <Image src={market.imageUrl} alt={market.title} width={48} height={48}
                  className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl object-cover shrink-0" />
              ) : market.icon ? (
                <span className="text-2xl lg:text-3xl shrink-0 leading-none">{market.icon}</span>
              ) : null}
              <h1 className="flex-1 text-sm lg:text-xl font-bold text-white leading-snug line-clamp-2 min-w-0">
                {market.title}
              </h1>
              <div className="shrink-0 flex items-start gap-0.5">
                <div className="text-center">
                  <span suppressHydrationWarning className={clsx("block text-lg lg:text-3xl font-bold tabular-nums leading-none", timerColor)}>
                    {String(minsLeft).padStart(2, "0")}
                  </span>
                  <span className="block text-[8px] text-text-tint/50 uppercase tracking-widest mt-0.5">MINS</span>
                </div>
                <span className={clsx("text-base lg:text-2xl font-bold leading-none mt-0.5", timerSep)}>:</span>
                <div className="text-center">
                  <span suppressHydrationWarning className={clsx("block text-lg lg:text-3xl font-bold tabular-nums leading-none", timerColor)}>
                    {String(secsLeft).padStart(2, "0")}
                  </span>
                  <span className="block text-[8px] text-text-tint/50 uppercase tracking-widest mt-0.5">SECS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <span className="text-[11px] text-text-tint font-medium shrink-0">Últimos</span>
              {RODOVIA_RECENT_RESULTS.map((maisDe, i) => (
                <span key={i} className={clsx(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  maisDe ? "bg-green-500 text-white" : "bg-red-500 text-white"
                )}>
                  {maisDe ? "+" : "–"}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* BLOCO 2: transmissão + contagem */}
        <motion.div {...blurAnim} className="bg-card border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-4 space-y-3">
            {/* Contagem atual + previsões encerram em */}
            <motion.div
              key={`rodovia-stats-${roundKey}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start justify-between"
            >
              <div>
                <p className="text-[9px] font-semibold text-text-tint/70 uppercase tracking-wider mb-1">
                  Contagem Atual
                </p>
                <p className="text-base font-bold text-white tabular-nums">{carCount} carros</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-text-tint/70 uppercase tracking-wider mb-1">
                  Previsões Encerram Em
                </p>
                {predOpen ? (
                  <p suppressHydrationWarning className="text-base font-bold text-amber-400 tabular-nums">
                    {String(predMins).padStart(2, "0")}:{String(predSecs).padStart(2, "0")}
                  </p>
                ) : (
                  <p className="text-base font-bold text-red-400/80 tabular-nums">Encerradas</p>
                )}
              </div>
            </motion.div>

            {/* Câmera ao vivo — montada uma vez, não desmonta na troca de rodada */}
            <HlsPlayer
              src="https://34.104.32.249.nip.io/SP123-KM046/stream.m3u8"
              carCount={carCount}
              lineStart={[0.0, 0.5]}
              lineEnd={[1.0, 0.5]}
            />

            {/* Time slots */}
            <div className="pt-1 border-t border-white/[0.04] flex items-center gap-2 overflow-x-auto no-scrollbar">
              {slots.map((slot) => {
                const isNewActive = newSlotLabel === slot.label && slot.isActive;
                return (
                  <motion.button
                    key={slot.label}
                    layout
                    suppressHydrationWarning
                    animate={isNewActive
                      ? { scale: [1, 1.13, 1], transition: { duration: 0.5, ease: "easeOut" } }
                      : {}}
                    className={clsx(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors",
                      slot.isActive
                        ? "bg-white text-gray-900 shadow-[0_0_14px_rgba(255,255,255,0.22)]"
                        : slot.isPast
                        ? "text-text-tint/50 border border-white/[0.06]"
                        : "text-text-tint border border-white/[0.08] hover:border-white/20 hover:text-white"
                    )}
                  >
                    {isNewActive && (
                      <motion.span
                        className="absolute inset-0 rounded-full border border-white/50"
                        initial={{ opacity: 0.7, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                      />
                    )}
                    {slot.isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                    <span suppressHydrationWarning>{slot.label}</span>
                  </motion.button>
                );
              })}
              <button className="px-3 py-1.5 rounded-full text-xs font-medium text-text-tint border border-white/[0.08] hover:border-white/20 hover:text-white transition-all shrink-0">
                Mais →
              </button>
            </div>
          </div>
        </motion.div>
        </div>{/* end relative wrapper */}

        {/* BLOCO 3: Regras */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-4 text-sm">
          <h2 className="text-base font-bold text-white">Regras do Mercado</h2>

          <div className="space-y-1 text-text-tint leading-relaxed">
            <p>· Rodovia Arão Sahm, KM 95 — Bragança Paulista (SP).</p>
            <p>· Este mercado roda recorrentemente a cada 5 minutos (horário de Brasília).</p>
            <p>· Este mercado funciona das 09:00h às 23:30h (horário de Brasília), todos os dias da semana.</p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-white/80">Como funciona</p>
            <ol className="space-y-1 text-text-tint leading-relaxed list-none">
              <li>1. Ao iniciar cada rodada, uma transmissão ao vivo da rodovia fica disponível na tela com a contagem automática.</li>
              <li>2. Você pode fazer previsões apenas nos primeiros 2 minutos e 30 segundos da rodada.</li>
              <li>3. Após os 2 minutos e 30 segundos iniciais, o mercado entra em modo de observação por mais 2 minutos e 30 segundos (sem novas previsões).</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-white/80">Como resolve</p>
            <ol className="space-y-1 text-text-tint leading-relaxed list-none">
              <li>1. O sistema conta automaticamente os veículos detectados durante a rodada usando IA (Machine Learning) com o modelo YOLO.</li>
              <li>2. A rodada termina ao completar 5 minutos.</li>
              <li>3. O resultado é definido pela contagem registrada ao fim da rodada:</li>
            </ol>
            <div className="pl-3 space-y-1 text-text-tint leading-relaxed border-l border-white/[0.08]">
              <p>· <span className="text-green-400 font-medium">"Mais de 145"</span> vence se a contagem for ≥ 146</p>
              <p>· <span className="text-red-400 font-medium">"Até 145"</span> vence se a contagem for ≤ 145</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">O que é contado</p>
            <div className="space-y-1 text-text-tint leading-relaxed">
              <p>· Veículos válidos: carro, caminhão, caminhonete, ônibus e similares.</p>
              <p>· Motocicletas NÃO entram na contagem (são ignoradas).</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Importante sobre a contagem (IA)</p>
            <div className="space-y-1 text-text-tint leading-relaxed">
              <p>· Este mercado NÃO mede exatamente quantos veículos reais passaram na rodovia.</p>
              <p>· Ele mede quantos veículos a IA conseguiu detectar e contar na transmissão.</p>
              <p>· Por ser um sistema automatizado, podem ocorrer erros de detecção/contagem (ex.: oclusão, chuva/noite, ângulos, qualidade do vídeo, tráfego intenso, etc.).</p>
              <p>· Ao participar, você concorda que a contagem exibida pelo sistema é a referência oficial da rodada e que não nos responsabilizamos por eventuais falhas de contagem.</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Falhas e reembolso</p>
            <p className="text-text-tint leading-relaxed">
              · Se a transmissão ficar indisponível, a contagem automática falhar, ou ocorrer erro sistêmico que impeça a apuração confiável, a rodada é anulada e todos recebem reembolso.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN (desktop) ── */}
      <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-20">
          <TradePanel market={market} resolvedMarketId={rodoviaRound?.roundId} predictionsOpen={predOpen} />
        </div>
      </div>

      {/* ── STICKY BOTTOM BAR (mobile) ── */}
      <StickyActionBar
        upSel={upSel}
        downSel={downSel}
        marketId={market.id}
        resolvedMarketId={rodoviaRound?.roundId}
        marketTitle={market.title}
        marketIcon={market.icon}
        upLabel={`Mais de ${threshold}`}
        downLabel={`Até ${threshold}`}
        upIcon="▲"
        downIcon="▼"
        predictionsOpen={predOpen}
      />
    </div>
  );
}

function chanceColor(p: number) {
  if (p < 25) return "#e23838";
  if (p < 65) return "#f59e0b";
  return "#02BC17";
}

// ── Semicircle gauge (left → right, text inside arc) ──────────────────────────
function ChanceArc({ percent }: { percent: number }) {
  const color = chanceColor(percent);
  // cx=32, cy=32, r=28 → arc from (4,32) through (32,4) to (60,32)
  // ViewBox height=32 clips the lower half, text lives inside the upper arc
  const cx = 32, cy = 32, r = 28;
  const circ = 2 * Math.PI * r;
  const halfCirc = Math.PI * r;
  const filled = (percent / 100) * halfCirc;
  return (
    <div className="shrink-0" style={{ width: 64, height: 38 }}>
      <svg width="64" height="34" viewBox="0 0 64 34" style={{ display: "block" }}>
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${halfCirc} ${circ - halfCirc}`}
          style={{ transform: `rotate(180deg)`, transformOrigin: `${cx}px ${cy}px` }}
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          style={{ transform: `rotate(180deg)`, transformOrigin: `${cx}px ${cy}px` }}
        />
        <text x={cx} y={cy - r * 0.32} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="12" fontWeight="bold" fontFamily="inherit">
          {percent}%
        </text>
        <text x={cx} y={cy - r * 0.04} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.35)" fontSize="7.5" fontFamily="inherit">
          chance
        </text>
      </svg>
    </div>
  );
}

// ── Stories Range (Carlinhos) Layout ───────────────────────────────────────────
function StoriesRangeView({ market }: { market: Market }) {
  const [tradeRange, setTradeRange] = useState<{ sel: Selection; dir: "up" | "down" } | null>(null);
  const firstSel = market.selections[0];
  const [panelSelection, setPanelSelection] = useState<{ sel: Selection; dir: "sim" | "nao" } | null>(null);

  // Predictions close 1h30m before market close
  const predCutoffMs = new Date(market.closesAt).getTime() - 90 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, done: false });
  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, predCutoffMs - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
        done: diff === 0,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [predCutoffMs]);

  const predOpen = !timeLeft.done;

  const pad2 = (n: number) => String(n).padStart(2, "0");

  // Build virtual up/down sels for TradeSheet
  const virtualUpSel = tradeRange
    ? { ...tradeRange.sel, label: "Sim" }
    : undefined;
  const virtualDownSel = tradeRange
    ? { ...tradeRange.sel, id: `${tradeRange.sel.id}-nao`, label: "Não", odd: tradeRange.sel.oddNao ?? 1.0, color: "#e23838" }
    : undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0 space-y-3 pb-10 lg:pb-0">

        {/* BLOCO 1: cabeçalho + countdown */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            {market.imageUrl ? (
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-lg overflow-hidden shrink-0">
                <Image src={market.imageUrl} alt={market.title} width={56} height={56} className="w-full h-full object-cover" />
              </div>
            ) : market.icon ? (
              <span className="text-2xl lg:text-3xl shrink-0 leading-none">{market.icon}</span>
            ) : null}
            <h1 className="flex-1 text-sm lg:text-xl font-bold text-white leading-snug min-w-0">
              {market.title}
            </h1>
          </div>

          {/* Countdown to 19h */}
          <div className="flex flex-col items-center gap-1 py-2 border border-white/[0.06] rounded-xl bg-gray-dark/40">
            <span className="text-[9px] font-semibold text-text-tint/60 uppercase tracking-widest">
              Previsões encerram em
            </span>
            <span suppressHydrationWarning className="text-xl font-bold text-red-400 tabular-nums tracking-wider">
              {timeLeft.done ? "ENCERRADO" : `${pad2(timeLeft.h)}:${pad2(timeLeft.m)}:${pad2(timeLeft.s)}`}
            </span>
          </div>
        </div>

        {/* BLOCO 2: gráfico multi-linha */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4">
          <StoriesMultiChart
            selections={market.selections.map((s) => ({
              label: s.label,
              percent: s.percent,
              color: s.color ?? "#888",
            }))}
          />
        </div>

        {/* BLOCO 3+: cards por faixa */}
        {market.selections.map((sel) => {
          const simActive = panelSelection?.sel.id === sel.id && panelSelection.dir === "sim";
          const naoActive = panelSelection?.sel.id === sel.id && panelSelection.dir === "nao";
          return (
            <div key={sel.id} className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {market.imageUrl && (
                  <Image src={market.imageUrl} alt="" width={48} height={48}
                    className="w-12 h-12 rounded-xl object-cover shrink-0" />
                )}
                <span className="flex-1 text-sm font-semibold text-white">{sel.label}</span>
                <ChanceArc percent={sel.percent} />
              </div>
              <div className={clsx("grid grid-cols-2 gap-2", !predOpen && "opacity-35 pointer-events-none select-none")}>
                <button
                  onClick={() => { if (!predOpen) return; setTradeRange({ sel, dir: "up" }); setPanelSelection({ sel, dir: "sim" }); }}
                  disabled={!predOpen}
                  className={clsx(
                    "py-3 rounded-xl text-sm font-bold border transition-all active:scale-[0.98]",
                    simActive
                      ? "bg-primary border-primary text-white"
                      : "bg-primary/10 border-primary/40 text-primary/80 hover:bg-primary/20"
                  )}
                >
                  Sim ({formatOdd(sel.odd)})
                </button>
                <button
                  onClick={() => { if (!predOpen) return; setTradeRange({ sel, dir: "down" }); setPanelSelection({ sel, dir: "nao" }); }}
                  disabled={!predOpen}
                  className={clsx(
                    "py-3 rounded-xl text-sm font-bold border transition-all active:scale-[0.98]",
                    naoActive
                      ? "bg-red-500 border-red-500 text-white"
                      : "bg-red-500/10 border-red-500/40 text-red-400/80 hover:bg-red-500/20"
                  )}
                >
                  Não ({formatOdd(sel.oddNao ?? 1.0)})
                </button>
              </div>
            </div>
          );
        })}

        {/* Regras */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-4 text-sm">
          <h2 className="text-base font-bold text-white">Regras do Mercado</h2>

          <p className="text-text-tint leading-relaxed">
            Este mercado prevê quantos stories estarão ativos (visíveis) no perfil da Carlinhos no momento exato das 19h (BRT – horário de Brasília).
          </p>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">O que conta</p>
            <p className="text-text-tint leading-relaxed">
              · O total de stories ativos no perfil às 19h. Não importa se o story foi postado no dia anterior ou hoje: se ainda estiver ativo às 19h, entra na contagem. Não zera à meia-noite.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Como o mercado resolve</p>
            <p className="text-text-tint leading-relaxed">
              · Às 19:00:00 (BRT), o mercado resolve pela faixa correspondente ao total ativo naquele instante:
            </p>
            <div className="pl-3 space-y-0.5 border-l border-white/[0.08] text-text-tint">
              <p>· Até 20</p>
              <p>· 21 a 60</p>
              <p>· 61 a 99</p>
              <p>· Mais de 99</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Anulação</p>
            <p className="text-text-tint leading-relaxed">
              · Se às 19:00:00 (BRT) o Instagram estiver fora do ar ou o perfil estiver indisponível, o mercado será ANULADO automaticamente por impossibilidade de verificação da fonte. Nesse caso, todos os valores serão devolvidos aos participantes (reembolso integral).
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Fonte</p>
            <p className="text-text-tint">· instagram.com/carlinhos</p>
          </div>
        </div>

      </div>

      {/* Desktop right panel */}
      <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-20">
          <TradePanel market={market} controlledSelection={panelSelection} predictionsOpen={predOpen} />
        </div>
      </div>

      {/* TradeSheet — mobile only */}
      <div className="lg:hidden">
        <TradeSheet
          isOpen={tradeRange !== null}
          onClose={() => { setTradeRange(null); setPanelSelection(null); }}
          direction={tradeRange?.dir ?? null}
          upSel={virtualUpSel}
          downSel={virtualDownSel}
          marketId={market.id}
          marketTitle={`${market.title} — ${tradeRange?.sel.label ?? ""}`}
          marketIcon={market.icon}
          marketImageUrl={market.imageUrl}
        />
      </div>
    </div>
  );
}

// ── Climate Daily Layout ────────────────────────────────────────────────────────
function ClimateView({ market }: { market: Market }) {
  const { timeLeft, isExpired } = useTimer(market.closesAt);
  const marketOpen = !isExpired;

  useMarketResolution(market);

  const simSel = market.selections[0];
  const naoSel = market.selections[1];

  // HH:MM:SS countdown for same-day markets
  const h = Math.floor(timeLeft / 3_600_000);
  const m = Math.floor((timeLeft % 3_600_000) / 60_000);
  const s = Math.floor((timeLeft % 60_000) / 1_000);
  const countdown = isExpired
    ? "Encerrado"
    : h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0 space-y-3 pb-36 lg:pb-0">

        {/* ── BLOCO 1: ícone + título + countdown ── */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            {market.imageUrl ? (
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={market.imageUrl}
                  alt={market.title}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : market.icon ? (
              <span className="text-2xl lg:text-3xl shrink-0 leading-none">{market.icon}</span>
            ) : null}
            <h1 className="flex-1 text-sm lg:text-xl font-bold text-white leading-snug min-w-0">
              {market.title}
            </h1>
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center gap-1 py-2 border border-white/[0.06] rounded-xl bg-gray-dark/40">
            <span className="text-[9px] font-semibold text-text-tint/60 uppercase tracking-widest">
              Previsões encerram em
            </span>
            <span suppressHydrationWarning className="text-xl font-bold text-red-400 tabular-nums tracking-wider">
              {isExpired ? "ENCERRADO" : countdown}
            </span>
          </div>
        </div>

        {/* ── BLOCO 2: gráfico de % ── */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4">
          <PercentChart simPercent={simSel.percent} naoPercent={naoSel.percent} />
        </div>

        {/* ── BLOCO 3: Regras do Mercado ── */}
        {market.rules && market.rules.length > 0 && (
          <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-4 text-sm">
            <h2 className="text-base font-bold text-white">Regras do Mercado</h2>
            {market.rules.map((rule, i) => (
              <p key={i} className="text-text-tint leading-relaxed">{rule}</p>
            ))}
          </div>
        )}

      </div>

      {/* Desktop right panel */}
      <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-20">
          <TradePanel market={market} predictionsOpen={marketOpen} />
        </div>
      </div>

      {/* Mobile sticky bar */}
      <StickyActionBar
        upSel={simSel}
        downSel={naoSel}
        marketId={market.id}
        marketTitle={market.title}
        marketIcon={market.icon}
        marketImageUrl={market.imageUrl}
        upLabel="Sim"
        downLabel="Não"
        upIcon="✓"
        downIcon="✗"
        predictionsOpen={marketOpen}
      />
    </div>
  );
}

// ── Standard Market Layout ─────────────────────────────────────────────────────
function StandardView({ market }: { market: Market | GroupedMarket }) {
  const grouped = isGrouped(market);
  const categoryColorClass = getCategoryColor(market.category);
  const marketOpen = new Date(market.closesAt) > new Date();

  // Wire lifecycle resolution for non-live markets
  useMarketResolution(market as Market);

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            {market.icon && <span className="text-4xl shrink-0">{market.icon}</span>}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider", categoryColorClass)}>
                  {market.category}
                </span>
                {market.live === 1 ? (
                  <LiveBadge />
                ) : (
                  <span className="text-xs text-text-tint" suppressHydrationWarning>{formatWindow()}</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white leading-snug">{market.title}</h1>
              <p className="text-sm text-text-tint mt-2 leading-relaxed">{market.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04] text-xs text-text-tint">
            <span>{formatVolume(market.volume)} vol.</span>
            <span>•</span>
            <span>{market.matchingSystem === "binary" ? "Binário" : market.matchingSystem === "multiple" ? "Múltiplo" : "Range"}</span>
          </div>
        </div>

        {/* Selections */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">
            {grouped ? "Grupos" : "Opções de previsão"}
          </h2>
          {grouped ? (
            <div className="space-y-3">
              {market.groups.map((group) => (
                <div key={group.id} className="bg-gray-dark rounded-xl p-4 border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {group.icon && <span>{group.icon}</span>}
                      <span className="text-sm font-semibold text-white">{group.title}</span>
                    </div>
                    <span className="text-xs text-text-tint">{formatVolume(group.volume)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.selections.map((sel, i) => (
                      <OddsDisplay key={sel.id} selection={sel} index={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {market.selections.map((sel, i) => (
                <OddsDisplay key={sel.id} selection={sel} index={i} />
              ))}
            </div>
          )}

          {/* Probability bar for binary */}
          {!grouped && market.selections.length === 2 && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-primary font-medium">
                  {market.selections[0].label} — {formatPercent(market.selections[0].percent)}
                </span>
                <span className="text-red-400 font-medium">
                  {market.selections[1].label} — {formatPercent(market.selections[1].percent)}
                </span>
              </div>
              <div className="h-2 bg-gray-dark rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-primary rounded-l-full transition-all"
                  style={{ width: `${market.selections[0].percent}%` }}
                />
                <div className="h-full bg-red-500 flex-1 rounded-r-full" />
              </div>
            </div>
          )}
        </div>

        {/* Mobile trade buttons */}
        <div className="lg:hidden">
          <TradePanel market={market} predictionsOpen={marketOpen} />
        </div>
      </div>

      <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-20">
          <TradePanel market={market} predictionsOpen={marketOpen} />
        </div>
      </div>
    </div>
  );
}

// ── Sports Binary Poll Layout ──────────────────────────────────────────────────
function SportsBinaryView({ market }: { market: Market }) {
  const simSel = market.selections[0];
  const naoSel = market.selections[1];
  const marketOpen = new Date(market.closesAt) > new Date();
  const daysLeft = Math.max(0, Math.ceil((new Date(market.closesAt).getTime() - Date.now()) / 86_400_000));
  const daysLabel = daysLeft === 1 ? "DIA" : "DIAS";

  useMarketResolution(market);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0 space-y-3 pb-36 lg:pb-0">

        {/* ── BLOCO 1: ícone + título + prazo + distribuição ── */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            {market.imageUrl ? (
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={market.imageUrl}
                  alt={market.title}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : market.icon ? (
              <span className="text-2xl lg:text-3xl shrink-0 leading-none">{market.icon}</span>
            ) : null}
            <h1 className="flex-1 text-sm lg:text-xl font-bold text-white leading-snug min-w-0">
              {market.title}
            </h1>
            <div className="shrink-0 text-center ml-2">
              <span className="block text-lg lg:text-3xl font-bold text-text-tint tabular-nums leading-none">
                {daysLeft}
              </span>
              <span className="block text-[8px] text-text-tint/50 uppercase tracking-widest mt-0.5">
                {daysLabel}
              </span>
            </div>
          </div>

        </div>

        {/* ── BLOCO 2: gráfico de % ── */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4">
          <PercentChart simPercent={simSel.percent} naoPercent={naoSel.percent} />
        </div>

        {/* ── BLOCO 3: Regras do Mercado ── */}
        <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-4 text-sm">
          <h2 className="text-base font-bold text-white">Regras do Mercado</h2>

          <p className="text-text-tint leading-relaxed">
            Este mercado prevê se Neymar Jr. aparecerá na lista final de convocados oficial
            divulgada pela CBF até dia 09/06/2026.
          </p>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Fonte oficial</p>
            <p className="text-text-tint leading-relaxed">
              · www.cbf.com.br/selecao-brasileira/noticias
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-white/80">Como resolve</p>
            <div className="space-y-1 text-text-tint leading-relaxed">
              <p>
                · <span className="text-green-400 font-medium">SIM</span> — Neymar Jr. constar
                explicitamente na lista oficial publicada pela CBF até 09/06/2026.
              </p>
              <p>
                · <span className="text-red-400 font-medium">NÃO</span> — Neymar Jr. não constar
                na lista oficial publicada pela CBF até 09/06/2026.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">O que conta / não conta</p>
            <div className="space-y-1 text-text-tint leading-relaxed pl-3 border-l border-white/[0.08]">
              <p>· Conta exclusivamente a publicação oficial da CBF referente à lista que será publicada até 09/06/2026 (texto/arte/lista de nomes no comunicado oficial).</p>
              <p>· Não contam: rumores, imprensa, vazamentos, posts de terceiros, "pré-listas" não publicadas pela CBF, ou atualizações posteriores (segunda lista, cortes, substituições, lista final etc.).</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Horário de corte (BRT)</p>
            <div className="space-y-1 text-text-tint leading-relaxed pl-3 border-l border-white/[0.08]">
              <p>· Considera-se a publicação da CBF sobre a lista oficial até dia 09/06/2026, e suas eventuais correções oficiais no mesmo dia.</p>
              <p>· Se houver correção até 23:59 (BRT) do dia 09/06/2026, vale a versão mais recente publicada pela CBF nesse período.</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-white/80">Quando o mercado resolve</p>
            <p className="text-text-tint leading-relaxed">
              · O mercado resolve assim que a lista oficial estiver verificável na fonte oficial.
            </p>
          </div>
        </div>

      </div>

      {/* Desktop right panel */}
      <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-20">
          <TradePanel market={market} predictionsOpen={marketOpen} />
        </div>
      </div>

      {/* Mobile sticky bar */}
      <StickyActionBar
        upSel={simSel}
        downSel={naoSel}
        marketId={market.id}
        marketTitle={market.title}
        marketIcon={market.icon}
        marketImageUrl={market.imageUrl}
        upLabel="Sim"
        downLabel="Não"
        upIcon="✓"
        downIcon="✗"
        predictionsOpen={marketOpen}
      />
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function MarketDetailClient({ market }: Props) {
  const isCryptoLive   = market.displayType === "crypto-live";
  const isBinaryPoll   = market.displayType === "binary-poll";
  const isLiveCount    = market.displayType === "live-count";
  const isStoriesRange = market.displayType === "stories-range";
  const isClimateDaily = market.displayType === "climate-daily";

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-tint hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar aos mercados
      </Link>

      {isCryptoLive ? (
        <LiveCryptoView market={market as Market} />
      ) : isBinaryPoll ? (
        <SportsBinaryView market={market as Market} />
      ) : isLiveCount ? (
        <LiveCountView market={market as Market} />
      ) : isStoriesRange ? (
        <StoriesRangeView market={market as Market} />
      ) : isClimateDaily ? (
        <ClimateView market={market as Market} />
      ) : (
        <StandardView market={market} />
      )}
    </div>
  );
}
