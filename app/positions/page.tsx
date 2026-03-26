"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Lock, ArrowDownToLine, ArrowUpFromLine, Search, Info, ChevronDown } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import Deposit from "@/components/deposit";
import { useAuth } from "@/contexts/AuthContext";
import { useBets, Bet } from "@/contexts/BetsContext";
import clsx from "clsx";

// ── P&L chart (SVG bar chart) ───────────────────────────────────────────────────
const PNL_FILTERS = ["1D", "1S", "1M", "Tudo"] as const;
type PnlFilter = (typeof PNL_FILTERS)[number];

const FILTER_LABEL: Record<PnlFilter, string> = {
  "1D": "Hoje",
  "1S": "Semana Passada",
  "1M": "Mês Passado",
  "Tudo": "Todo Período",
};

// Only won/lost bets affect P&L — cancelled = refund, no profit/loss
function pnlBets(bets: Bet[]) {
  return bets.filter(b => b.status === "won" || b.status === "lost");
}

function PnlChart({ filter, closedBets }: { filter: PnlFilter; closedBets: Bet[] }) {
  const bars = useMemo(() => {
    const relevant = pnlBets(closedBets);
    const now = Date.now();
    const MS_PER_DAY = 86_400_000;
    const MS_PER_WEEK = 7 * MS_PER_DAY;

    if (filter === "1D") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const buckets = Array(24).fill(0);
      relevant.forEach(b => {
        const d = new Date(b.resolvedAt ?? b.placedAt);
        if (d >= todayStart) buckets[d.getHours()] += (b.profit ?? 0);
      });
      return buckets;
    } else if (filter === "1S") {
      const buckets = Array(7).fill(0);
      relevant.forEach(b => {
        const d = new Date(b.resolvedAt ?? b.placedAt);
        const diffDays = Math.floor((now - d.getTime()) / MS_PER_DAY);
        if (diffDays >= 0 && diffDays < 7) buckets[6 - diffDays] += (b.profit ?? 0);
      });
      return buckets;
    } else if (filter === "1M") {
      const buckets = Array(30).fill(0);
      relevant.forEach(b => {
        const d = new Date(b.resolvedAt ?? b.placedAt);
        const diffDays = Math.floor((now - d.getTime()) / MS_PER_DAY);
        if (diffDays >= 0 && diffDays < 30) buckets[29 - diffDays] += (b.profit ?? 0);
      });
      return buckets;
    } else {
      const buckets = Array(52).fill(0);
      relevant.forEach(b => {
        const d = new Date(b.resolvedAt ?? b.placedAt);
        const diffWeeks = Math.floor((now - d.getTime()) / MS_PER_WEEK);
        if (diffWeeks >= 0 && diffWeeks < 52) buckets[51 - diffWeeks] += (b.profit ?? 0);
      });
      return buckets;
    }
  }, [filter, closedBets]);

  const maxAbs = Math.max(1, ...bars.map(Math.abs));
  const W = 400;
  const H = 80;
  const barW = Math.max(2, (W / bars.length) - 1.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {bars.map((v, i) => {
        const x = i * (W / bars.length);
        const isPos = v >= 0;
        const barH = Math.max(2, (Math.abs(v) / maxAbs) * H * 0.45);
        const y = isPos ? H / 2 - barH : H / 2;
        return (
          <rect key={i} x={x} y={y} width={barW} height={barH || 2} rx={1.5}
            fill={isPos ? "#02BC17" : "#ef4444"} opacity={0.7} />
        );
      })}
    </svg>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Bet["status"] }) {
  if (status === "won") return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
      Ganhou
    </span>
  );
  if (status === "lost") return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
      Perdeu
    </span>
  );
  if (status === "cancelled") return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/[0.06] text-text-tint border border-white/[0.10]">
      Cancelado
    </span>
  );
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
      Em aberto
    </span>
  );
}

