"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronDown, TrendingUp, TrendingDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Selection } from "@/types";
import { useBets } from "@/contexts/BetsContext";

interface TradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  direction: "up" | "down" | null;
  upSel: Selection | undefined;
  downSel: Selection | undefined;
  marketId: string;
  marketTitle: string;
  marketIcon?: string;
  marketImageUrl?: string;
}

const PRESETS = [1, 5, 10, 100];

export default function TradeSheet({
  isOpen,
  onClose,
  direction,
  upSel,
  downSel,
  marketId,
  marketTitle,
  marketIcon,
  marketImageUrl,
}: TradeSheetProps) {
  const { balance, placeBet } = useBets();
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState(0);
  const [betState, setBetState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [betError, setBetError] = useState<string | null>(null);

  const selection = direction === "up" ? upSel : downSel;
  const isUp = direction === "up";
  const toWin = selection ? +(amount * selection.odd).toFixed(2) : 0;

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset on reopen
  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setBetState("idle");
      setBetError(null);
    }
  }, [isOpen, direction]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const add = useCallback((n: number) => setAmount((prev) => Math.max(0, +(prev + n).toFixed(2))), []);

  const handleSubmit = async () => {
    if (!selection || amount <= 0) return;
    if (amount > balance) {
      setBetError("Saldo insuficiente para esta previsão.");
      setTimeout(() => setBetError(null), 3000);
      return;
    }

    setBetState("loading");
    const result = await placeBet({
      marketId,
      marketTitle,
      marketIcon,
      marketImageUrl,
      selectionLabel: selection.label,
      isFirstSelection: direction === "up",
      amount,
      odd: selection.odd,
    });

    if (result === "ok") {
      setBetState("success");
      setTimeout(() => {
        setBetState("idle");
        onClose();
      }, 2000);
    } else {
      setBetState("idle");
      setBetError(
        result === "insufficient_balance"
          ? "Saldo insuficiente para esta previsão."
          : "Erro ao registrar previsão. Tente novamente."
      );
      setTimeout(() => setBetError(null), 3000);
    }
  };

  if (!isOpen && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-[55] bg-black/50 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Sheet */}
      <div className={clsx(
        "fixed inset-x-0 bottom-0 z-[56] transition-transform duration-300 ease-out",
        visible ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 bg-[#1a1f2e] rounded-t-3xl border-t border-x border-white/[0.08]">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="bg-[#1a1f2e] border-x border-white/[0.08] px-4 pb-8 pt-3 space-y-4">

          {/* ── Top row ── */}
          <div className="flex items-center">
            <button className="flex items-center gap-1 text-sm font-semibold text-white">
              Comprar
              <ChevronDown className="w-4 h-4 text-text-tint" />
            </button>
          </div>

          {/* ── Market title + direction badge ── */}
          <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.06]">
            {marketImageUrl ? (
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
                <Image src={marketImageUrl} alt={marketTitle} width={36} height={36} className="w-full h-full object-cover" />
              </div>
            ) : marketIcon ? (
              <span className="text-2xl shrink-0 leading-none">{marketIcon}</span>
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-text-tint truncate">{marketTitle}</p>
              <div className={clsx(
                "inline-flex items-center gap-1 text-xs font-semibold mt-0.5",
                isUp ? "text-green-400" : "text-red-400"
              )}>
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {selection?.label ?? (isUp ? "Para cima" : "Para baixo")}
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-text-tint hover:text-white transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Amount input ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tint font-medium uppercase tracking-wider">Valor</span>
              <span className="text-xs text-text-tint tabular-nums">Saldo: R$ {balance.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAmount((prev) => Math.max(0, +(prev - 1).toFixed(2)))}
                className="w-10 h-10 rounded-full border border-white/[0.12] text-white text-xl font-light flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-white tabular-nums">
                  R${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => add(1)}
                className="w-10 h-10 rounded-full border border-white/[0.12] text-white text-xl font-light flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all"
              >
                +
              </button>
            </div>
          </div>

          {/* ── Preset chips ── */}
          <div className="flex items-center gap-2 justify-center">
            {PRESETS.map((n) => (
              <button key={n} onClick={() => add(n)}
                className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.06] text-sm font-semibold text-white active:scale-95 transition-all">
                +R${n}
              </button>
            ))}
            <button
              onClick={() => setAmount(balance)}
              className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.06] text-sm font-semibold text-white active:scale-95 transition-all"
            >
              Máx
            </button>
          </div>

          {/* ── Summary ── */}
          <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-tint">Retorno</span>
              <span className="text-sm font-bold text-white">{selection ? `${selection.odd.toFixed(2)}x` : "–"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-tint">Caso Acerte</span>
              <span className={clsx("text-sm font-bold", amount > 0 ? "text-green-400" : "text-text-tint")}>
                {amount > 0 ? `R$ ${toWin.toFixed(2)}` : "–"}
              </span>
            </div>
          </div>

          {/* ── Error feedback ── */}
          {betError && (
            <p className="text-xs text-red-400 text-center -mb-1">{betError}</p>
          )}

          {/* ── Trade button ── */}
          <AnimatePresence mode="wait">
            {betState === "loading" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="w-full py-4 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center"
              >
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </motion.div>
            ) : betState === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full py-4 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center gap-2"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.05 }}
                >
                  <Check className="w-5 h-5 text-green-400" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  className="text-base font-semibold text-green-400"
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
                disabled={amount <= 0}
                onClick={handleSubmit}
                className={clsx(
                  "w-full py-4 rounded-2xl text-base font-bold transition-colors",
                  amount > 0
                    ? "bg-primary hover:bg-primary/90 active:scale-[0.98] text-white"
                    : "bg-white/[0.06] text-text-tint cursor-not-allowed"
                )}
              >
                Fazer Previsão
              </motion.button>
            )}
          </AnimatePresence>

        </div>
      </div>
    </>
  );
}
