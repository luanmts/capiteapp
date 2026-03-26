"use client";
import { AuthProvider } from "@/contexts/AuthContext";
import { BetsProvider } from "@/contexts/BetsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BetsProvider>{children}</BetsProvider>
    </AuthProvider>
  );
}
