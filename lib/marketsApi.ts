import { Market } from "@/types";

interface ApiSelection {
  id: string;
  label: string;
  odd: number;
  odd_nao?: number;
  percent: number;
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

function mapApiMarket(m: ApiMarket): Market {
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
    selections:    m.selections.map((s, i) => ({
      id:      s.id,
      label:   s.label,
      odd:     i === 0 && m.current_yes_odd != null ? m.current_yes_odd
             : i === 1 && m.current_no_odd  != null ? m.current_no_odd
             : s.odd,
      oddNao:  s.odd_nao,
      percent: s.percent,
      code:    s.code,
      color:   s.color,
    })),
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