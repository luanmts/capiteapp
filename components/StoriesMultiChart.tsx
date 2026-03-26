"use client";

import { useState } from "react";
import clsx from "clsx";

interface RangeSel {
  label: string;
  percent: number;
  color: string;
}

interface Props {
  selections: RangeSel[];
}

const FILTERS = ["1H", "6H", "1D", "1S", "1M", "Tudo"] as const;
type Filter = (typeof FILTERS)[number];

const POINTS: Record<Filter, number> = {
  "1H": 4, "6H": 7, "1D": 10, "1S": 14, "1M": 30, Tudo: 60,
};

// LCG seeded random — deterministic on server and client
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function genHistory(selections: RangeSel[], nPoints: number): number[][] {
  const rand = lcg(42);
  const n = selections.length;
  // Work backwards from current values
  const rows: number[][] = [];
  let cur = selections.map((s) => s.percent);

  for (let i = 0; i < nPoints; i++) {
    rows.unshift([...cur]);
    const raw = cur.map((v) => Math.max(1, v + (rand() - 0.5) * 8));
    const total = raw.reduce((a, b) => a + b, 0);
    cur = raw.map((v) => (v / total) * 100);
  }
  return rows;
}

export default function StoriesMultiChart({ selections }: Props) {
  const [filter, setFilter] = useState<Filter>("Tudo");
  const nPoints = POINTS[filter];
  const history = genHistory(selections, nPoints);
  const W = 400;
  const H = 140;
  const pad = { t: 8, r: 36, b: 20, l: 4 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  // Build SVG polyline for each selection
  const lines = selections.map((sel, si) => {
    const pts = history.map((row, xi) => {
      const x = pad.l + (xi / (history.length - 1)) * innerW;
      const y = pad.t + innerH - (row[si] / 100) * innerH;
      return `${x},${y}`;
    });
    return { color: sel.color, pts: pts.join(" "), last: history[history.length - 1][si] };
  });

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {selections.map((sel) => (
          <div key={sel.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sel.color }} />
            <span className="text-[11px] text-text-tint">
              {sel.label}:{" "}
              <span className="font-semibold text-white">{sel.percent}%</span>
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: H }}
          preserveAspectRatio="none"
        >
          {/* Horizontal guide lines */}
          {[25, 50, 75].map((pct) => {
            const y = pad.t + innerH - (pct / 100) * innerH;
            return (
              <g key={pct}>
                <line
                  x1={pad.l} y1={y} x2={W - pad.r} y2={y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                />
                <text x={W - pad.r + 3} y={y + 3} fontSize="7" fill="rgba(255,255,255,0.25)">
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Lines */}
          {lines.map(({ color, pts, last }, i) => (
            <g key={i}>
              <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.9}
              />
              {/* End dot */}
              {history.length > 0 && (() => {
                const lastPts = pts.split(" ");
                const [lx, ly] = lastPts[lastPts.length - 1].split(",").map(Number);
                return (
                  <circle cx={lx} cy={ly} r="2.5" fill={color} />
                );
              })()}
            </g>
          ))}
        </svg>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
              filter === f
                ? "bg-primary text-white"
                : "text-text-tint hover:text-white"
            )}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
