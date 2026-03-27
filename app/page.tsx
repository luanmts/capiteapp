import { getAllMarkets } from "@/lib/getAllMarkets";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const markets = await getAllMarkets();
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <HomeClient initialMarkets={markets} />
    </div>
  );
}
