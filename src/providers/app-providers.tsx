"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";

import { SessionExpiredError } from "@/lib/api/http";
import { isAccessDenied } from "@/lib/permissions";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      closeButton
      position="top-center"
      richColors
      theme={resolvedTheme === "light" ? "light" : "dark"}
    />
  );
}

/**
 * Отказ бэкенда (403) может значить, что роль пользователя уже сменилась:
 * перечитываем сессию, чтобы меню и кнопки пересчитались по новым правам.
 */
function createQueryClient() {
  const refreshSessionOnAccessDenied = (error: unknown) => {
    if (isAccessDenied(error)) {
      void client.invalidateQueries({ queryKey: ["auth", "session"] });
    }
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: refreshSessionOnAccessDenied }),
    mutationCache: new MutationCache({
      onError: refreshSessionOnAccessDenied,
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Повтор после истёкшей сессии даст тот же 401, а переход на
        // вход уже начат — ретраить нечего. Отказ по роли (403) повтор
        // тоже не исправит.
        retry: (failureCount, error) =>
          !(error instanceof SessionExpiredError) &&
          !isAccessDenied(error) &&
          failureCount < 1,
        staleTime: 30_000,
      },
    },
  });
  return client;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem
      value={{
        dark: "Theme_root_rtk_default_dark",
        light: "Theme_root_rtk_default_light",
      }}
    >
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <AuthProvider>
            <RealtimeProvider>{children}</RealtimeProvider>
          </AuthProvider>
        </LocaleProvider>
        <ThemedToaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
