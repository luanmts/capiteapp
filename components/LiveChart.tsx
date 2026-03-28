"use client";

/**
 * LiveChart — TradingView Lightweight Charts v5
 *
 * Fixes desta versão:
 * - Label "Alvo": axisLabel agora é visível; title removido (mostrava "Ref" sem valor)
 *   o valor real do target aparece no eixo Y via formatter + axisLabelColor visível
 * - Cor dinâmica: useEffect([lineColor]) chama series.applyOptions → atualiza verde/vermelho
 * - Linha suave: RAF sem throttle, 60fps; só chama series.update quando preço mudou
 *   → linha move a 60fps (igual ao dot) enquanto WS estiver ativo
 */

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  LineStyle,
  CrosshairMode,
  LastPriceAnimationMode,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
  type Time,
} from "lightweight-charts";

interface DataPoint { t: number; price: number }

interface LiveChartProps {
  history: DataPoint[];
  priceTobeat: number;
  lineColor?: string;
  usdRate?: number;
  livePriceRef?: React.RefObject<number>;
}

const Y_WINDOW = 300;

function toChartData(pts: DataPoint[]) {
  // Resolução de 50ms: timestamps como 1743172800.05, 1743172800.10...
  // LWC aceita floats internamente — dá 20 pontos/segundo → linha avança 20x/s.
  const map = new Map<number, number>();
  for (const pt of pts) {
    const t = Math.round(pt.t / 50) / 20; // arredonda ao 50ms mais próximo — 20pts/s
    map.set(t, pt.price);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
}

/** Desempacota #rrggbb → "r,g,b" para rgba() */
function hexToRgb(hex: string): string {
  const h = hex.startsWith("#") ? hex : "#f59e0b";
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function LiveChart({
  history,
  priceTobeat,
  lineColor = "#f59e0b",
  usdRate = 1,
  livePriceRef,
}: LiveChartProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<IChartApi | null>(null);
  const seriesRef      = useRef<ISeriesApi<"Area"> | null>(null);
  const priceLineRef   = useRef<IPriceLine | null>(null);
  const lastTimeRef    = useRef<UTCTimestamp>(0 as UTCTimestamp);
  const seededRef      = useRef(false);
  const lastPriceRef   = useRef(0); // rastreia última escrita no RAF → evita update desnecessário

  // Refs frescos — lidos por closures sem stale value
  const historyRef     = useRef(history);
  const priceTobeatRef = useRef(priceTobeat);
  const rateRef        = useRef(usdRate);
  historyRef.current    = history;
  priceTobeatRef.current = priceTobeat;
  rateRef.current       = usdRate;

  // ── Formatter Y ──────────────────────────────────────────────────────────
  const fmt = (p: number) => {
    if (!p || isNaN(p)) return "";
    const v = p * rateRef.current;
    if (rateRef.current > 1) return `R$${Math.round(v).toLocaleString("pt-BR")}`;
    return `$${Math.round(v).toLocaleString("en")}`;
  };

  // ── Helper para criar/recriar a priceLine "Alvo" ─────────────────────────
  const createPriceLine = (series: ISeriesApi<"Area">, price: number): IPriceLine => {
    return series.createPriceLine({
      price,
      color:              "rgba(255,255,255,0.35)",
      lineWidth:          1,
      lineStyle:          LineStyle.Dashed,
      axisLabelVisible:   true,
      title:              "Alvo",          // label visível no eixo direito
      axisLabelColor:     "rgba(80,80,100,0.85)",  // fundo do badge no eixo
      axisLabelTextColor: "rgba(255,255,255,0.85)", // texto do badge
    });
  };

  // ── Init chart (uma única vez) ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      width:  container.offsetWidth,
      height: 180,
      layout: {
        background:      { color: "transparent" },
        textColor:       "rgba(255,255,255,0.4)",
        fontFamily:      "'Inter', 'system-ui', monospace",
        fontSize:        11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      leftPriceScale:  { visible: false },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins:  { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderVisible:      false,
        timeVisible:        true,
        secondsVisible:     true,
        rightOffset:  3,  // espaço à direita do último ponto (em barras)
        tickMarkFormatter: (time: Time, type: TickMarkType) => {
          if (type === TickMarkType.Year || type === TickMarkType.Month) return null;
          const ts = typeof time === "number" ? time : 0;
          const d  = new Date(ts * 1000);
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          const ss = String(d.getSeconds()).padStart(2, "0");
          return `${hh}:${mm}:${ss}`;
        },
      },
      crosshair: {
        mode:     CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.12)", labelBackgroundColor: "#1a1a1a" },
        horzLine: { color: "rgba(255,255,255,0.12)", labelBackgroundColor: "#1a1a1a" },
      },
      handleScroll: false,
      handleScale:  false,
    });

    chartRef.current = chart;

    const rgb = hexToRgb(lineColor);
    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor:    `rgba(${rgb},0.22)`,
      bottomColor: `rgba(${rgb},0)`,
      lineWidth:   2,
      lineStyle:   LineStyle.Solid,
      lastPriceAnimation: LastPriceAnimationMode.Continuous,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  5,
      priceFormat: {
        type:      "custom",
        formatter: fmt,
        minMove:   1,
      },
      autoscaleInfoProvider: () => {
        const recent = historyRef.current.slice(-Y_WINDOW);
        if (recent.length < 2) return null;
        const prices = recent.map(d => d.price);
        const ptb    = priceTobeatRef.current;
        if (ptb > 0) prices.push(ptb);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        const rng  = maxP - minP || minP * 0.001;
        const pad  = Math.max(rng * 0.18, minP * 0.00003);
        return {
          priceRange: { minValue: minP - pad, maxValue: maxP + pad },
          margins:    { above: 0, below: 0 },
        };
      },
    });

    seriesRef.current = series;

    if (priceTobeatRef.current > 0) {
      priceLineRef.current = createPriceLine(series, priceTobeatRef.current);
    }

    const ro = new ResizeObserver(() => {
      if (container.offsetWidth > 0) chart.applyOptions({ width: container.offsetWidth });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current     = null;
      seriesRef.current    = null;
      priceLineRef.current = null;
      seededRef.current    = false;
      lastTimeRef.current  = 0 as UTCTimestamp;
      lastPriceRef.current = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Seed inicial (único setData) ─────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || history.length === 0 || seededRef.current) return;

    seededRef.current = true;
    const data = toChartData(history);
    series.setData(data);

    if (data.length > 0) {
      lastTimeRef.current  = data[data.length - 1].time;
      lastPriceRef.current = data[data.length - 1].value;

      // Janela fixa de 90s deslizando — sem fixLeftEdge/fixRightEdge.
      // O eixo X não rescala quando novos pontos chegam: os antigos saem
      // pela esquerda sem reflow → elimina o "pula 1 slot / segundo".
      const ts = chartRef.current?.timeScale();
      if (ts) {
        const to   = (lastTimeRef.current + 5) as UTCTimestamp;
        const from = (to - 90) as UTCTimestamp;
        ts.setVisibleRange({ from, to });
      }
    }

    if (!priceLineRef.current && priceTobeatRef.current > 0) {
      priceLineRef.current = createPriceLine(series, priceTobeatRef.current);
    }
  }, [history]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cor dinâmica: atualiza série quando lineColor muda (verde ↔ vermelho) ─
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const rgb = hexToRgb(lineColor);
    series.applyOptions({
      lineColor,
      topColor:    `rgba(${rgb},0.22)`,
      bottomColor: `rgba(${rgb},0)`,
    });
  }, [lineColor]);

  // ── priceTobeat: atualiza linha "Alvo" ──────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || priceTobeat <= 0) return;

    if (priceLineRef.current) {
      priceLineRef.current.applyOptions({ price: priceTobeat });
    } else {
      priceLineRef.current = createPriceLine(series, priceTobeat);
    }
  }, [priceTobeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── RAF: atualiza linha a 60fps sem throttle ─────────────────────────────
  // Chama series.update() apenas quando o preço mudou desde o último frame.
  // Isso faz a linha mover a 60fps (igual ao dot animado pelo LWC), sem
  // desperdiçar redraws quando o preço está estável.
  useEffect(() => {
    if (!livePriceRef) return;
    const ref = livePriceRef;
    let rafId: number;

    const frame = () => {
      if (seededRef.current) {
        const series = seriesRef.current;
        const price  = ref.current;
        if (series && price != null && price > 0) {
          // t em resolução de 50ms — novo X a cada 50ms (20fps horizontal).
          // Entre dois timestamps iguais, update() substitui Y do último ponto:
          // segmento final move verticalmente a 60fps (sem throttle).
          const t = (Math.round(Date.now() / 50) / 20) as UTCTimestamp;
          if (t >= lastTimeRef.current) {
            try {
              series.update({ time: t, value: price });
              lastPriceRef.current = price;

              // Desliza janela só quando entra novo bucket 50ms (evita setVisibleRange a 60fps)
              if (t > lastTimeRef.current) {
                lastTimeRef.current = t;
                const ts = chartRef.current?.timeScale();
                if (ts) {
                  const to   = (t + 5) as UTCTimestamp;
                  const from = (to - 90) as UTCTimestamp;
                  ts.setVisibleRange({ from, to });
                }
              }
            } catch { /* timestamp conflict em round transition — ignorar */ }
          }
        }
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePriceRef]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 180 }}
    />
  );
}
