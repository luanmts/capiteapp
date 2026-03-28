"use client";

/**
 * LiveChart — TradingView Lightweight Charts v5 wrapper para os mercados live.
 *
 * Alimentação:
 *  - `history`: array { t: ms, price: number } vindo do useLiveMarket (100ms interval)
 *  - `livePriceRef`: ref ao preço WS em tempo real (sem re-render extra)
 *  - `priceTobeat`: linha de referência (dashed) desenhada via createPriceLine
 *
 * O componente é client-only. Use dynamic import com { ssr: false } no pai:
 *   const LiveChart = dynamic(() => import("@/components/LiveChart"), { ssr: false })
 */

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts";

interface DataPoint {
  t: number;
  price: number;
}

interface LiveChartProps {
  history: DataPoint[];
  priceTobeat: number;
  lineColor?: string;
  usdRate?: number;
  livePriceRef?: React.RefObject<number>;
}

export default function LiveChart({
  history,
  priceTobeat,
  lineColor = "#f59e0b",
  usdRate = 1,
  livePriceRef,
}: LiveChartProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const chartRef      = useRef<IChartApi | null>(null);
  const seriesRef     = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLineRef  = useRef<IPriceLine | null>(null);
  const lastTimeRef   = useRef<UTCTimestamp>(0 as UTCTimestamp);
  const initializedRef = useRef(false);

  // ── Inicializa chart uma única vez ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const rate = usdRate;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.offsetWidth,
      height: 180,
      layout: {
        background:  { color: "transparent" },
        textColor:   "rgba(255,255,255,0.45)",
        fontFamily:  "monospace",
        fontSize:    11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible:   true,
        secondsVisible: true,
        tickMarkFormatter: (time: UTCTimestamp) => {
          const d = new Date(time * 1000);
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          const ss = String(d.getSeconds()).padStart(2, "0");
          return `${hh}:${mm}:${ss}`;
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.15)", labelBackgroundColor: "#333" },
        horzLine: { color: "rgba(255,255,255,0.15)", labelBackgroundColor: "#333" },
      },
      handleScroll: false,
      handleScale:  false,
    });

    chartRef.current = chart;

    // ── Série principal ──────────────────────────────────────────────────────
    const series = chart.addSeries(LineSeries, {
      color:      lineColor,
      lineWidth:  2,
      lineStyle:  LineStyle.Solid,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  5,
      priceFormat: {
        type:      "custom",
        formatter: (p: number) => {
          const v = p * rate;
          if (rate > 1) {
            if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2)}M`;
            if (v >= 1_000)     return `R$${(v / 1_000).toFixed(1)}k`;
            return `R$${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
          }
          return `$${Math.round(v).toLocaleString("en")}`;
        },
        minMove: 0.01,
      },
    });
    seriesRef.current = series;

    // ── Linha de referência (priceTobeat) ────────────────────────────────────
    priceLineRef.current = series.createPriceLine({
      price:                 priceTobeat,
      color:                 "rgba(255,255,255,0.35)",
      lineWidth:             1,
      lineStyle:             LineStyle.Dashed,
      axisLabelVisible:      true,
      title:                 "Ref",
      axisLabelColor:        "rgba(255,255,255,0.35)",
      axisLabelTextColor:    "rgba(255,255,255,0.7)",
    });

    // ── Populate inicial com histórico existente ──────────────────────────────
    if (history.length > 0) {
      const seen = new Map<number, number>();
      for (const pt of history) {
        const t = Math.floor(pt.t / 1000) as UTCTimestamp;
        seen.set(t, pt.price); // última cotação por segundo
      }
      const data = Array.from(seen.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
      series.setData(data);
      if (data.length > 0) lastTimeRef.current = data[data.length - 1].time;
      chart.timeScale().scrollToRealTime();
    }

    // ── Resize observer ──────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.offsetWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current    = null;
      seriesRef.current   = null;
      priceLineRef.current = null;
      initializedRef.current = false;
    };
  // Intencionalmente sem deps — inicializa uma só vez; updates via outros effects
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Atualiza série com cada novo ponto do histórico ──────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || history.length === 0) return;

    const last = history[history.length - 1];
    const t = Math.floor(last.t / 1000) as UTCTimestamp;

    // update() aceita mesmo t para atualizar o valor — lança se t < último time
    if (t >= lastTimeRef.current) {
      series.update({ time: t, value: last.price });
      lastTimeRef.current = t;
    }
  }, [history]);

  // ── Atualiza linha de referência quando priceTobeat muda ─────────────────
  useEffect(() => {
    if (priceLineRef.current) {
      priceLineRef.current.applyOptions({ price: priceTobeat });
    }
  }, [priceTobeat]);

  // ── RAF: puxa livePriceRef diretamente para suavizar entre ticks do history
  useEffect(() => {
    if (!livePriceRef) return;
    const ref = livePriceRef;
    let rafId: number;
    let lastRafTime = 0;

    function frame(now: number) {
      // Throttle: no máximo 1 update de RAF por segundo (evita conflito com history)
      // A lógica principal de update vem do useEffect[history] — RAF só preenche entre ticks
      const series = seriesRef.current;
      const price  = ref.current;
      if (series && price != null && price > 0 && now - lastRafTime >= 200) {
        const t = Math.floor(Date.now() / 1000) as UTCTimestamp;
        if (t >= lastTimeRef.current) {
          series.update({ time: t, value: price });
          lastTimeRef.current = t;
          lastRafTime = now;
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePriceRef]);

  // ── Atualiza formatador quando usdRate muda ───────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || usdRate === 1) return;
    const rate = usdRate;
    series.applyOptions({
      priceFormat: {
        type:      "custom",
        formatter: (p: number) => {
          const v = p * rate;
          if (rate > 1) {
            if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2)}M`;
            if (v >= 1_000)     return `R$${(v / 1_000).toFixed(1)}k`;
            return `R$${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
          }
          return `$${Math.round(v).toLocaleString("en")}`;
        },
        minMove: 0.01,
      },
    });
  }, [usdRate]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 180 }}
      className="rounded-sm overflow-hidden"
    />
  );
}
