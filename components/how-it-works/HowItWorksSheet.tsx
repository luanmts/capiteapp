"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { STEPS } from "./steps";
import HowItWorksContent from "./HowItWorksContent";

interface HowItWorksSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksSheet({ isOpen, onClose }: HowItWorksSheetProps) {
  const [step, setStep] = useState(0);

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
    setTimeout(() => setStep(0), 350);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet — springs up */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[61] bg-[#16171d] border-t border-white/[0.07] rounded-t-3xl overflow-hidden"
            style={{ maxHeight: "85dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — overlaid on top of image, não empurra conteúdo */}
            <div className="absolute top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
              <div className="w-9 h-1 rounded-full bg-white/30" />
            </div>

            {/* X overlaid on image — showClose=true */}
            <HowItWorksContent
              step={step}
              onNext={handleNext}
              onBack={handleBack}
              onClose={handleClose}
              showClose={true}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
