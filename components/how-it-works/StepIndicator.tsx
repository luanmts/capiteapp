interface StepIndicatorProps {
  total: number;
  current: number; // 0-indexed
}

export default function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 h-2 bg-primary"
              : i < current
              ? "w-2 h-2 bg-primary/50"
              : "w-2 h-2 bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}
