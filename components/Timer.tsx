"use client";

import { Clock } from "lucide-react";
import { useTimer } from "@/hooks/useTimer";
import clsx from "clsx";

interface TimerProps {
  closesAt: string;
  className?: string;
  showIcon?: boolean;
}

export default function Timer({ closesAt, className = "", showIcon = true }: TimerProps) {
  const { timeLeft, isExpired, formatted } = useTimer(closesAt);

  // Less than 5 minutes = warning yellow
  const isUrgent = !isExpired && timeLeft > 0 && timeLeft < 5 * 60 * 1000;

  if (isExpired) {
    return (
      <div className={clsx("flex items-center gap-1.5", className)}>
        {showIcon && <Clock className="w-3.5 h-3.5 text-text-tint" />}
        <span className="text-xs font-medium text-text-tint">Encerrado</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center gap-1.5",
        isUrgent ? "text-primary-yellow" : "text-text-tint",
        className
      )}
    >
      {showIcon && (
        <Clock
          className={clsx(
            "w-3.5 h-3.5",
            isUrgent ? "text-primary-yellow" : "text-text-tint"
          )}
        />
      )}
      <span
        className={clsx(
          "text-xs font-semibold tabular-nums",
          isUrgent ? "text-primary-yellow" : "text-text-tint"
        )}
      >
        {formatted}
      </span>
    </div>
  );
}
