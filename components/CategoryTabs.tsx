"use client";

import { useRef } from "react";
import clsx from "clsx";
import {
  Bitcoin,
  TrendingUp,
  Star,
  Cloud,
  Trophy,
  LayoutGrid,
  Landmark,
} from "lucide-react";

const CATEGORIES = [
  { label: "Todos", icon: LayoutGrid },
  { label: "Em Alta", icon: TrendingUp },
  { label: "Criptomoedas", icon: Bitcoin },
  { label: "Financeiro", icon: Landmark },
  { label: "Entretenimento", icon: Star },
  { label: "Clima", icon: Cloud },
  { label: "Esportes", icon: Trophy },
];

interface CategoryTabsProps {
  active: string;
  onChange: (category: string) => void;
}

export default function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      {/* Fade edge right */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {CATEGORIES.map(({ label, icon: Icon }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => onChange(label)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 border",
                isActive
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-gray-medium/60 text-text-tint border-white/[0.06] hover:border-white/15 hover:text-white hover:bg-gray-medium"
              )}
            >
              <Icon
                className={clsx(
                  "w-3.5 h-3.5",
                  isActive ? "text-primary" : "text-text-tint"
                )}
              />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
