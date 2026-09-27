"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { syncMessagingEvent } from "@/lib/realtime/messaging-sync";
import {
  RealtimeClient,
  type RealtimeStatus,
} from "@/lib/realtime/realtime-client";
import { getRealtimeUrl } from "@/lib/realtime/url";
import type { RealtimeEvent } from "@/lib/realtime/protocol";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";

type RealtimeContextValue = {
  status: RealtimeStatus;
  subscribe: (listener: (event: RealtimeEvent) => void) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "idle",
  subscribe: () => () => undefined,
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const clientRef = useRef<RealtimeClient | null>(null);
  const listenersRef = useRef(new Set<(event: RealtimeEvent) => void>());
  const [status, setStatus] = useState<RealtimeStatus>("idle");

  useEffect(() => {
    if (
      auth.isLoading ||
      !auth.isAuthenticated ||
      !auth.user ||
      !can(auth.user, "realtime.connect") ||
      typeof window === "undefined"
    ) {
      clientRef.current?.stop();
      clientRef.current = null;
      return;
    }

    const client = new RealtimeClient({
      url: getRealtimeUrl(window.location),
      checkSession: auth.refreshSession,
      onAuthExpired: auth.refreshSession,
    });
    clientRef.current = client;
    const unsubscribeStatus = client.subscribeStatus((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === "connected") {
        void queryClient.invalidateQueries({ queryKey: ["messaging"] });
      }
    });
    const unsubscribeEvents = client.subscribe((event) => {
      syncMessagingEvent(queryClient, event);
      listenersRef.current.forEach((listener) => listener(event));
    });
    client.start();

    return () => {
      unsubscribeEvents();
      unsubscribeStatus();
      client.stop();
      if (clientRef.current === client) clientRef.current = null;
    };
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    auth.refreshSession,
    auth.user,
    queryClient,
  ]);

  const subscribe = useCallback((listener: (event: RealtimeEvent) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function realtimePollingInterval(
  status: RealtimeStatus,
  fallbackInterval: number,
) {
  return status === "connected" || status === "connecting"
    ? false
    : fallbackInterval;
}
