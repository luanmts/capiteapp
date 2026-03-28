"use client";

/**
 * LiveChart — TradingView Lightweight Charts v5
 *
 * Fixes vs primeira versão:
 * - leftPriceScale desabilitado (causava o "-17" fantasma na esquerda)
 * - stale closure corrigido: rateRef/historyRef/priceTobeatRef sempre frescos
 * - seeding correto: setData na primeira chegada de dados, update incremental depois
 * - autoscaleInfoProvider com janela local (Y_WINDOW=300 pts = 30s) → zoom agressivo
 * - minMove alinhado ao ativo (não 0.01 para BTC de $90k)
 * - AreaSeries com gradiente para visual próximo da referência
 * - RAF simplificado: 5 updates/s direto do livePriceRef sem conflito com history
 */

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  LineStyle,
  CrosshairMode,
  LastPriceAnimationMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts";

interface DataPoint { t: number; price: number }

interface LiveChartProps {
  history: DataPoint[];
  priceTobeat: number;
  lineColor?: string;
  usdRate?: number;
  livePriceRef?: React.RefObject<number>;
}

const Y_WINDOW = 300; // últimos N pontos para cálculo do range local (~30s @ 100ms)

/** Converte history para array LWC deduplicado por segundo, ordenado. */
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

  // Refs sempre frescos — lidos pelo autoscaleInfoProvider e formatter sem stale closure
  const historyRef      = useRef(history);
  const priceTobeatRef  = useRef(priceTobeat);
  const rateRef         = useRef(usdRate);
  historyRef.current    = history;
  priceTobeatRef.current = priceTobeat;
  rateRef.current       = usdRate;

  // ── Formatter BRL/USD ───────────────────────────────────────────────────────
  // Definido fora do useEffect para poder usar rateRef (sempre fresco)
  const fmt = (p: number) => {
    const v = p * rateRef.current;
    if (rateRef.current > 1) {
      if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`;
      return `R$${Math.round(v)}`;
    }
    return `$${Math.round(v).toLocaleString("en")}`;
  };

  // ── Init chart (uma única vez) ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const chart = createChart(container, {
      width:  container.offsetWidth,
      height: 180,
      layout: {
        background: { color: "transparent" },
        textColor:  "rgba(255,255,255,0.4)",
        fontFamily: "'Inter', 'system-ui', monospace",
        fontSize:   11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      // ← bug fix: escala esquerda estava ativa (causava o "-17")
      leftPriceScale:  { visible: false },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins:  { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderVisible:  false,
        timeVisible:    true,
        secondsVisible: false, // mostra HH:MM, não HH:MM:SS (menos poluído)
        fixLeftEdge:    true,
        fixRightEdge:   true,
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

    // Hex → rgba helper para o gradiente
    const hex = lineColor.startsWith("#") ? lineColor : "#f59e0b";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

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
        minMove:   1, // bug fix: 0.01 causava labels repetidos para BTC $90k
      },
      // autoscaleInfoProvider: zoom local baseado nos últimos Y_WINDOW pontos
      // Lê historyRef (sempre fresco) — sem stale closure
      autoscaleInfoProvider: () => {
        const recent = historyRef.current.slice(-Y_WINDOW);
        if (recent.length < 2) return null; // fallback para auto-scale do LWC
        const prices  = recent.map(d => d.price);
        const ptb     = priceTobeatRef.current;
        if (ptb > 0) prices.push(ptb);
        const minP  = Math.min(...prices);
        const maxP  = Math.max(...prices);
        const rng   = maxP - minP || minP * 0.001;
        const pad   = Math.max(rng * 0.18, minP * 0.00003);
        return {
          priceRange: { minValue: minP - pad, maxValue: maxP + pad },
          margins:    { above: 0, below: 0 },
        };
      },
    });

    seriesRef.current = series;

    // Linha de referência — criada só se priceTobeat já chegou
    if (priceTobeatRef.current > 0) {
      priceLineRef.current = series.createPriceLine({
        price:              priceTobeatRef.current,
        color:              "rgba(255,255,255,0.30)",
        lineWidth:          1,
        lineStyle:          LineStyle.Dashed,
        axisLabelVisible:   true,
        title:              "Ref",
        axisLabelColor:     "rgba(255,255,255,0.25)",
        axisLabelTextColor: "rgba(255,255,255,0.6)",
      });
    }

    // ResizeObserver para manter chart responsivo
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
  }, []); // sem deps — init uma vez

  // ── Seed + update incremental ──────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || history.length === 0) return;

    if (!seededRef.current) {
      // Bug fix: init effect tinha stale closure vazia — aqui sempre temos dados frescos
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
          color:              "rgba(255,255,255,0.30)",
          lineWidth:          1,
          lineStyle:          LineStyle.Dashed,
          axisLabelVisible:   true,
          title:              "Ref",
          axisLabelColor:     "rgba(255,255,255,0.25)",
          axisLabelTextColor: "rgba(255,255,255,0.6)",
        });
      }
      return;
    }

    // Update incremental — apenas o último ponto
    const last = history[history.length - 1];
    const t = Math.floor(last.t / 1000) as UTCTimestamp;
    if (t >= lastTimeRef.current) {
      try {
        series.update({ time: t, value: last.price });
        lastTimeRef.current = t;
      } catch {
        // LWC lança se timestamp < último — em round transition pode acontecer; ignora
      }
    }
  }, [history]);

  // ── priceTobeat: atualiza linha de referência ─────────────────────────────
  useEffect(() => {
    if (!priceLineRef.current) return;
    if (priceTobeat > 0) {
      priceLineRef.current.applyOptions({ price: priceTobeat });
    }
  }, [priceTobeat]);

  // ── RAF: preenche entre ticks do history com WS price (~5 updates/s) ──────
  // Simples e seguro: usa lastTimeRef para nunca voltar no tempo
  useEffect(() => {
    if (!livePriceRef) return;
    const ref = livePriceRef;
    let rafId: number;
    let lastMs = 0;

    const frame = (now: number) => {
      if (now - lastMs >= 200) { // 5fps para suavizar sem conflitar
        const series = seriesRef.current;
        const price  = ref.current;
        if (series && price != null && price > 0 && seededRef.current) {
          const t = Math.floor(Date.now() / 1000) as UTCTimestamp;
          if (t >= lastTimeRef.current) {
            try {
              series.update({ time: t, value: price });
              lastTimeRef.current = t;
            } catch { /* timestamp conflict em round transition */ }
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
