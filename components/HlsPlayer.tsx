"use client";

import { useEffect, useRef, useState } from "react";

interface HlsPlayerProps {
  src: string;
  carCount?: number;
  className?: string;
  /** Ponto inicial da linha virtual em coordenadas relativas [x, y] (0.0–1.0). Default: [0, 0.5] */
  lineStart?: [number, number];
  /** Ponto final da linha virtual em coordenadas relativas [x, y] (0.0–1.0). Default: [1, 0.5] */
  lineEnd?: [number, number];
}

// Dynamically loads hls.js from CDN (no npm install needed)
function loadHlsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>)["Hls"]) {
      resolve();
      return;
    }
    const existing = document.getElementById("hls-js-cdn");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "hls-js-cdn";
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

type HlsConstructor = {
  isSupported: () => boolean;
  new(config?: object): {
    loadSource: (src: string) => void;
    attachMedia: (el: HTMLVideoElement) => void;
    destroy: () => void;
    on: (event: string, cb: () => void) => void;
    Events: { MANIFEST_PARSED: string };
  };
};

/** SVG overlay que desenha a linha virtual de contagem sobre o vídeo */
function CountingLine({
  lineStart = [0, 0.5],
  lineEnd   = [1, 0.5],
  flash,
}: {
  lineStart?: [number, number];
  lineEnd?:   [number, number];
  flash:      boolean;
}) {
  // Converte coordenadas relativas (0–1) para o viewBox 0–100
  const x1 = lineStart[0] * 100;
  const y1 = lineStart[1] * 100;
  const x2 = lineEnd[0]   * 100;
  const y2 = lineEnd[1]   * 100;

  // Direção para a seta (vetor normalizado)
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux  = dx / len;
  const uy  = dy / len;

  // Ponta da seta: um triângulo pequeno no ponto médio da linha
  const mx  = (x1 + x2) / 2;
  const my  = (y1 + y2) / 2;
  const aw  = 2.5;  // semi-largura da base
  const ah  = 4.5;  // altura da seta
  // perp: vetor perpendicular à linha
  const px  = -uy;
  const py  = ux;
  const tip    = `${mx + ux * ah},${my + uy * ah}`;
  const base1  = `${mx + px * aw},${my + py * aw}`;
  const base2  = `${mx - px * aw},${my - py * aw}`;

  const lineColor  = flash ? "#ffffff" : "#facc15";  // amarelo → branco no flash
  const glowColor  = flash ? "rgba(255,255,255,0.6)" : "rgba(250,204,21,0.35)";
  const lineOpacity = flash ? 1 : 0.85;

  return (
    // preserveAspectRatio="none" garante que o SVG cobre exatamente o vídeo
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="line-glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow track — linha mais grossa e semitransparente */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={glowColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Linha principal */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={lineColor}
        strokeWidth="0.7"
        strokeDasharray="3 2"
        strokeLinecap="round"
        opacity={lineOpacity}
        filter="url(#line-glow)"
        style={{ transition: "stroke 0.15s ease, opacity 0.15s ease" }}
      />

      {/* Seta de direção no meio da linha */}
      <polygon
        points={`${tip} ${base1} ${base2}`}
        fill={lineColor}
        opacity={lineOpacity}
        style={{ transition: "fill 0.15s ease" }}
      />
    </svg>
  );
}

export default function HlsPlayer({
  src,
  carCount,
  className,
  lineStart = [0, 0.5],
  lineEnd   = [1, 0.5],
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<ReturnType<HlsConstructor["prototype"]["constructor"]> | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [flash,  setFlash]  = useState(false);
  const prevCountRef = useRef<number | undefined>(undefined);

  // Flash breve quando carCount aumenta
  useEffect(() => {
    if (carCount === undefined) return;
    if (prevCountRef.current !== undefined && carCount > prevCountRef.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(t);
    }
    prevCountRef.current = carCount;
  }, [carCount]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;

    async function init() {
      if (!video) return;

      // Safari / iOS — native HLS support
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.play().catch(() => {});
        setStatus("playing");
        return;
      }

      // Chrome / Firefox — use hls.js via CDN
      try {
        await loadHlsScript();
        if (destroyed) return;

        const Hls = (window as unknown as { Hls: HlsConstructor }).Hls;
        if (!Hls.isSupported()) {
          setStatus("error");
          return;
        }

        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          setStatus("playing");
        });
      } catch {
        if (!destroyed) setStatus("error");
      }
    }

    init();

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden bg-black ${className ?? ""}`}>
      {/* Video element — natural size, no crop */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        className="w-full h-auto block"
        style={{ display: status === "playing" ? "block" : "none" }}
      />

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 bg-gray-900 w-full aspect-video">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
          <p className="text-[11px] text-text-tint/60">Conectando à câmera...</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-2 bg-gray-900 w-full aspect-video">
          <span className="text-2xl">📷</span>
          <p className="text-[11px] text-text-tint/60">Câmera indisponível</p>
        </div>
      )}

      {/* Linha virtual de contagem — visível quando o vídeo está tocando */}
      {status === "playing" && (
        <CountingLine lineStart={lineStart} lineEnd={lineEnd} flash={flash} />
      )}

      {/* LIVE badge */}
      {status === "playing" && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-red-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Ao Vivo</span>
        </div>
      )}

      {/* Car count overlay */}
      {carCount !== undefined && (
        <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
          <p className="text-[9px] text-text-tint/70 uppercase tracking-wider leading-none mb-0.5">Detectados</p>
          <p className="text-lg font-bold text-white tabular-nums leading-none">{carCount}</p>
        </div>
      )}

      {/* Location label */}
      <div className="absolute bottom-2.5 left-2.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 border border-white/[0.08]">
        <p className="text-[9px] text-text-tint/80 leading-none">SP123 · KM 046</p>
      </div>
    </div>
  );
}
