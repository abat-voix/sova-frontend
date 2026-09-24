"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";

import { SessionExpiredError } from "@/lib/api/http";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      closeButton
      richColors
      theme={resolvedTheme === "light" ? "light" : "dark"}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            // Повтор после истёкшей сессии даст тот же 401, а переход на
            // вход уже начат — ретраить нечего.
            retry: (failureCount, error) =>
              !(error instanceof SessionExpiredError) && failureCount < 1,
            staleTime: 30_000,
          },
        },
      }),
  );

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
