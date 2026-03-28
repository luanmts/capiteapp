"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { fetchBalance } from "@/lib/walletApi";

export interface Bet {
  id: string;
  marketId: string;
  marketTitle: string;
  marketIcon?: string;
  marketImageUrl?: string;
  selectionLabel: string;
  isFirstSelection: boolean; // true = selections[0] was chosen
  amount: number;
  odd: number;
  potentialWin: number;
  placedAt: string; // ISO
  status: "open" | "won" | "lost" | "cancelled";
  resolvedAt?: string;
  profit?: number; // won: potentialWin - amount  |  lost: -amount  |  cancelled: 0
}

interface PlaceBetParams {
  marketId: string;
  /** Para mercados recorrentes: ID do round ativo. Se presente, substitui marketId no payload da API. */
  resolvedMarketId?: string;
  marketTitle: string;
  marketIcon?: string;
  marketImageUrl?: string;
  selectionLabel: string;
  isFirstSelection: boolean;
  amount: number;
  odd: number;
}

interface BetsContextValue {
  balance: number;
  openBets: Bet[];
  closedBets: Bet[];
  placeBet(params: PlaceBetParams): Promise<"ok" | "insufficient_balance" | "error">;
  resolveBetsForMarket(marketId: string, firstSelectionWon: boolean): void;
  cancelBetsForMarket(marketId: string): void;
  addBalance(amount: number): void;
}

const BetsContext = createContext<BetsContextValue | null>(null);

const BALANCE_KEY  = "previsao_balance";
const OPEN_KEY     = "previsao_open_bets";
const CLOSED_KEY   = "previsao_closed_bets";
const INITIAL_BALANCE = 0;

// Deduplicates an array of bets by ID (keeps first occurrence)
function dedupBets(bets: Bet[]): Bet[] {
  const seen = new Set<string>();
  return bets.filter(b => seen.has(b.id) ? false : (seen.add(b.id), true));
}

// Appends resolved bets to closedBets, deduplicating within the batch and against existing
function appendClosed(existing: Bet[], incoming: Bet[]): Bet[] {
  const ids = new Set(existing.map(b => b.id));
  const fresh: Bet[] = [];
  for (const b of incoming) {
    if (!ids.has(b.id)) { ids.add(b.id); fresh.push(b); }
  }
  return fresh.length > 0 ? [...fresh, ...existing] : existing;
}

