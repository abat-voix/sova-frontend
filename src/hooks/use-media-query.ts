"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks a CSS media query from JavaScript. Use it when a breakpoint has to
 * change behaviour rather than styling — mounting a component only on small
 * screens, for instance, so its side effects never run on desktop.
 *
 * Returns `false` during server rendering and the first client render.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);

      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
