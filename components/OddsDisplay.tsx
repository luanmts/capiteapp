import clsx from "clsx";
import { Selection } from "@/types";
import { formatOdd, formatPercent } from "@/utils/formatters";

interface OddsDisplayProps {
  selection: Selection;
  index: number;
  showOdd?: boolean;
  compact?: boolean;
}

export default function OddsDisplay({
  selection,
  index,
  showOdd = true,
  compact = false,
}: OddsDisplayProps) {
  const isPositive = selection.percent >= 50;
  // Use index fallback: 0 = green (favored), 1+ = red (underdog)
  const isGreen = isPositive || index === 0;

  return (
    <div
      className={clsx(
        "flex items-center justify-between rounded-lg border transition-all",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
        isGreen
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/35"
          : "bg-primary-red/5 border-primary-red/20 hover:bg-primary-red/10 hover:border-primary-red/30"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {selection.icon && (
          <span className="text-sm shrink-0">{selection.icon}</span>
        )}
        <span
          className={clsx(
            "font-medium truncate",
            compact ? "text-xs" : "text-sm",
            "text-white"
          )}
        >
          {selection.label}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {showOdd && (
          <span className="text-xs text-text-tint font-medium">
            {typeof selection.odd === "number" ? formatOdd(selection.odd) : "–"}
          </span>
        )}
        <span
          className={clsx(
            "text-xs font-bold px-2 py-0.5 rounded-full border",
            isGreen
              ? "text-primary bg-primary/10 border-primary/25"
              : "text-primary-red bg-primary-red/10 border-primary-red/25"
          )}
        >
          {formatPercent(selection.percent)}
        </span>
      </div>
    </div>
  );
}
