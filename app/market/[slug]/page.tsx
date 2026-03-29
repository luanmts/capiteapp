import { notFound } from "next/navigation";
import { getAllMarkets } from "@/lib/getAllMarkets";
import MarketDetailClient from "./MarketDetailClient";

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const markets = await getAllMarkets();
  return markets.map((m) => ({ slug: m.slug }));
}

export default async function MarketPage({ params }: PageProps) {
  const markets = await getAllMarkets();
  
  // 🐛 DEBUG LOGS
  console.log(`[DEBUG] Slug requested: "${params.slug}"`);
  console.log(`[DEBUG] Available slugs:`, markets.map(m => m.slug));
  
  const market = markets.find((m) => m.slug === params.slug);

  if (!market) {
    console.error(`[ERROR] Market not found for slug: "${params.slug}"`);
    console.error(`[ERROR] Available markets:`, markets.map(m => ({ slug: m.slug, displayType: (m as any).displayType })));
    notFound();
  }

  console.log(`[DEBUG] Rendering market:`, { slug: market.slug, displayType: (market as any).displayType, hasSelections: (market as any).selections?.length });

  return <MarketDetailClient market={market} />;
}
