"use client";

import { useCallback, useState } from "react";

/**
 * Булев флаг интерфейса, который переживает переход между страницами: каждый
 * раздел — своя загрузка страницы, и свёрнутая панель иначе разворачивалась бы
 * обратно.
 *
 * Хранилище читается прямо в инициализаторе состояния, поэтому хук годится лишь
 * для поддерева, которое не рендерится на сервере, — иначе разметка сервера и
 * клиента разойдётся.
 */
export function usePersistedFlag(key: string, fallback = false) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return fallback;

    const stored = window.localStorage.getItem(key);

    return stored === null ? fallback : stored === "true";
  });

  const persist = useCallback(
    (next: boolean) => {
      window.localStorage.setItem(key, String(next));
      setValue(next);
    },
    [key],
  );

  return [value, persist] as const;
}
