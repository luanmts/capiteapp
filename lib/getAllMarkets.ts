import { Market, GroupedMarket } from "@/types";
import { markets as mockMarkets } from "@/lib/mockData";
import { fetchMarkets } from "@/lib/marketsApi";

function isDynamic(m: Market | GroupedMarket): boolean {
  return (
    // Rodovia não é mais considerada dinâmica do mock, vem apenas da API
    (m.live === 1 && m.slug !== "rodovia-castelo-branco-5min") ||
    m.id.startsWith("carlinhos-") ||
    m.id.startsWith("virginia-") ||
    m.id.startsWith("rio-clima-")
  );
}

/**
 * Função server-side: mescla mercados da API com os dinâmicos do mockData.
 *
 * - Se a API falhar → retorna mockData completo (fallback)
 * - Mercados dinâmicos (live + diários) sempre vêm do mock
 * - Mercados estáticos do mock são substituídos pela versão da API (mesmo id/slug)
 */
export async function getAllMarkets(): Promise<(Market | GroupedMarket)[]> {
  const apiMarkets = await fetchMarkets();

  if (apiMarkets.length === 0) {
    return mockMarkets;
  }

  const apiIds   = new Set(apiMarkets.map((m) => m.id));
  const apiSlugs = new Set(apiMarkets.map((m) => m.slug));

  const mockRemainder = mockMarkets.filter(
    (m) => isDynamic(m) || (!apiIds.has(m.id) && !apiSlugs.has(m.slug))
  );

  return [...apiMarkets, ...mockRemainder];
}