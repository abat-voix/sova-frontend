"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type AuthenticatedUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  isStaff: boolean;
  roles: string[];
};

type SessionResponse =
  | { authenticated: false; csrfToken: string }
  | { authenticated: true; csrfToken: string; user: AuthenticatedUser };

type AuthContextValue = {
  csrfToken: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUrl: string;
  logoutUrl: string;
  user: AuthenticatedUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/me/", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Session request failed with status ${response.status}`);
  }

  return (await response.json()) as SessionResponse;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchSession,
    retry: false,
    staleTime: 60_000,
  });

  const value = useMemo<AuthContextValue>(() => {
    const data = session.data;

    return {
      csrfToken: data?.csrfToken ?? "",
      isAuthenticated: data?.authenticated ?? false,
      isLoading: session.isLoading,
      loginUrl: "/api/auth/oidc/authenticate/?next=/",
      logoutUrl: "/api/auth/oidc/logout/",
      user: data?.authenticated ? data.user : null,
    };
  }, [session.data, session.isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
