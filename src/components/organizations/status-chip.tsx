import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tones = {
  accent:
    "bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]",
  neutral: "bg-secondary text-muted-foreground",
  positive: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
} as const;

/**
 * Короткая метка состояния организации. Общая для карточки списка и панели
 * деталей: одно и то же состояние не должно выглядеть в них по-разному.
 */
export function StatusChip({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
