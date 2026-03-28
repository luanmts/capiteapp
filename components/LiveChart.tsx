"use client";

/**
 * LiveChart — TradingView Lightweight Charts v5
 *
 * Fixes nesta versão:
 * - attributionLogo: false → remove o ícone TradingView do canto inferior esquerdo
 * - formatter Y sem abreviação → R$501.234 em vez de R$501k
 * - secondsVisible: true + tickMarkFormatter → eixo X em HH:MM:SS
 * - updates pós-seed via RAF exclusivamente (100ms) → elimina "trava→anda→trava"
 *   que vinha da irregularidade dos useEffect[history] disparados junto com o React render
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

const Y_WINDOW = 300; // últimos N pontos para range local (~30s @ 100ms)

function toChartData(pts: DataPoint[]) {
  const map = new Map<number, number>();
  for (const pt of pts) map.set(Math.floor(pt.t / 1000), pt.price);
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
}

export default function LiveChart({
  history,
  priceTobeat,
  lineColor = "#f59e0b",
  usdRate = 1,
  livePriceRef,
}: LiveChartProps) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const chartRef        = useRef<IChartApi | null>(null);
  const seriesRef       = useRef<ISeriesApi<"Area"> | null>(null);
  const priceLineRef    = useRef<IPriceLine | null>(null);
  const lastTimeRef     = useRef<UTCTimestamp>(0 as UTCTimestamp);
  const seededRef       = useRef(false);

  // Refs sempre frescos — lidos em closures sem stale value
  const historyRef      = useRef(history);
  const priceTobeatRef  = useRef(priceTobeat);
  const rateRef         = useRef(usdRate);
  historyRef.current    = history;
  priceTobeatRef.current = priceTobeat;
  rateRef.current       = usdRate;

  // ── Formatter Y (eixo direito) ───────────────────────────────────────────
  // Valor completo sem abreviação: R$501.234 em vez de R$501k
  const fmt = (p: number) => {
    if (!p || isNaN(p)) return "";
    const v = p * rateRef.current;
    if (rateRef.current > 1) {
      // pt-BR: ponto como separador de milhar, sem decimais
      return `R$${Math.round(v).toLocaleString("pt-BR")}`;
    }
    return `$${Math.round(v).toLocaleString("en")}`;
  };

  // ── Init chart (uma única vez no mount) ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const hex = lineColor.startsWith("#") ? lineColor : "#f59e0b";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const chart = createChart(container, {
      width:  container.offsetWidth,
      height: 180,
      layout: {
        background:       { color: "transparent" },
        textColor:        "rgba(255,255,255,0.4)",
        fontFamily:       "'Inter', 'system-ui', monospace",
        fontSize:         11,
        // ← remove o ícone "TradingView" do canto inferior esquerdo
        attributionLogo:  false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      leftPriceScale:  { visible: false }, // garante que não fica nenhuma escala à esq.
      rightPriceScale: {
        borderVisible: false,
        scaleMargins:  { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderVisible:   false,
        timeVisible:     true,
        secondsVisible:  true,  // ← habilita resolução de segundos no eixo X
        fixLeftEdge:     true,
        fixRightEdge:    true,
        // Formatter do eixo X → sempre HH:MM:SS
        tickMarkFormatter: (time: Time, type: TickMarkType) => {
          // Ignorar tick marks de alto nível (ano, mês, dia) — mostra só hora
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

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor:    `rgba(${r},${g},${b},0.22)`,
      bottomColor: `rgba(${r},${g},${b},0)`,
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
      // autoscaleInfoProvider: zoom local — lê historyRef (sempre fresco)
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

    // Linha de referência — criada aqui só se priceTobeat já chegou
    if (priceTobeatRef.current > 0) {
      priceLineRef.current = series.createPriceLine({
        price:              priceTobeatRef.current,
        color:              "rgba(255,255,255,0.28)",
        lineWidth:          1,
        lineStyle:          LineStyle.Dashed,
        axisLabelVisible:   true,
        title:              "Ref",
        axisLabelColor:     "rgba(255,255,255,0.22)",
        axisLabelTextColor: "rgba(255,255,255,0.6)",
      });
    }

    const ro = new ResizeObserver(() => {
      if (container.offsetWidth > 0) {
        chart.applyOptions({ width: container.offsetWidth });
      }
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Seed inicial: único momento em que setData é chamado ─────────────────
  // Depois do seed, TODOS os updates vêm do RAF (caminho único → sem jitter React)
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || history.length === 0 || seededRef.current) return;

    seededRef.current = true;
    const data = toChartData(history);
    series.setData(data);

    if (data.length > 0) {
      lastTimeRef.current = data[data.length - 1].time;
      chartRef.current?.timeScale().scrollToRealTime();
    }

    // Cria price line se ainda não existe (priceTobeat pode chegar depois do init)
    if (!priceLineRef.current && priceTobeatRef.current > 0) {
      priceLineRef.current = series.createPriceLine({
        price:              priceTobeatRef.current,
        color:              "rgba(255,255,255,0.28)",
        lineWidth:          1,
        lineStyle:          LineStyle.Dashed,
        axisLabelVisible:   true,
        title:              "Ref",
        axisLabelColor:     "rgba(255,255,255,0.22)",
        axisLabelTextColor: "rgba(255,255,255,0.6)",
      });
    }
  }, [history]);

  // ── priceTobeat: atualiza linha de referência ────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    if (priceTobeat > 0) {
      if (priceLineRef.current) {
        priceLineRef.current.applyOptions({ price: priceTobeat });
      } else {
        // Cria pela primeira vez se ainda não existia
        priceLineRef.current = series.createPriceLine({
          price:              priceTobeat,
          color:              "rgba(255,255,255,0.28)",
          lineWidth:          1,
          lineStyle:          LineStyle.Dashed,
          axisLabelVisible:   true,
          title:              "Ref",
          axisLabelColor:     "rgba(255,255,255,0.22)",
          axisLabelTextColor: "rgba(255,255,255,0.6)",
        });
      }
    }
  }, [priceTobeat]);

  // ── RAF: única fonte de updates pós-seed ─────────────────────────────────
  // 100ms throttle = 10fps, sincronizado ao rAF do browser (sem jitter do React)
  // Resolve o "trava→anda→trava": React render é bursty; RAF é constante
  useEffect(() => {
    if (!livePriceRef) return;
    const ref = livePriceRef;
    let rafId: number;
    let lastMs = 0;

    const frame = (now: number) => {
      if (now - lastMs >= 100 && seededRef.current) {
        const series = seriesRef.current;
        const price  = ref.current;
        if (series && price != null && price > 0) {
          const t = Math.floor(Date.now() / 1000) as UTCTimestamp;
          if (t >= lastTimeRef.current) {
            try {
              series.update({ time: t, value: price });
              lastTimeRef.current = t;
            } catch { /* timestamp conflict em round transition — ignorar */ }
          }
        }
        lastMs = now;
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