export function BetsProvider({ children }: { children: ReactNode }) {
  const [balance,    setBalance]    = useState(INITIAL_BALANCE);
  const [openBets,   setOpenBets]   = useState<Bet[]>([]);
  const [closedBets, setClosedBets] = useState<Bet[]>([]);
  const [mounted,    setMounted]    = useState(false);

  // Hydrate from localStorage — deduplicate on load to fix any previously stored duplicates
  useEffect(() => {
    if (typeof window === "undefined") return;

    const o = localStorage.getItem(OPEN_KEY);
    const c = localStorage.getItem(CLOSED_KEY);
    if (o) setOpenBets(dedupBets(JSON.parse(o)));
    if (c) setClosedBets(dedupBets(JSON.parse(c)));

    const token = localStorage.getItem("capite_token");
    if (token) {
      fetchBalance(token).then((real) => {
        setBalance(real);
      }).catch(() => {
        setBalance(0);
      });
    }

    setMounted(true);
  }, []);

  useEffect(() => { if (mounted) localStorage.setItem(BALANCE_KEY,  JSON.stringify(balance));    }, [balance,    mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(OPEN_KEY,     JSON.stringify(openBets));   }, [openBets,   mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(CLOSED_KEY,   JSON.stringify(closedBets)); }, [closedBets, mounted]);

  // ── Place bet ────────────────────────────────────────────────────────────────
  const placeBet = useCallback(async (params: PlaceBetParams): Promise<"ok" | "insufficient_balance" | "error"> => {
    if (params.amount > balance) return "insufficient_balance";

    const token = typeof window !== "undefined" ? localStorage.getItem("capite_token") : null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;


    // Se houver token e URL da API, chama o backend real
    if (token && apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/positions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketId:  params.resolvedMarketId ?? params.marketId,
            side:      params.isFirstSelection ? "yes" : "no",
            stake:     params.amount,
            oddLocked: params.odd,
          }),
        });

        if (res.status === 402) return "insufficient_balance";
        if (!res.ok) return "error";

        const data = await res.json();
        // Atualiza estado local com dados retornados pelo backend
        const bet: Bet = {
          id:             data.position?.id ?? `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          marketId:       params.marketId,
          marketTitle:    params.marketTitle,
          marketIcon:     params.marketIcon,
          marketImageUrl: params.marketImageUrl,
          selectionLabel: params.selectionLabel,
          isFirstSelection: params.isFirstSelection,
          amount:         params.amount,
          odd:            params.odd,
          potentialWin:   +(params.amount * params.odd).toFixed(2),
          placedAt:       new Date().toISOString(),
          status:         "open",
        };
        setBalance(prev => +(prev - params.amount).toFixed(2));
        setOpenBets(prev => [bet, ...prev]);
        return "ok";
      } catch {
        return "error";
      }
    }

    // Modo demo (sem token): atualiza apenas localmente
    const bet: Bet = {
      id: `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...params,
      potentialWin: +(params.amount * params.odd).toFixed(2),
      placedAt: new Date().toISOString(),
      status: "open",
    };
    setBalance(prev => +(prev - params.amount).toFixed(2));
    setOpenBets(prev => [bet, ...prev]);
    return "ok";
  }, [balance]);

  // ── Resolve bets (won / lost) ────────────────────────────────────────────────
  const resolveBetsForMarket = useCallback((marketId: string, firstSelectionWon: boolean) => {
    setOpenBets(prev => {
      const toResolve = prev.filter(b => b.marketId === marketId);
      if (toResolve.length === 0) return prev;

      const resolved: Bet[] = toResolve.map(bet => {
        const won = bet.isFirstSelection === firstSelectionWon;
        return {
          ...bet,
          status: won ? ("won" as const) : ("lost" as const),
          resolvedAt: new Date().toISOString(),
          profit: won ? +(bet.potentialWin - bet.amount).toFixed(2) : -bet.amount,
        };
      });

      const totalWinnings = resolved
        .filter(b => b.status === "won")
        .reduce((s, b) => s + b.potentialWin, 0);
      if (totalWinnings > 0) setBalance(p => +(p + totalWinnings).toFixed(2));

      setClosedBets(p => appendClosed(p, resolved));
      return prev.filter(b => b.marketId !== marketId);
    });
  }, []);

  // ── Cancel bets (mercado inválido / empate) — reembolsa a stake ──────────────
  const cancelBetsForMarket = useCallback((marketId: string) => {
    setOpenBets(prev => {
      const toCancel = prev.filter(b => b.marketId === marketId);
      if (toCancel.length === 0) return prev;

      const cancelled: Bet[] = toCancel.map(bet => ({
        ...bet,
        status: "cancelled" as const,
        resolvedAt: new Date().toISOString(),
        profit: 0,
      }));

      // Reembolsar stakes
      const totalRefund = toCancel.reduce((s, b) => s + b.amount, 0);
      if (totalRefund > 0) setBalance(p => +(p + totalRefund).toFixed(2));

      setClosedBets(p => appendClosed(p, cancelled));
      return prev.filter(b => b.marketId !== marketId);
    });
  }, []);

  const addBalance = useCallback((amount: number) => {
    setBalance(prev => +(prev + amount).toFixed(2));
  }, []);

  return (
    <BetsContext.Provider value={{
      balance, openBets, closedBets,
      placeBet, resolveBetsForMarket, cancelBetsForMarket, addBalance,
    }}>
      {children}
    </BetsContext.Provider>
  );
}

export function useBets() {
  const ctx = useContext(BetsContext);
  if (!ctx) throw new Error("useBets must be used within BetsProvider");
  return ctx;
}
