"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type AuthUser = { id: string; nome: string; email: string; token: string };

interface AuthContextValue {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw   = localStorage.getItem("capite_user");
      const token = localStorage.getItem("capite_token");
      if (raw && token) {
        const parsed = JSON.parse(raw);
        // capite_user has { id, name, email } — normalize name → nome
        setUser({
          id:    parsed.id,
          nome:  parsed.nome ?? parsed.name,
          email: parsed.email,
          token,
        });
      }
    } catch {}
  }, []);

  const login = useCallback((u: AuthUser) => {
    setUser(u);
    localStorage.setItem("capite_token", u.token);
    localStorage.setItem("capite_user", JSON.stringify({ id: u.id, name: u.nome, email: u.email }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("capite_token");
    localStorage.removeItem("capite_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
