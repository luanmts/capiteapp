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
  const market = markets.find((m) => m.slug === params.slug);

  if (params.slug === "sol-5min") {
    console.log("SOL MARKET DEBUG:", JSON.stringify(market, null, 2));
  }

  if (!market) {
    notFound();
  }

  return <MarketDetailClient market={market} />;
}
