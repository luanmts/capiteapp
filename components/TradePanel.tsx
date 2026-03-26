"use client";

import { useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Market, Selection } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { useBets } from "@/contexts/BetsContext";

const PRESETS = [1, 5, 10, 100];

interface TradePanelProps {
  market: Market;
  /** For stories-range markets: the range + direction chosen by clicking a card button */
  controlledSelection?: { sel: Selection; dir: "sim" | "nao" } | null;
  /** When false, the prediction form is dimmed and the submit button is disabled */
  predictionsOpen?: boolean;
}

export default function TradePanel({ market, controlledSelection, predictionsOpen = true }: TradePanelProps) {
  const { user, login } = useAuth();
  const { balance, placeBet } = useBets();
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(market.selections[0]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [betState, setBetState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [betError, setBetError] = useState<string | null>(null);

  const isControlled = market.displayType === "stories-range";

  // For controlled mode: derive the effective odd from the chosen direction
  const controlledOdd = controlledSelection
    ? controlledSelection.dir === "sim"
      ? controlledSelection.sel.odd
      : (controlledSelection.sel.oddNao ?? 1.0)
    : null;

  const selection = isControlled ? null : market.selections.find((s) => s.id === selectedId);
  const activeOdd = isControlled ? controlledOdd : selection?.odd ?? 0;
  const isFirst = selectedId === market.selections[0]?.id;
  const toWin = activeOdd && amount > 0 ? +(amount * activeOdd).toFixed(2) : 0;

  const add = useCallback((n: number) => setAmount((p) => Math.max(0, +(p + n).toFixed(2))), []);

  return (
    <div className="bg-[#1a1f2e] border border-white/[0.08] rounded-2xl">
      {/* ── Predictions closed notice (top) ── */}
      {!predictionsOpen && (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-t-2xl border-b border-white/[0.06] bg-white/[0.03]">
          <svg className="w-3.5 h-3.5 text-text-tint/50 shrink-0" viewBox="0 0 14 14" fill="none">
            <rect x="2.5" y="6" width="9" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-text-tint/50 font-medium">Previsões encerradas para esta rodada</span>
        </div>
      )}

      <div className="p-4 space-y-4">

        {/* ── Top section: range selector (stories-range) OR Sim/Não buttons ── */}
        {isControlled ? (
          controlledSelection ? (
            /* Selected range display */
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-tint">Sua Previsão</p>
                <p className="text-sm font-bold text-white">{controlledSelection.sel.label}</p>
              </div>
              <span className={clsx(
                "text-sm font-bold px-2 py-1 rounded-lg shrink-0",
                controlledSelection.dir === "sim"
                  ? "bg-primary/15 text-primary"
                  : "bg-red-500/15 text-red-400"
              )}>
                {controlledSelection.dir === "sim" ? "Sim" : "Não"}
              </span>
            </div>
          ) : (
            /* Nothing selected yet */
            <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/[0.12] text-text-tint text-xs text-center">
              Clique em Sim ou Não em uma faixa acima para selecionar
            </div>
          )
        ) : (
          /* Standard Sim / Não grid */
          <div className="grid grid-cols-2 gap-2">
            {market.selections.slice(0, 2).map((sel, i) => {
              const active = sel.id === selectedId;
              const isPositive = i === 0;
              return (
                <button
                  key={sel.id}
                  onClick={() => setSelectedId(sel.id)}
                  className={clsx(
                    "py-2.5 px-3 rounded-xl text-sm font-bold transition-all border",
                    active
                      ? isPositive
                        ? "bg-green-500/15 border-green-500/40 text-green-400"
                        : "bg-red-500/15 border-red-500/40 text-red-400"
                      : "bg-white/[0.04] border-white/[0.08] text-text-tint hover:text-white hover:border-white/20"
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {active && (isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
                    {sel.label}
                    <span className={clsx("text-xs font-semibold", active ? isPositive ? "text-green-400/80" : "text-red-400/80" : "text-text-tint/60")}>
                      {sel.odd.toFixed(2)}x
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Valor label + big amount ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-tint uppercase tracking-wider">Valor</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-tint tabular-nums">Saldo: R$ {balance.toFixed(2)}</span>
              <button
                onClick={() => setAmount(0)}
                className={clsx(
                  "text-[10px] font-medium transition-colors",
                  amount > 0 ? "text-text-tint hover:text-white" : "invisible"
                )}
              >
                Limpar
              </button>
            </div>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums text-center py-2">
            R${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}
          </p>
        </div>

        {/* ── Preset chips ── */}
        <div className="flex gap-1.5">
          {PRESETS.map((n) => (
            <button
              key={n}
              onClick={() => add(n)}
              className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.06] text-xs font-semibold text-white active:scale-95 transition-all"
            >
              +R${n}
            </button>
          ))}
          <button
            onClick={() => setAmount(999)}
            className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.06] text-xs font-semibold text-white active:scale-95 transition-all"
          >
            Máx
          </button>
        </div>

        {/* ── Resumo: Retorno + Caso Acerte ── */}
        <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-tint">Retorno</span>
            <span className="text-sm font-bold text-white">
              {activeOdd ? `${activeOdd.toFixed(2)}x` : "–"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-tint">Caso Acerte</span>
            <span className={clsx("text-sm font-bold", amount > 0 ? "text-green-400" : "text-text-tint")}>
              {amount > 0 ? `R$ ${toWin.toFixed(2)}` : "–"}
            </span>
          </div>
        </div>

        {/* ── Trade button ── */}
        {betError && (
          <p className="text-xs text-red-400 text-center">{betError}</p>
        )}
        <AnimatePresence mode="wait">
        {betState === "loading" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full py-3.5 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center"
          >
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </motion.div>
        ) : betState === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full py-3.5 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center gap-2"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.05 }}
            >
              <Check className="w-4 h-4 text-green-400" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="text-sm font-semibold text-green-400"
            >
              Previsão Registrada.
            </motion.span>
          </motion.div>
        ) : (
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            disabled={!!user && (amount <= 0 || !predictionsOpen)}
            onClick={async () => {
              if (!user) { setAuthOpen(true); return; }
              const sel = isControlled
                ? controlledSelection?.sel
                : market.selections.find(s => s.id === selectedId);
              if (!sel) return;
              if (amount > balance) {
                setBetError("Saldo insuficiente para esta previsão.");
                setTimeout(() => setBetError(null), 3000);
                return;
              }
              const isFirst = isControlled
                ? false
                : market.selections[0]?.id === selectedId;

              setBetState("loading");
              const result = await placeBet({
                marketId: market.id,
                marketTitle: market.title,
                marketIcon: market.icon,
                marketImageUrl: market.imageUrl,
                selectionLabel: isControlled
                  ? `${controlledSelection!.sel.label} — ${controlledSelection!.dir === "sim" ? "Sim" : "Não"}`
                  : sel.label,
                isFirstSelection: isFirst,
                amount,
                odd: activeOdd ?? 1,
              });

              if (result === "ok") {
                setBetState("success");
                setTimeout(() => { setBetState("idle"); setAmount(0); }, 2000);
              } else {
                setBetState("idle");
                setBetError(
                  result === "insufficient_balance"
                    ? "Saldo insuficiente para esta previsão."
                    : "Erro ao registrar previsão. Tente novamente."
                );
                setTimeout(() => setBetError(null), 3000);
              }
            }}
            className={clsx(
              "w-full py-3.5 rounded-2xl text-sm font-bold transition-colors",
              !user
                ? "bg-primary hover:bg-primary/90 active:scale-[0.98] text-white"
                : !predictionsOpen
                ? "opacity-35 bg-white/[0.06] text-text-tint cursor-not-allowed"
                : amount > 0
                ? "bg-primary hover:bg-primary/90 active:scale-[0.98] text-white"
                : "bg-white/[0.06] text-text-tint cursor-not-allowed"
            )}
          >
            Fazer Previsão
          </motion.button>
        )}
        </AnimatePresence>

        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onLogin={(u) => { login(u); setAuthOpen(false); }}
        />

        {/* ── Disclaimer ── */}
        <p className="text-[10px] text-text-tint/50 text-center leading-relaxed">
          Ao negociar, você concorda com os{" "}
          <button className="underline underline-offset-2 hover:text-text-tint transition-colors">
            Termos de Uso
          </button>
          .
        </p>

      </div>
    </div>
  );
}
