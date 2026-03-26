"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Wallet, MessageCircle } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  {
    label: "Mercados",
    href: "/",
    icon: LayoutGrid,
  },
  {
    label: "Posições",
    href: "/positions",
    icon: Wallet,
  },
  {
    label: "Chat",
    href: "/chat",
    icon: MessageCircle,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-dark/95 backdrop-blur-sm border-t border-white/[0.06]">
      <div className="flex items-center justify-around h-16 px-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all",
                isActive ? "text-primary" : "text-text-tint hover:text-white"
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-text-tint"
                )}
              />
              <span
                className={clsx(
                  "text-[10px] font-semibold transition-colors",
                  isActive ? "text-primary" : "text-text-tint"
                )}
              >
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-4 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
