"use client";

import { useEffect, useEffectEvent } from "react";

import type { RealtimeEvent } from "@/lib/realtime/protocol";
import { useRealtime } from "@/providers/realtime-provider";

export function useRealtimeEvent(listener: (event: RealtimeEvent) => void) {
  const { subscribe } = useRealtime();
  const onEvent = useEffectEvent(listener);
  useEffect(() => subscribe(onEvent), [subscribe]);
}
