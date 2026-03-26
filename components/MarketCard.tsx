"use client";

import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { Users } from "lucide-react";
import { Market, GroupedMarket } from "@/types";
import { getCategoryColor, formatVolume, formatPercent } from "@/utils/formatters";
import LiveBadge from "./LiveBadge";
import Timer from "./Timer";
import OddsDisplay from "./OddsDisplay";

interface MarketCardProps {
  market: Market | GroupedMarket;
}

function isGrouped(market: Market | GroupedMarket): market is GroupedMarket {
  return "isGrouped" in market && market.isGrouped === true;
}

export default function MarketCard({ market }: MarketCardProps) {
  const grouped = isGrouped(market);
  const categoryColorClass = getCategoryColor(market.category);

  return (
    <Link href={`/market/${market.slug}`} className="block group">
      <div
        className={clsx(
          "bg-card border border-white/[0.06] rounded-xl p-4 h-full",
          "hover:border-white/[0.14] hover:bg-white/[0.02]",
          "transition-all duration-200 cursor-pointer",
          "flex flex-col gap-3"
        )}
      >
        {/* Status row — topo: AO VIVO / Timer + Categoria */}
        <div className="flex items-center gap-2">
          {market.live === 1 ? (
            <LiveBadge className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20" />
          ) : (
            <Timer
              closesAt={market.closesAt}
              showIcon
              className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]"
            />
          )}
          <span
            className={clsx(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
              categoryColorClass
            )}
          >
            {market.category}
          </span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2.5">
          {market.imageUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 mt-0.5">
              <Image
                src={market.imageUrl}
                alt={market.title}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          ) : market.icon ? (
            <span className="text-2xl leading-none shrink-0 mt-0.5">{market.icon}</span>
          ) : null}
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-white/90 transition-colors">
            {market.title}
          </h3>
        </div>

        {/* Selections or Groups */}
        <div className="flex-1 flex flex-col gap-2">
          {grouped ? (
            <div className="space-y-2">
              {market.groups.slice(0, 3).map((group) => (
                <div key={group.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tint truncate max-w-[65%]">
                      {group.icon && <span className="mr-1">{group.icon}</span>}
                      {group.title}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {formatPercent(group.percent)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-medium rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${group.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {market.selections.slice(0, 3).map((selection, index) => (
                <OddsDisplay
                  key={selection.id}
                  selection={selection}
                  index={index}
                  compact
                />
              ))}
              {market.selections.length > 3 && (
                <span className="text-xs text-text-tint pl-1">
                  +{market.selections.length - 3} opções
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer: Volume + matching system */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-1 text-text-tint">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-medium">{formatVolume(market.volume)}</span>
          </div>
          <span className="text-[10px] text-text-tint/60 font-medium uppercase tracking-wide">
            {market.matchingSystem === "binary"
              ? "Binário"
              : market.matchingSystem === "multiple"
              ? "Múltiplo"
              : "Range"}
          </span>
        </div>
      </div>
    </Link>
  );
}
