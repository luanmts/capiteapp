import { Market } from "@/types";

interface ApiSelection {
  id: string;
  label: string;
  odd?: number | null;
  odd_nao?: number | null;
  percent?: number | null;
  code?: string;
  color?: string;
}

interface ApiMarket {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon?: string;
  image_url?: string;
  category: string;
  closes_at: string;
  live: 0 | 1;
  volume: number;
  matching_system: "binary" | "multiple" | "range";
  display_type?: string;
  status?: string;
  current_yes_odd?: number;
  current_no_odd?: number;
  selections: ApiSelection[];
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapApiMarket(m: ApiMarket): Market {
  const defaultYesOdd = safeNumber(m.current_yes_odd) ?? 1.0;
  const defaultNoOdd = safeNumber(m.current_no_odd) ?? 1.0;

  const mappedSelections = (Array.isArray(m.selections) ? m.selections : []).map((s, i) => {
    const apiOdd = safeNumber(s.odd);
    const yesOdd = safeNumber(m.current_yes_odd);
    const noOdd = safeNumber(m.current_no_odd);

    const fallbackOdd =
      i === 0 ? (yesOdd ?? apiOdd ?? defaultYesOdd)
      : i === 1 ? (noOdd ?? apiOdd ?? defaultNoOdd)
      : (apiOdd ?? 1.0);

    return {
      id:      s.id,
      label:   s.label,
      odd:     fallbackOdd,
      oddNao:  safeNumber(s.odd_nao) ?? undefined,
      percent: safeNumber(s.percent) ?? 0,
      code:    s.code,
      color:   s.color,
    };
  });

  // Garante 2 seleções mínimas para crypto-live mesmo com payload parcial da API
  if (m.display_type === "crypto-live" && mappedSelections.length < 2) {
    const yesSel = mappedSelections[0] ?? {
      id: `${m.id}-yes`,
      label: "Sobe",
      odd: defaultYesOdd,
      percent: 50,
      code: "UP",
      color: "#02BC17",
    };
    const noSel = mappedSelections[1] ?? {
      id: `${m.id}-no`,
      label: "Desce",
      odd: defaultNoOdd,
      percent: 50,
      code: "DOWN",
      color: "#e23838",
    };
    mappedSelections.splice(0, mappedSelections.length, yesSel, noSel);
  }

  return {
    id:            m.id,
    title:         m.title,
    slug:          m.slug,
    description:   m.description,
    icon:          m.icon,
    imageUrl:      m.image_url,
    category:      m.category,
    closesAt:      m.closes_at,
    live:          m.live,
    volume:        m.volume,
    matchingSystem: m.matching_system,
    displayType:   m.display_type as Market["displayType"],
    selections:    mappedSelections,
  };
}

/**
 * Busca mercados do backend.
 * Retorna [] se a API estiver indisponível ou não configurada — nunca lança exceção.
 */
export async function fetchMarkets(): Promise<Market[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl}/markets`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const list: ApiMarket[] = Array.isArray(data.markets) ? data.markets : [];
    return list.map(mapApiMarket);
  } catch {
    return [];
  }
}

export interface ActiveRound {
  roundId: string;    // current_round_id do template
  startPrice: number; // start_price do round ativo
  closesAt: string;   // closes_at do round ativo
}

/**
 * Busca o preço atual do Petróleo WTI via proxy do backend (evita CORS).
 * Retorna null se indisponível — nunca lança exceção.
 */
export async function fetchOilPrice(): Promise<number | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/prices/oil`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const price = parseFloat(data.price);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

/**
 * Busca as odds atuais de um round específico.
 * Retorna nulls se indisponível — nunca lança exceção.
 */
export async function fetchRoundOdds(
  roundId: string
): Promise<{ currentYesOdd: number | null; currentNoOdd: number | null }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return { currentYesOdd: null, currentNoOdd: null };
  try {
    const res = await fetch(`${apiUrl}/markets/${roundId}`, { cache: "no-store" });
    if (!res.ok) return { currentYesOdd: null, currentNoOdd: null };
    const data = await res.json();
    return {
      currentYesOdd: data.market?.current_yes_odd ?? null,
      currentNoOdd:  data.market?.current_no_odd  ?? null,
    };
  } catch {
    return { currentYesOdd: null, currentNoOdd: null };
  }
}

/**
 * Busca o round ativo do Bitcoin pelo slug do template.
 * Retorna null se indisponível — nunca lança exceção.
 */
export async function fetchActiveRound(slug: string): Promise<ActiveRound | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/markets/slug/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const m = data.market;
    if (!m?.current_round_id || !m?.start_price) return null;
    return {
      roundId:    m.current_round_id,
      startPrice: parseFloat(m.start_price),
      closesAt:   m.closes_at,
    };
  } catch {
    return null;
  }
}