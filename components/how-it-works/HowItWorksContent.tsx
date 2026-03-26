"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";
import { STEPS } from "./steps";
import StepIndicator from "./StepIndicator";

interface HowItWorksContentProps {
  step: number; // 0-indexed
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  /** true = mobile sheet (shows X on image). false = desktop modal (no X, closes via overlay/ESC) */
  showClose?: boolean;
}

const PLACEHOLDERS = [
  "from-blue-950 via-primary/30 to-indigo-950",
  "from-violet-950 via-purple-500/30 to-blue-950",
  "from-emerald-950 via-green-500/30 to-teal-950",
];

export default function HowItWorksContent({
  step,
  onNext,
  onBack,
  onClose,
  showClose = false,
}: HowItWorksContentProps) {
  const current = STEPS[step];
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col">

      {/* ── Hero image — full bleed, touches all edges at top ── */}
      <div
        className="relative w-full overflow-hidden shrink-0"
        style={{ height: showClose ? "290px" : "220px" }}
      >
        {!imgError ? (
          <Image
            src={current.image}
            alt={current.title}
            fill
            className="object-cover object-center"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${PLACEHOLDERS[step]} flex items-center justify-center`}>
            <span className="text-8xl font-black text-white/8 select-none">{step + 1}</span>
          </div>
        )}

        {/* Top: subtle dark fade for button readability */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

        {/* Bottom: fade into card background — hides crop line */}
        <div
          className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #16171d)" }}
        />

        {/* Back button — overlaid top-left, only from step 2+ */}
        {step > 0 && (
          <button
            onClick={onBack}
            className="absolute top-3 left-3 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white/90 hover:bg-black/60 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Close button — overlaid top-right, mobile only */}
        {showClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white/90 hover:bg-black/60 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Animated body — step indicator + text ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col items-center px-6 pt-5 pb-2 gap-3"
        >
          {/* Step progress dots */}
          <StepIndicator total={STEPS.length} current={step} />

          {/* Title */}
          <h2 className="text-base font-bold text-white leading-snug text-center w-full">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-text-tint leading-relaxed text-center">
            {current.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* ── CTA button ── */}
      <div className="px-6 pt-4 pb-6 shrink-0">
        <button
          onClick={onNext}
          className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold text-sm py-3 rounded-xl transition-all"
        >
          {current.cta}
        </button>
      </div>

    </div>
  );
}
