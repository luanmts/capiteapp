export default function LiveBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-yellow opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-yellow" />
      </span>
      <span className="text-xs font-bold text-primary-yellow tracking-wider uppercase">
        Ao Vivo
      </span>
    </div>
  );
}
