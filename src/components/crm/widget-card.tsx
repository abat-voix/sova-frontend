import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Карточка виджета главной: иконка, заголовок, счётчик и ссылка на раздел
 * и/или своё действие в шапке (`action`), например «Прочитать все».
 */
export function WidgetCard({
  action,
  children,
  count,
  countLabel,
  href,
  icon: Icon,
  linkLabel,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  count?: number;
  /** Подпись счётчика для экранных читалок, например «Непрочитанных: 3». */
  countLabel?: string;
  href?: string;
  icon: LucideIcon;
  linkLabel?: string;
  title: string;
}) {
  return (
    <section className="bg-card flex min-h-0 min-w-0 flex-col rounded-xl border p-5 shadow-sm">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
          <h2 className="min-w-0 truncate text-base font-medium">{title}</h2>
          {count !== undefined ? (
            <span
              aria-label={countLabel}
              className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
            >
              {count}
            </span>
          ) : null}
        </div>
        {action}
        {href && linkLabel ? (
          <Link
            className="text-muted-foreground hover:text-foreground group flex shrink-0 items-center gap-1 text-xs font-medium transition-colors"
            href={href}
          >
            {linkLabel}
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 space-y-1.5">{children}</div>
    </section>
  );
}

export function WidgetState({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground px-1 py-6 text-center text-sm">
      {label}
    </p>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          aria-hidden="true"
          className="bg-secondary/60 h-14 animate-pulse rounded-lg"
          key={index}
        />
      ))}
    </div>
  );
}
