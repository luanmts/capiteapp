"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, HelpCircle, LogIn, UserPlus, ChevronRight } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  {
    label: "Ajuda",
    description: "Tire suas dúvidas",
    icon: HelpCircle,
    href: "/ajuda",
  },
  {
    label: "Entrar",
    description: "Acesse sua conta",
    icon: LogIn,
    href: "/login",
  },
  {
    label: "Criar conta",
    description: "Cadastre-se gratuitamente",
    icon: UserPlus,
    href: "/cadastro",
  },
];

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  // Bloqueia scroll do body enquanto o menu estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fecha com ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
      className={[
        "fixed inset-0 z-50 flex flex-col",
        "bg-[#0d0f17]/95 backdrop-blur-md",
        "transition-transform duration-300 ease-out",
        isOpen
          ? "translate-x-0 pointer-events-auto"
          : "translate-x-full pointer-events-none",
      ].join(" ")}
    >
      {/* Conteúdo com scroll */}
      <div className="flex flex-col h-full overflow-y-auto px-5">

        {/* Header */}
        <div className="flex items-start justify-between pt-14 pb-8">
          <div>
            <p className="text-2xl font-bold text-white leading-tight">Menu</p>
            <p className="text-sm text-white/50 mt-1">
              Acesso rápido da sua conta
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="mt-1 p-2.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.12] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divisor */}
        <div className="h-px bg-white/[0.07] mb-6" />

        {/* Itens do menu */}
        <nav className="flex flex-col gap-2">
          {MENU_ITEMS.map(({ label, description, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              onClick={onClose}
              className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] active:scale-[0.98] transition-all duration-150 group"
            >
              {/* Ícone */}
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.07] border border-white/[0.08] shrink-0 group-hover:border-white/20 transition-colors">
                <Icon className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              </span>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white/90 group-hover:text-white transition-colors leading-tight">
                  {label}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{description}</p>
              </div>

              {/* Seta */}
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
            </Link>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="mt-auto pt-10 pb-8">
          <p className="text-xs text-white/20 text-center">
            Previsão.io © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
