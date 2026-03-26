"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search, X, Info, Menu, ChevronDown,
  Wallet, BarChart2, Gift, Settings, LogOut,
} from "lucide-react";
import clsx from "clsx";
import AuthModal from "./AuthModal";
import HowItWorks from "./how-it-works";
import Deposit from "./deposit";
import { useAuth } from "@/contexts/AuthContext";
import { useBets } from "@/contexts/BetsContext";

type User = { id: string; nome: string; email: string; token: string };

// ── Avatar with initials ────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#02BC17", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4"];

function UserAvatar({ nome, size = 32 }: { nome: string; size?: number }) {
  const parts = nome.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
  const bg = AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
    >
      {initials}
    </div>
  );
}

// ── Dropdown menu ───────────────────────────────────────────────────────────────
function UserDropdown({ user, onLogout, onClose }: { user: User; onLogout: () => void; onClose: () => void }) {
  const items = [
    { icon: Wallet,   label: "Minha Carteira",   href: undefined },
    { icon: BarChart2,label: "Minhas Posições",   href: "/positions" },
    { icon: Gift,     label: "Recompensas",       href: undefined },
    { icon: Settings, label: "Configurações",     href: undefined },
  ];
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#1a1b22] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-[70]">
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <UserAvatar nome={user.nome} size={34} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user.nome}</p>
          <p className="text-xs text-text-tint truncate">{user.email}</p>
        </div>
      </div>
      {/* Items */}
      <div className="py-1">
        {items.map(({ icon: Icon, label, href }) =>
          href ? (
            <Link key={label} href={href} onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-tint hover:text-white hover:bg-white/[0.04] transition-colors">
              <Icon className="w-4 h-4 shrink-0" />{label}
            </Link>
          ) : (
            <button key={label} onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-tint hover:text-white hover:bg-white/[0.04] transition-colors">
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          )
        )}
      </div>
      {/* Logout */}
      <div className="border-t border-white/[0.06] py-1">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/[0.06] transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />Sair
        </button>
      </div>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────────
export default function Header() {
  const { user, login, logout } = useAuth();
  const { balance } = useBets();
  const [searchQuery, setSearchQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const desktopDropRef = useRef<HTMLDivElement>(null);
  const mobileDropRef  = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      const outsideDesktop = !desktopDropRef.current?.contains(t);
      const outsideMobile  = !mobileDropRef.current?.contains(t);
      if (outsideDesktop && outsideMobile) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleLogin = (u: User) => {
    login(u);
  };
  const handleLogout = () => { logout(); setDropdownOpen(false); };
  const toggleDropdown = () => setDropdownOpen(v => !v);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-dark/95 backdrop-blur-sm border-b border-white/[0.06]">

        {/* ── DESKTOP ── */}
        <div className="hidden lg:grid lg:grid-cols-3 max-w-[1600px] mx-auto px-8 h-16 w-full items-center gap-4">

          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-1.5 shrink-0 group justify-self-start">
            <span className="text-lg font-bold text-white tracking-tight group-hover:text-white/90 transition-colors">Previsão</span>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-lg font-bold text-white tracking-tight group-hover:text-white/90 transition-colors">io</span>
          </Link>

          {/* Center: Search + Como funciona */}
          <div className="flex items-center gap-3 justify-self-center w-full max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tint" />
              <input
                type="text"
                placeholder="Pesquisar mercados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-medium/60 border border-white/[0.08] rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-text-tint focus:outline-none focus:border-white/20 focus:bg-gray-medium/80 transition-all"
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-tint/50 font-mono border border-white/[0.08] rounded px-1 py-0.5 leading-none">/</kbd>
              )}
            </div>
            <button onClick={() => setHowItWorksOpen(true)}
              className="flex items-center gap-1.5 text-sm text-text-tint hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5 shrink-0">
              <Info className="w-4 h-4" />
              <span>Como funciona</span>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 justify-self-end">
            {user ? (
              <>
                {/* Wallet balance */}
                <div className="flex flex-col items-end mr-1">
                  <span className="text-[10px] text-text-tint uppercase tracking-wide leading-none mb-0.5">Carteira</span>
                  <span className="text-sm font-bold text-white tabular-nums">R$ {balance.toFixed(2).replace(".", ",")}</span>
                </div>
                {/* Deposit button */}
                <button
                  onClick={() => setDepositOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Depósito
                </button>
                {/* Avatar + dropdown */}
                <div ref={desktopDropRef} className="relative">
                  <button onClick={toggleDropdown}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <UserAvatar nome={user.nome} />
                    <ChevronDown className={clsx("w-3.5 h-3.5 text-text-tint transition-transform duration-200", dropdownOpen && "rotate-180")} />
                  </button>
                  {dropdownOpen && (
                    <UserDropdown user={user} onLogout={handleLogout} onClose={() => setDropdownOpen(false)} />
                  )}
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setAuthOpen(true)}
                  className="text-sm font-medium text-text-tint hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                  Entrar
                </button>
                <button onClick={() => setAuthOpen(true)}
                  className="text-sm font-semibold bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors ml-1">
                  Cadastre-se
                </button>
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-tint hover:text-white ml-1">
                  <Menu className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── MOBILE ── */}
        <div className="lg:hidden max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 shrink-0 group">
            <span className="text-lg font-bold text-white tracking-tight">Previsão</span>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-lg font-bold text-white tracking-tight">io</span>
          </Link>
          <div className="flex items-center gap-2.5 ml-auto">
            {user ? (
              <>
                {/* Balance */}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-text-tint uppercase tracking-wide leading-none mb-0.5">Carteira</span>
                  <span className="text-sm font-bold text-white tabular-nums">R$ {balance.toFixed(2).replace(".", ",")}</span>
                </div>
                {/* Avatar + dropdown */}
                <div ref={mobileDropRef} className="relative">
                  <button onClick={toggleDropdown}
                    className="flex items-center gap-1 p-1 rounded-lg hover:bg-white/5 transition-colors">
                    <UserAvatar nome={user.nome} size={30} />
                    <ChevronDown className={clsx("w-3 h-3 text-text-tint transition-transform duration-200", dropdownOpen && "rotate-180")} />
                  </button>
                  {dropdownOpen && (
                    <UserDropdown user={user} onLogout={handleLogout} onClose={() => setDropdownOpen(false)} />
                  )}
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setAuthOpen(true)}
                  className="text-sm font-medium text-text-tint hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                  Entrar
                </button>
                <button onClick={() => setAuthOpen(true)}
                  className="text-sm font-semibold bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg transition-colors">
                  Cadastre-se
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onLogin={handleLogin} />
      <HowItWorks isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
      <Deposit isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
    </>
  );
}
