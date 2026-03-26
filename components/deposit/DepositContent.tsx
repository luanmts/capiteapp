"use client";

import { useRef, useState } from "react";
import { X, CheckCircle2, ArrowLeft, Copy, Check } from "lucide-react";
import clsx from "clsx";

const QUICK_AMOUNTS = [100, 250, 500, 1000];
type State = "idle" | "loading" | "pix" | "success";

const MOCK_PIX_KEY = "cravei@previsao.io";

interface Props { onClose: () => void }

// ── PIX icon (official) ────────────────────────────────────────────────────────
function PixIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48">
      <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
      <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
      <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
    </svg>
  );
}

// ── Mock QR code (deterministic SVG pattern) ───────────────────────────────────
function MockQR() {
  const SIZE = 21;
  // LCG seeded random for determinism
  let s = 987654321;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  const cells: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => rand() > 0.5)
  );

  // Finder patterns (top-left, top-right, bottom-left)
  const finder = (r: number, c: number) => {
    for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 7; dc++) {
      const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const onInner  = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      cells[r + dr][c + dc] = onBorder || onInner;
    }
    // quiet zone
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const row = r + dr, col = c + dc;
      if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) continue;
      if (dr === -1 || dr === 7 || dc === -1 || dc === 7)
        cells[row][col] = false;
    }
  };
  finder(0, 0); finder(0, 14); finder(14, 0);

  const cell = 10;
  const pad = 16;
  const total = SIZE * cell + pad * 2;

  return (
    <svg
      width={total} height={total} viewBox={`0 0 ${total} ${total}`}
      className="rounded-2xl"
      style={{ background: "#fff" }}
    >
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={pad + c * cell} y={pad + r * cell}
              width={cell - 1} height={cell - 1}
              rx={1}
              fill="#111"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ── PIX payment screen ─────────────────────────────────────────────────────────
function PixScreen({ formatted, onBack, onClose }: {
  formatted: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MOCK_PIX_KEY).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.10] text-text-tint hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
        </button>
        <h2 className="text-base font-bold text-white tracking-tight">Pagar com PIX</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.10] text-text-tint hover:text-white transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between px-5 py-3 border-y border-white/[0.06]">
        <span className="text-sm text-text-tint">Recarregar em:</span>
        <span className="text-sm font-semibold text-white">Cravei</span>
      </div>

      {/* Total row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <span className="text-sm text-text-tint">Total</span>
        <span className="text-base font-bold text-white tabular-nums">R$ {formatted}</span>
      </div>

      {/* QR code */}
      <div className="flex flex-col items-center px-5 py-6 gap-3">
        <div className="p-3 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <MockQR />
        </div>
        <p className="text-xs text-text-tint/60 text-center max-w-[200px] leading-relaxed">
          Abra o app do seu banco e escaneie o QR code para pagar
        </p>
      </div>

      {/* Copy key button */}
      <div className="px-5 pb-3">
        <button
          onClick={handleCopy}
          className={clsx(
            "w-full flex items-center justify-center gap-2.5 font-semibold text-sm py-3.5 rounded-xl border transition-all active:scale-[0.98]",
            copied
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-white/[0.05] border-white/[0.10] text-white hover:bg-white/[0.09]"
          )}
        >
          {copied
            ? <><Check className="w-4 h-4" strokeWidth={2.5} /> Chave copiada!</>
            : <><Copy className="w-4 h-4" strokeWidth={2} /> Copiar chave PIX</>
          }
        </button>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-text-tint/40 leading-relaxed px-5 pb-5">
        Ao pagar, você concorda com os{" "}
        <button className="underline underline-offset-2 hover:text-text-tint/70 transition-colors">
          Termos de Uso
        </button>{" "}
        da Cravei.
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DepositContent({ onClose }: Props) {
  const [raw, setRaw] = useState("");
  const [state, setState] = useState<State>("idle");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cents = parseInt(raw || "0", 10);
  const numericValue = cents / 100;
  const formatted = numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (state !== "idle") return;
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "") || "";
    if (digits.length > 8) return;
    setRaw(digits);
  };

  const handleQuick = (amount: number) => {
    if (state !== "idle") return;
    setRaw(String(amount * 100));
    inputRef.current?.focus();
  };

  const handlePay = () => {
    if (numericValue <= 0 || state !== "idle") return;
    setState("loading");
    setTimeout(() => setState("pix"), 1400);
  };

  // ── PIX screen ───────────────────────────────────────────────────────────────
  if (state === "pix") {
    return <PixScreen formatted={formatted} onBack={() => setState("idle")} onClose={onClose} />;
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div className="flex flex-col items-center px-7 pt-10 pb-8 text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/30">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" strokeWidth={1.8} />
            </div>
          </div>
        </div>
        <p className="text-xl font-bold text-white tracking-tight">Depósito confirmado!</p>
        <p className="text-sm text-text-tint mt-2 max-w-[220px] leading-relaxed">
          Seu saldo foi creditado com sucesso.
        </p>
        <div className="mt-7 w-full">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-bold text-sm py-3.5 rounded-xl transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // ── Main / idle screen ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Depósito</h2>
          <p className="text-xs text-text-tint mt-0.5">Adicione saldo à sua conta</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.10] text-text-tint hover:text-white transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Value display */}
      <div
        className={clsx(
          "mx-6 mt-5 mb-1 flex flex-col items-center py-5 rounded-2xl border cursor-text transition-all duration-200",
          focused
            ? "bg-white/[0.04] border-primary/40 shadow-[0_0_0_3px_rgba(2,188,23,0.08)]"
            : "bg-white/[0.03] border-white/[0.07]"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-[10px] font-semibold text-text-tint/60 uppercase tracking-[0.18em] mb-3">
          Total a depositar
        </span>
        <div className="flex items-baseline gap-2 px-4">
          <span className={clsx(
            "font-bold transition-colors",
            numericValue > 0 ? "text-white text-2xl" : "text-text-tint/40 text-xl"
          )}>
            R$
          </span>
          <div className="relative flex items-baseline">
            <span className={clsx(
              "font-bold tabular-nums tracking-tight transition-colors",
              numericValue > 0 ? "text-white text-4xl" : "text-text-tint/30 text-4xl"
            )}>
              {formatted}
            </span>
            {focused && (
              <span
                className="ml-0.5 inline-block w-[2px] rounded-full bg-primary self-stretch"
                style={{ animation: "blink 1s step-end infinite", minHeight: "1em" }}
              />
            )}
          </div>
        </div>
        {raw && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setRaw(""); inputRef.current?.focus(); }}
            className="mt-3 text-[10px] font-bold uppercase tracking-widest text-text-tint/50 hover:text-red-400 transition-colors px-3 py-1 rounded-md hover:bg-red-500/10"
          >
            Limpar
          </button>
        )}
        <input
          ref={inputRef}
          type="tel"
          value={raw}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="sr-only"
        />
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Quick amounts */}
      <div className="flex gap-2 px-6 pt-4 pb-5">
        {QUICK_AMOUNTS.map((a) => {
          const selected = numericValue === a;
          return (
            <button
              key={a}
              onClick={() => handleQuick(a)}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95",
                selected
                  ? "bg-primary text-white border-transparent shadow-[0_0_12px_rgba(2,188,23,0.25)]"
                  : "bg-white/[0.04] border-white/[0.08] text-text-tint hover:bg-white/[0.07] hover:text-white hover:border-white/[0.14]"
              )}
            >
              {a >= 1000 ? `R$${a / 1000}k` : `R$${a}`}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-white/[0.05] mx-6" />

      {/* Payment method */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-[10px] font-semibold text-text-tint/50 uppercase tracking-[0.18em] mb-3">
          Método de pagamento
        </p>
        <div className="flex items-center gap-3.5 bg-white/[0.03] border border-white/[0.09] rounded-xl px-4 py-3.5 ring-1 ring-primary/20">
          <div className="w-9 h-9 rounded-lg bg-[#4db6ac]/10 border border-[#4db6ac]/20 flex items-center justify-center shrink-0">
            <PixIcon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-none mb-1">PIX</p>
            <p className="text-[11px] text-text-tint">Instantâneo · Sem taxas</p>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pt-5 pb-6">
        <button
          onClick={handlePay}
          disabled={numericValue <= 0 || state === "loading"}
          className={clsx(
            "w-full flex items-center justify-center gap-2.5 font-bold text-[15px] py-4 rounded-xl transition-all",
            numericValue > 0 && state === "idle"
              ? "bg-primary hover:bg-primary/90 active:scale-[0.98] text-white shadow-[0_4px_24px_rgba(2,188,23,0.30)]"
              : "bg-white/[0.05] text-white/20 cursor-not-allowed"
          )}
        >
          {state === "loading" ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <>Pagar <span className="tabular-nums">R$ {numericValue > 0 ? formatted : "0,00"}</span></>
          )}
        </button>
        <p className="text-center text-[10px] text-text-tint/40 mt-3">
          Transação processada com segurança via PIX
        </p>
      </div>
    </div>
  );
}
