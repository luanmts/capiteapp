"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE   = process.env.NEXT_PUBLIC_API_URL ?? "";
const WORKER_KEY = process.env.NEXT_PUBLIC_DEBUG_KEY ?? "";
const FRAME_URL  = `${API_BASE}/rodovia/debug/frame`;
const POLL_MS    = 1000;

export default function RodoviaDebugPage() {
  const [frameUrl, setFrameUrl]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [frameCount, setCount]    = useState(0);
  const [fps, setFps]             = useState(0);
  const objUrlRef   = useRef<string | null>(null);
  const lastFpsRef  = useRef(Date.now());
  const fpsCountRef = useRef(0);

  useEffect(() => {
    let alive = true;

    async function fetchFrame() {
      try {
        const res = await fetch(FRAME_URL, {
          headers: WORKER_KEY ? { "x-worker-key": WORKER_KEY } : {},
          cache: "no-store",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? `HTTP ${res.status}`);
          return;
        }
        const blob = await res.blob();
        if (!alive) return;

        // Revoga URL anterior para evitar leak de memória
        if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
        const url = URL.createObjectURL(blob);
        objUrlRef.current = url;
        setFrameUrl(url);
        setError(null);
        setCount(n => n + 1);

        // FPS display
        fpsCountRef.current += 1;
        const now = Date.now();
        const elapsed = now - lastFpsRef.current;
        if (elapsed >= 2000) {
          setFps(Math.round((fpsCountRef.current / elapsed) * 1000));
          fpsCountRef.current = 0;
          lastFpsRef.current  = now;
        }
      } catch (e: unknown) {
        if (alive) setError(String(e));
      }
    }

    const id = setInterval(fetchFrame, POLL_MS);
    fetchFrame();

    return () => {
      alive = false;
      clearInterval(id);
      if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Rodovia — Debug Visual</h1>
          <p className="text-xs text-gray-500">frames anotados do worker · polling {POLL_MS}ms</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>frames: {frameCount}</span>
          <span>~{fps} fps</span>
          <span className={`px-2 py-0.5 rounded-full font-semibold ${error ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"}`}>
            {error ? "offline" : "live"}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-sm text-red-300">
          {error}
          {!WORKER_KEY && (
            <p className="mt-1 text-red-400/70">
              Configure <code>NEXT_PUBLIC_DEBUG_KEY</code> no .env do frontend com o valor de <code>RODOVIA_WORKER_KEY</code>.
            </p>
          )}
        </div>
      )}

      <div className="relative bg-black rounded-xl overflow-hidden aspect-video w-full max-w-4xl mx-auto">
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="debug frame"
            className="w-full h-full object-contain"
          />
        ) : !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
            Aguardando primeiro frame…
          </div>
        ) : null}
      </div>

      <div className="max-w-4xl mx-auto w-full text-xs text-gray-600 space-y-1">
        <p>🟩 verde — veículo rastreado</p>
        <p>🟨 amarelo — cruzamento detectado neste frame</p>
        <p>Linha tracejada — zona de contagem (LINE_START / LINE_END no .env do worker)</p>
      </div>
    </div>
  );
}
