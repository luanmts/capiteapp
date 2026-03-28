"use client";

import React from "react";

interface DataPoint {
  t: number;
  price: number;
}

interface PriceChartProps {
  history: DataPoint[];
  priceTobeat: number;
  lineColor?: string; // dynamic: green when up, red when down
}

function PriceChartInner({ history, priceTobeat, lineColor = "#f59e0b" }: PriceChartProps) {
  if (history.length < 2) {
    return (
      <div className="h-44 flex items-center justify-center text-text-tint text-sm">
        Carregando dados...
      </div>
    );
  }

  const W = 1000;
  const H = 220;
  const PAD = { top: 12, right: 72, bottom: 28, left: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const prices = history.map((d) => d.price);
  const allPrices = [...prices, priceTobeat];
  const minP = Math.min(...allPrices) - 18;
  const maxP = Math.max(...allPrices) + 18;
  const range = maxP - minP || 1;

  const toX = (i: number) => PAD.left + (i / (history.length - 1)) * chartW;
  const toY = (p: number) => PAD.top + (1 - (p - minP) / range) * chartH;

  const linePath = history
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`)
    .join(" ");

  const areaPath = [
    ...history.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`),
    `L ${toX(history.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
    `L ${PAD.left} ${(PAD.top + chartH).toFixed(1)}`,
    "Z",
  ].join(" ");

  const targetY = toY(priceTobeat);

  // 4 evenly spaced Y labels
  const yLabels = [0, 0.33, 0.66, 1].map((r) => ({
    price: minP + r * range,
    y: PAD.top + (1 - r) * chartH,
  }));

  // 3 X-axis time markers
  const xIdxs = [0, Math.floor(history.length / 2), history.length - 1];
  const xLabels = xIdxs.map((i) => ({
    x: toX(i),
    label: new Date(history[i].t).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }));

  const lastX = toX(history.length - 1);
  const lastY = toY(history[history.length - 1].price);
  const isAbove = history[history.length - 1].price >= priceTobeat;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: 180 }}
    >
      <defs>
        <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((l, i) => (
        <line
          key={i}
          x1={PAD.left}
          y1={l.y}
          x2={PAD.left + chartW}
          y2={l.y}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      ))}

      {/* Target (price-to-beat) dashed line */}
      <line
        x1={PAD.left}
        y1={targetY}
        x2={PAD.left + chartW}
        y2={targetY}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1}
        strokeDasharray="6 4"
      />
      <text
        x={PAD.left + chartW + 4}
        y={targetY + 4}
        fill="rgba(255,255,255,0.45)"
        fontSize={10}
        fontFamily="monospace"
      >
        Target
      </text>

      {/* Area fill */}
      <path d={areaPath} fill="url(#pcGrad)" />

      {/* Price line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" />

      {/* Current price dot + pulse ring */}
      <circle cx={lastX} cy={lastY} r={8} fill={lineColor} fillOpacity={0.15} />
      <circle cx={lastX} cy={lastY} r={4} fill={lineColor} />

      {/* Delta indicator next to dot */}
      <text
        x={lastX + 10}
        y={lastY + 4}
        fill={isAbove ? "#4ade80" : "#f87171"}
        fontSize={11}
        fontWeight="bold"
        fontFamily="monospace"
      >
        {isAbove ? "▲" : "▼"}
      </text>

      {/* Y-axis price labels */}
      {yLabels.map((l, i) => (
        <text
          key={i}
          x={PAD.left + chartW + 4}
          y={l.y + 4}
          fill="rgba(255,255,255,0.32)"
          fontSize={10}
          fontFamily="monospace"
        >
          ${Math.round(l.price).toLocaleString("en")}
        </text>
      ))}

      {/* X-axis time labels */}
      {xLabels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={H - 6}
          fill="rgba(255,255,255,0.28)"
          fontSize={10}
          textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
          fontFamily="monospace"
        >
          {l.label}
        </text>
      ))}
    </svg>
  );
}

// Só re-renderiza quando o histórico cresceu, o target mudou ou a cor da linha mudou.
// Evita recálculo do SVG a cada update de preço/timer.
export default React.memo(PriceChartInner, (prev, next) => {
  if (prev.priceTobeat !== next.priceTobeat) return false;
  if (prev.lineColor   !== next.lineColor)   return false;
  if (prev.history.length !== next.history.length) return false;
  const lastPrev = prev.history[prev.history.length - 1];
  const lastNext = next.history[next.history.length - 1];
  return lastPrev?.price === lastNext?.price;
});
