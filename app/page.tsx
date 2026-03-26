import { markets } from "@/lib/mockData";
import HomeClient from "./HomeClient";

export default function HomePage() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <HomeClient initialMarkets={markets} />
    </div>
  );
}