// ── Open bet card ──────────────────────────────────────────────────────────────
function OpenBetCard({ bet }: { bet: Bet }) {
  return (
    <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2.5">
        {bet.marketImageUrl
          ? <img src={bet.marketImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          : bet.marketIcon
          ? <span className="text-xl shrink-0">{bet.marketIcon}</span>
          : null}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{bet.marketTitle}</p>
          <p className="text-xs text-text-tint">{bet.selectionLabel}</p>
        </div>
        <StatusBadge status="open" />
      </div>
      <div className="flex items-center justify-between text-xs text-text-tint pt-1 border-t border-white/[0.04]">
        <span>Apostado: <span className="text-white font-semibold">R$ {bet.amount.toFixed(2)}</span></span>
        <span>Retorno potencial: <span className="text-green-400 font-semibold">R$ {bet.potentialWin.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

// ── Closed bet card ────────────────────────────────────────────────────────────
function ClosedBetCard({ bet }: { bet: Bet }) {
  const profit = bet.profit ?? 0;

  return (
    <div className="bg-card border border-white/[0.06] rounded-xl p-4 space-y-2">
      {/* Top row: icon + title + badge */}
      <div className="flex items-center gap-2.5">
        {bet.marketImageUrl
          ? <img src={bet.marketImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          : bet.marketIcon
          ? <span className="text-xl shrink-0">{bet.marketIcon}</span>
          : null}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{bet.marketTitle}</p>
          <p className="text-xs text-text-tint">{bet.selectionLabel}</p>
        </div>
        <StatusBadge status={bet.status} />
      </div>

      {/* Details row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.04]">
        <div>
          <p className="text-[10px] text-text-tint/60 uppercase tracking-wide mb-0.5">Apostado</p>
          <p className="text-xs font-semibold text-white">R$ {bet.amount.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-tint/60 uppercase tracking-wide mb-0.5">Odd</p>
          <p className="text-xs font-semibold text-white">{bet.odd.toFixed(2)}x</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tint/60 uppercase tracking-wide mb-0.5">
            {bet.status === "won" ? "Payout" : bet.status === "cancelled" ? "Reembolso" : "Resultado"}
          </p>
          <p className={clsx("text-xs font-bold",
            bet.status === "won" ? "text-green-400" :
            bet.status === "lost" ? "text-red-400" :
            "text-text-tint"
          )}>
            {bet.status === "won"
              ? `+R$ ${bet.potentialWin.toFixed(2)}`
              : bet.status === "cancelled"
              ? `R$ ${bet.amount.toFixed(2)}`
              : `-R$ ${bet.amount.toFixed(2)}`}
          </p>
        </div>
      </div>

      {/* P&L line for won/lost */}
      {bet.status !== "cancelled" && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tint/60">Lucro / Prejuízo</span>
          <span className={clsx("font-bold tabular-nums", profit >= 0 ? "text-green-400" : "text-red-400")}>
            {profit >= 0 ? "+" : ""}R$ {profit.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Portfolio (authenticated) ──────────────────────────────────────────────────
function Portfolio() {
  const [pnlFilter, setPnlFilter] = useState<PnlFilter>("1M");
  const [tab, setTab] = useState<"aberto" | "encerrado">("aberto");
  const [search, setSearch] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const { balance, openBets, closedBets } = useBets();

  const filteredOpenBets = useMemo(() =>
    openBets.filter(b =>
      b.marketTitle.toLowerCase().includes(search.toLowerCase()) ||
      b.selectionLabel.toLowerCase().includes(search.toLowerCase())
    ), [openBets, search]);

  const filteredClosedBets = useMemo(() =>
    closedBets.filter(b =>
      b.marketTitle.toLowerCase().includes(search.toLowerCase()) ||
      b.selectionLabel.toLowerCase().includes(search.toLowerCase())
    ), [closedBets, search]);

  // P&L excludes cancelled bets (they are refunds, not profit/loss)
  const totalPnl = useMemo(() => {
    const now = Date.now();
    const MS_PER_DAY = 86_400_000;
    return pnlBets(closedBets)
      .filter(b => {
        const d = new Date(b.resolvedAt ?? b.placedAt).getTime();
        if (pnlFilter === "1D") {
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          return d >= todayStart.getTime();
        }
        if (pnlFilter === "1S") return now - d <= 7 * MS_PER_DAY;
        if (pnlFilter === "1M") return now - d <= 30 * MS_PER_DAY;
        return true;
      })
      .reduce((s, b) => s + (b.profit ?? 0), 0);
  }, [closedBets, pnlFilter]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* ── Title ── */}
      <h1 className="text-2xl font-bold text-white">Portfólio</h1>

      {/* ── BRLX notice (collapsible) ── */}
      <div className="border border-white/[0.07] rounded-xl overflow-hidden">
        <button
          onClick={() => setNoticeOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
        >
          <Info className="w-4 h-4 text-text-tint shrink-0" />
          <span className="flex-1 text-left text-xs font-semibold text-white/80">Sobre Saldo e Posições</span>
          <ChevronDown className={clsx("w-4 h-4 text-text-tint transition-transform duration-200", noticeOpen && "rotate-180")} />
        </button>
        {noticeOpen && (
          <div className="px-4 py-3 border-t border-white/[0.07] bg-white/[0.02]">
            <p className="text-[11px] text-text-tint leading-relaxed">
              A exibição é em R$, porém o seu saldo é mantido em{" "}
              <span className="text-white/70 font-medium">BRLX</span> pela Cravei.
              BRLX é uma stablecoin com lastro em real brasileiro.
            </p>
          </div>
        )}
      </div>

      {/* ── Balance card ── */}
      <div className="bg-card border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs text-text-tint uppercase tracking-wide mb-1">Saldo</p>
          <p className="text-2xl font-bold text-white tabular-nums">R$ {balance.toFixed(2).replace(".", ",")}</p>
          <p className="text-xs text-text-tint mt-1 tabular-nums">
            P&amp;L do dia:{" "}
            <span className={clsx("font-semibold", totalPnl >= 0 ? "text-green-400" : "text-red-400")}>
              {totalPnl >= 0 ? "+" : ""}R$ {Math.abs(totalPnl).toFixed(2).replace(".", ",")}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setDepositOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Depósito
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
            <ArrowUpFromLine className="w-4 h-4" />
            Levantar
          </button>
        </div>
      </div>

      {/* ── P&L Chart card ── */}
      <div className="bg-card border border-white/[0.06] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
            <span className="text-sm font-semibold text-white">Lucro / Prejuízo</span>
          </div>
          <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
            {PNL_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setPnlFilter(f)}
                className={clsx(
                  "text-xs font-semibold px-2.5 py-1 rounded-md transition-colors",
                  pnlFilter === f ? "bg-white/[0.10] text-white" : "text-text-tint hover:text-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className={clsx("text-2xl font-bold tabular-nums", totalPnl >= 0 ? "text-white" : "text-red-400")}>
            {totalPnl >= 0 ? "" : "-"}R$ {Math.abs(totalPnl).toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs text-text-tint mt-0.5">{FILTER_LABEL[pnlFilter]}</p>
        </div>
        <PnlChart filter={pnlFilter} closedBets={closedBets} />
      </div>

      {/* ── Orders tabs ── */}
      <div className="space-y-4">
        <div className="flex border-b border-white/[0.08]">
          {(["aberto", "encerrado"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "pb-3 mr-6 text-sm font-semibold transition-colors border-b-2 -mb-px",
                tab === t
                  ? "text-white border-primary"
                  : "text-text-tint border-transparent hover:text-white/70"
              )}
            >
              {t === "aberto"
                ? `Pedidos em Aberto${openBets.length > 0 ? ` (${openBets.length})` : ""}`
                : `Pedidos Encerrados${closedBets.length > 0 ? ` (${closedBets.length})` : ""}`}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tint" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-tint focus:outline-none focus:border-white/20 transition-all"
          />
        </div>

        {tab === "aberto" ? (
          filteredOpenBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-text-tint">Nenhuma previsão em andamento.</p>
              <Link href="/" className="mt-4 text-sm text-primary font-semibold hover:underline">
                Explorar mercados
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOpenBets.map(bet => <OpenBetCard key={bet.id} bet={bet} />)}
            </div>
          )
        ) : (
          filteredClosedBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-text-tint">Nenhuma previsão encerrada ainda.</p>
              <Link href="/" className="mt-4 text-sm text-primary font-semibold hover:underline">
                Explorar mercados
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClosedBets.map(bet => <ClosedBetCard key={bet.id} bet={bet} />)}
            </div>
          )
        )}
      </div>

      <Deposit isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (!user) {
    return (
      <>
        <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-6">
            <Lock className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Acesso Reservado</h1>
          <p className="text-sm text-text-tint leading-relaxed max-w-xs mb-8">
            É preciso estar autenticado para acessar essa área.
          </p>
          <Link
            href="/"
            className="w-full max-w-xs bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-bold text-base py-4 rounded-2xl transition-all text-center block"
          >
            Ir para o Início
          </Link>
          <p className="mt-6 text-sm text-text-tint">
            Ainda não tem conta?{" "}
            <button onClick={() => setAuthOpen(true)} className="text-primary font-semibold hover:underline">
              Cadastre-se agora
            </button>
          </p>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return <Portfolio />;
}
