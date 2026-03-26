export interface Selection {
  id: string;
  label: string;
  odd: number;       // "Sim" odd
  oddNao?: number;   // "Não" odd (for stories-range markets)
  percent: number;
  code?: string;
  color?: string;
  icon?: string;
}

export interface Market {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  category: string;
  closesAt: string;
  live: 0 | 1;
  volume: number;
  selections: Selection[];
  matchingSystem: "binary" | "multiple" | "range";
  winnerId?: string;
  target?: string;
  displayType?: "crypto-live" | "binary-poll" | "live-count" | "stories-range" | "climate-daily";
  /** Optional market rules displayed in the detail view (array of paragraphs) */
  rules?: string[];
}

export interface MarketGroup {
  id: string;
  title: string;
  slug: string;
  icon?: string;
  volume: number;
  percent: number;
  selections: Selection[];
}

export interface GroupedMarket extends Market {
  isGrouped: true;
  groups: MarketGroup[];
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  message: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  balance: number;
  avatar?: string;
}
