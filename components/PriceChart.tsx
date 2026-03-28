"use client";

import React, { useRef, useEffect } from "react";

interface DataPoint {
  t: number;
  price: number;
}

interface PriceChartProps {
  history: DataPoint[];
  priceTobeat: number;
  lineColor?: string;
  usdRate?: number; // BRL/USD para display. 1 = exibe em USD
  /** Ref ao preço live do WS — permite animação RAF a 60fps sem re-render React */
  livePriceRef?: React.RefObject<number>;
}

/** Formata um valor USD para exibição no eixo Y (labels laterais — pode abreviar). */
function fmtLabel(usd: number, rate: number): string {
  const v = usd * rate;
  if (rate > 1) {
    if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000)     return `R$${(v / 1_000).toFixed(1)}k`;
    return `R$${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
  }
  return `$${Math.round(v).toLocaleString("en")}`;
}

/**
 * Resample: sempre retorna exatamente n pontos espaçados uniformemente.
 * Garante que os paths SVG têm sempre o mesmo número de comandos L → CSS d-transition funciona.
 */
function resample(data: DataPoint[], n: number): DataPoint[] {
  if (data.length === 0) return [];
  if (data.length <= n)  return data;
  return Array.from({ length: n }, (_, i) => {
    const idx = Math.round(i * (data.length - 1) / (n - 1));
    return data[Math.min(idx, data.length - 1)];
  });
}

const N_DISPLAY = 60;  // pontos renderizados — fixo para morphing CSS funcionar
const Y_WINDOW  = 300; // últimos N pontos usados para cálculo do range Y
                       // com polling 100ms: 300 pts = 30s de janela real

function PriceChartInner({ history, priceTobeat, lineColor = "#f59e0b", usdRate = 1, livePriceRef }: PriceChartProps) {
  // Refs para animação RAF do dot (todos declarados antes de qualquer early return)
  const dotInnerRef     = useRef<SVGCircleElement>(null);
  const dotOuterRef     = useRef<SVGCircleElement>(null);
  // Escala Y atual — atualizada a cada render, lida pelo RAF loop
  const scaleRef        = useRef({ minP: 0, range: 1, chartH: 180, padTop: 12, lastX: 920 });
  // Preço interpolado que o dot exibe — inicia null até o primeiro render com dados
  const displayedPriceRef = useRef<number | null>(null);

  // RAF loop: lê livePriceRef diretamente, interpola e move o dot a 60fps
  useEffect(() => {
    if (!livePriceRef) return;
    const ref = livePriceRef; // captura para narrowing dentro do closure
    let rafId: number;

    function frame() {
      const target = ref.current;
      if (target != null && target > 0) {
        // Inicializa displayedPriceRef na primeira vez que temos um target válido
        if (displayedPriceRef.current === null) displayedPriceRef.current = target;

        // Lerp 18% por frame (~60fps) → converge ~200ms
        const prev = displayedPriceRef.current;
        const next = prev + (target - prev) * 0.18;
        displayedPriceRef.current = next;

        const { minP, range, chartH, padTop, lastX } = scaleRef.current;
        const cy = padTop + (1 - (next - minP) / range) * chartH;
        const cyStr = cy.toFixed(1);
        const cxStr = lastX.toFixed(1);

        dotInnerRef.current?.setAttribute("cy", cyStr);
        dotInnerRef.current?.setAttribute("cx", cxStr);
        dotOuterRef.current?.setAttribute("cy", cyStr);
        dotOuterRef.current?.setAttribute("cx", cxStr);
      }
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  // livePriceRef é uma ref estável — só recria o loop se a prop mudar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePriceRef]);

  // ── Early return após todos os hooks ─────────────────────────────────────────
  if (history.length < 2) {
    return (
      <div className="h-44 flex items-center justify-center text-text-tint text-sm">
        Carregando dados...
      </div>
    );
  }

  const W = 1000;
  const H = 220;
  const PAD = { top: 12, right: 80, bottom: 28, left: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // ── Y Range: sliding window dos últimos Y_WINDOW pontos + priceTobeat ──────
  const rawPrices       = history.map((d) => d.price);
  const windowPrices    = rawPrices.slice(-Y_WINDOW);
  const currentP        = rawPrices[rawPrices.length - 1];
  const allWindowPrices = [...windowPrices, priceTobeat];
  const rawMin  = Math.min(...allWindowPrices);
  const rawMax  = Math.max(...allWindowPrices);
  const winRange = rawMax - rawMin || 1;
  const pad  = Math.max(winRange * 0.15, currentP * 0.00002);
  const minP = rawMin - pad;
  const maxP = rawMax + pad;
  const range = maxP - minP || 1;

  // ── Linha e área: resample fixo para CSS d-transition funcionar ─────────────
  const display = resample(history, N_DISPLAY);
  const toX = (i: number) => PAD.left + (i / (display.length - 1)) * chartW;
  const toY = (p: number) => PAD.top + (1 - (p - minP) / range) * chartH;

  const linePath = display
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`)
    .join(" ");

  const areaPath = [
    ...display.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`),
    `L ${toX(display.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
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
  const xIdxs  = [0, Math.floor(display.length / 2), display.length - 1];
  const xLabels = xIdxs.map((i) => ({
    x:     toX(i),
    label: new Date(display[i].t).toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }),
  }));

  const lastX   = toX(display.length - 1);
  const lastY   = toY(display[display.length - 1].price);
  const isAbove = currentP >= priceTobeat;

  // Atualiza escala para o RAF loop usar nas próximas frames
  scaleRef.current = { minP, range, chartH, padTop: PAD.top, lastX };

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
        <line key={i} x1={PAD.left} y1={l.y} x2={PAD.left + chartW} y2={l.y}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}

      {/* Target (price-to-beat) dashed line — só renderiza se estiver no range visível */}
      {targetY >= PAD.top && targetY <= PAD.top + chartH && (
        <>
          <line x1={PAD.left} y1={targetY} x2={PAD.left + chartW} y2={targetY}
            stroke="rgba(255,255,255,0.28)" strokeWidth={1} strokeDasharray="6 4" />
          <text x={PAD.left + chartW + 4} y={targetY + 4}
            fill="rgba(255,255,255,0.45)" fontSize={10} fontFamily="monospace">
            Ref
          </text>
        </>
      )}

      {/* Area fill */}
      <path d={areaPath} fill="url(#pcGrad)" style={{ transition: "d 0.12s linear" }} />

      {/* Price line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2.5}
        strokeLinejoin="round" style={{ transition: "d 0.12s linear" }} />

      {/* Current price dot — cx/cy controlados pelo RAF loop via refs */}
      <circle ref={dotOuterRef} cx={lastX} cy={lastY} r={8} fill={lineColor} fillOpacity={0.15} />
      <circle ref={dotInnerRef} cx={lastX} cy={lastY} r={4} fill={lineColor} />

      {/* Direction indicator — atualizado pelo React (10fps é suficiente para texto) */}
      <text x={lastX + 10} y={lastY + 4}
        fill={isAbove ? "#4ade80" : "#f87171"} fontSize={11}
        fontWeight="bold" fontFamily="monospace">
        {isAbove ? "▲" : "▼"}
      </text>

      {/* Y-axis price labels */}
      {yLabels.map((l, i) => (
        <text key={i} x={PAD.left + chartW + 4} y={l.y + 4}
          fill="rgba(255,255,255,0.32)" fontSize={10} fontFamily="monospace">
          {fmtLabel(l.price, usdRate)}
        </text>
      ))}

      {/* X-axis time labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 6} fill="rgba(255,255,255,0.28)" fontSize={10}
          textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
          fontFamily="monospace">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

// Re-renderiza quando: histórico cresceu, target/cor/rate mudaram
export default React.memo(PriceChartInner, (prev, next) => {
  if (prev.priceTobeat !== next.priceTobeat) return false;
  if (prev.lineColor   !== next.lineColor)   return false;
  if (prev.usdRate     !== next.usdRate)     return false;
  if (prev.history.length !== next.history.length) return false;
  const lp = prev.history[prev.history.length - 1];
  const ln = next.history[next.history.length - 1];
  return lp?.price === ln?.price;
});
