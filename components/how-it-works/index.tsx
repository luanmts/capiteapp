"use client";

import HowItWorksModal from "./HowItWorksModal";
import HowItWorksSheet from "./HowItWorksSheet";

interface HowItWorksProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorks({ isOpen, onClose }: HowItWorksProps) {
  return (
    <>
      {/* Desktop: modal */}
      <div className="hidden lg:block">
        <HowItWorksModal isOpen={isOpen} onClose={onClose} />
      </div>

      {/* Mobile: bottom sheet */}
      <div className="lg:hidden">
        <HowItWorksSheet isOpen={isOpen} onClose={onClose} />
      </div>
    </>
  );
}
