"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import DepositContent from "./DepositContent";

interface DepositProps {
  isOpen: boolean;
  onClose: () => void;
}

function DepositPortalContent({ isOpen, onClose }: DepositProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay — rendered in body, covers 100% viewport */}
          <motion.div
            key="deposit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-[3px]"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />

          {/* Desktop: centered modal */}
          <motion.div
            key="deposit-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 hidden lg:flex items-center justify-center pointer-events-none px-4"
            style={{ zIndex: 9999 }}
          >
            <div
              className="w-full max-w-sm bg-[#13141a] border border-white/[0.09] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)] pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <DepositContent onClose={onClose} />
            </div>
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            key="deposit-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#13141a] border-t border-white/[0.07] rounded-t-[28px] overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
            style={{ zIndex: 9999, maxHeight: "92dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="pt-4 overflow-y-auto" style={{ maxHeight: "92dvh" }}>
              <DepositContent onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Deposit({ isOpen, onClose }: DepositProps) {
  const [mounted, setMounted] = useState(false);

  // Only render portal on client
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return createPortal(
    <DepositPortalContent isOpen={isOpen} onClose={onClose} />,
    document.body
  );
}
