"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

/** Прикладные роли СОВА (`accounts.SystemRole`). */
export type SystemRole = "kam" | "head" | "platform_admin";

export type AuthenticatedUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  isStaff: boolean;
  /** `null`, если роль СОВА не назначена. */
  role: SystemRole | null;
  /** Название роли для интерфейса; приходит с бэкенда, не переводим. */
  roleDisplay: string | null;
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
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Сессия читается в обход общего транспорта намеренно.
 *
 * `/api/auth/me/` освобождён от продления id token и отвечает 200 даже при
 * истёкшем токене, а анонимному пользователю — `{authenticated: false}`.
 * Поэтому уводить отсюда на вход нельзя: неавторизованный экран должен
 * отрисоваться со своей кнопкой входа.
 */
async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/me/", {
    credentials: "include",
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
  const refetchSession = session.refetch;

  const refreshSession = useCallback(async () => {
    const result = await refetchSession();
    return result.data?.authenticated ?? false;
  }, [refetchSession]);

  const value = useMemo<AuthContextValue>(() => {
    const data = session.data;

    return {
      csrfToken: data?.csrfToken ?? "",
      isAuthenticated: data?.authenticated ?? false,
      isLoading: session.isLoading,
      loginUrl: "/api/auth/oidc/authenticate/?next=/",
      logoutUrl: "/api/auth/oidc/logout/",
      user: data?.authenticated ? data.user : null,
      refreshSession,
    };
  }, [refreshSession, session.data, session.isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
