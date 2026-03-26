"use client";

import { useEffect, useRef, useState } from "react";

interface HlsPlayerProps {
  src: string;
  carCount?: number;
  className?: string;
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

export default function HlsPlayer({ src, carCount, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<ReturnType<HlsConstructor["prototype"]["constructor"]> | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

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
