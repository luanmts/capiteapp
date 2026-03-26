"use client";

import { useState } from "react";
import clsx from "clsx";

interface Point {
  t: number;
  sim: number; // 0–100
}

const FILTERS = ["1H", "6H", "1D", "1S", "1M", "Tudo"] as const;
type Filter = (typeof FILTERS)[number];

// How many daily points to show per filter
const SLICE: Record<Filter, number> = {
  "1H": 3,
  "6H": 3,
  "1D": 5,
  "1S": 7,
  "1M": 30,
  Tudo: 9999,
};

// Fixed anchor: last point is 2026-03-24, going back 77 days.
// Using a hardcoded date avoids server/client Date.now() mismatch (hydration error).
const ANCHOR_MS = new Date("2026-03-24T00:00:00Z").getTime();

function genHistory(): Point[] {
  const pts: Point[] = [];
  let sim = 50;
  const DAYS = 77;
  // Use a seeded-style deterministic walk so server and client produce identical output.
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = DAYS; i >= 0; i--) {
    const progress = (DAYS - i) / DAYS;
    const target = 50 + 4 * progress;
    sim += (target - sim) * 0.06 + (rand() - 0.48) * 1.6;
    sim = Math.max(28, Math.min(72, sim));
    pts.push({ t: ANCHOR_MS - i * 86_400_000, sim: +sim.toFixed(1) });
  }
  pts[pts.length - 1].sim = 54;
  return pts;
}

const HISTORY = genHistory();

interface PercentChartProps {
  simPercent: number;
  naoPercent: number;
}

export default function PercentChart({ simPercent, naoPercent }: PercentChartProps) {
  const [filter, setFilter] = useState<Filter>("Tudo");

  const data = HISTORY.slice(-Math.min(SLICE[filter], HISTORY.length));

  // SVG dimensions
  const W = 1000;
  const H = 200;
  const PAD = { top: 16, right: 52, bottom: 28, left: 8 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const simVals = data.map((d) => d.sim);
  const naoVals = data.map((d) => 100 - d.sim);
  const allVals = [...simVals, ...naoVals];
  const minV = Math.max(0, Math.min(...allVals) - 4);
  const maxV = Math.min(100, Math.max(...allVals) + 4);
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v: number) => PAD.top + (1 - (v - minV) / range) * cH;

  const simPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.sim).toFixed(1)}`)
    .join(" ");
  const naoPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(100 - d.sim).toFixed(1)}`)
    .join(" ");

  const lastX = toX(data.length - 1);
  const lastSimY = toY(data[data.length - 1].sim);
  const lastNaoY = toY(100 - data[data.length - 1].sim);

  // Y-axis tick marks
  const yTicks = [maxV, (maxV + minV) / 2, minV];

  // X-axis: first and last date
  const fmtDate = (t: number) =>
    new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-green-400">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
          Sim: {simPercent}%
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
          Não: {naoPercent}%
        </span>
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: 160 }}
      >
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={toY(v)}
            x2={PAD.left + cW}
            y2={toY(v)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        ))}

        {/* 50% reference dashed */}
        {minV < 50 && maxV > 50 && (
          <>
            <line
              x1={PAD.left}
              y1={toY(50)}
              x2={PAD.left + cW}
              y2={toY(50)}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={1}
              strokeDasharray="5 4"
            />
            <text
              x={PAD.left + cW + 4}
              y={toY(50) + 4}
              fill="rgba(255,255,255,0.35)"
              fontSize={10}
              fontFamily="monospace"
            >
              50%
            </text>
          </>
        )}

        {/* Y labels */}
        {yTicks.map((v, i) => (
          <text
            key={i}
            x={PAD.left + cW + 4}
            y={toY(v) + 4}
            fill="rgba(255,255,255,0.25)"
            fontSize={9}
            fontFamily="monospace"
          >
            {Math.round(v)}%
          </text>
        ))}

        {/* Não line */}
        <path d={naoPath} fill="none" stroke="#f87171" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={lastX} cy={lastNaoY} r={4} fill="#f87171" />

        {/* Sim line (on top) */}
        <path d={simPath} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={lastX} cy={lastSimY} r={4} fill="#4ade80" />

        {/* X labels */}
        {data.length > 1 && (
          <>
            <text
              x={toX(0)}
              y={H - 6}
              fill="rgba(255,255,255,0.28)"
              fontSize={10}
              textAnchor="start"
              fontFamily="monospace"
            >
              {fmtDate(data[0].t)}
            </text>
            <text
              x={toX(data.length - 1)}
              y={H - 6}
              fill="rgba(255,255,255,0.28)"
              fontSize={10}
              textAnchor="end"
              fontFamily="monospace"
            >
              {fmtDate(data[data.length - 1].t)}
            </text>
          </>
        )}
      </svg>

      {/* Time filters */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.04]">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              filter === f
                ? "bg-white text-gray-900"
                : "text-text-tint hover:text-white hover:bg-white/5"
            )}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
