"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { STEPS } from "./steps";
import HowItWorksContent from "./HowItWorksContent";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [step, setStep] = useState(0);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setStep(0), 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay — clicking outside closes */}
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none px-4"
          >
            <div
              className="w-full max-w-sm bg-[#16171d] border border-white/[0.07] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* No X on desktop — showClose=false */}
              <HowItWorksContent
                step={step}
                onNext={handleNext}
                onBack={handleBack}
                onClose={handleClose}
                showClose={false}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
