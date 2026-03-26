"use client";

import { useState, useEffect } from "react";

interface TimerReturn {
  timeLeft: number; // milliseconds remaining
  isExpired: boolean;
  formatted: string;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "Encerrado";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    const minsStr = String(minutes).padStart(2, "0");
    return `${hours}h ${minsStr}min`;
  }

  const minStr = String(minutes).padStart(2, "0");
  const secStr = String(seconds).padStart(2, "0");
  return `${minStr}:${secStr}`;
}

export function useTimer(closesAt: string): TimerReturn {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    return Math.max(0, new Date(closesAt).getTime() - Date.now());
  });

  useEffect(() => {
    const target = new Date(closesAt).getTime();

    const tick = () => {
      const remaining = Math.max(0, target - Date.now());
      setTimeLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [closesAt]);

  const isExpired = timeLeft <= 0;
  const formatted = formatTimeLeft(timeLeft);

  return { timeLeft, isExpired, formatted };
}
