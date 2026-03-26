export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatOdd(odd: number): string {
  return `${odd.toFixed(2)}x`;
}

export function formatPercent(percent: string | number): string {
  const value = typeof percent === "string" ? parseFloat(percent) : percent;
  return `${Math.round(value)}%`;
}

export function getTimeRemaining(closesAt: string): string {
  const now = new Date();
  const target = new Date(closesAt);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return "Encerrado";

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  if (diffMinutes < 60) {
    const secs = diffSeconds % 60;
    const minStr = String(diffMinutes).padStart(2, "0");
    const secStr = String(secs).padStart(2, "0");
    return `${minStr}:${secStr}`;
  }

  if (diffHours < 24) {
    const mins = diffMinutes % 60;
    if (mins === 0) return `${diffHours}h`;
    return `${diffHours}h ${mins}min`;
  }

  return `${diffDays}d`;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Criptomoedas: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Financeiro: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Entretenimento: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    Clima: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    Esportes: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  };
  return colors[category] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20";
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `R$ ${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `R$ ${(volume / 1_000).toFixed(1)}k`;
  }
  return formatCurrency(volume);
}
