import { notFound } from "next/navigation";
import { markets } from "@/lib/mockData";
import MarketDetailClient from "./MarketDetailClient";

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return markets.map((m) => ({ slug: m.slug }));
}

export default function MarketPage({ params }: PageProps) {
  const market = markets.find((m) => m.slug === params.slug);

  if (!market) {
    notFound();
  }

  return <MarketDetailClient market={market} />;
}
