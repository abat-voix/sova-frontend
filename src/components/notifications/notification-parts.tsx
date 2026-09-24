import { Bell, CalendarClock, UserCheck, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Иконки групп по имени, которое присылает бэкенд. Группы здесь не
 * перечисляются: незнакомое имя получает колокольчик, и новая группа
 * появляется в интерфейсе без правок фронта.
 */
const kindIcons: Record<string, LucideIcon> = {
  bell: Bell,
  "calendar-clock": CalendarClock,
  "user-check": UserCheck,
};

export function KindIcon({
  className,
  name,
}: {
  className?: string;
  name: string | undefined;
}) {
  const Icon = kindIcons[name ?? ""] ?? Bell;

  return <Icon aria-hidden="true" className={className} />;
}

/**
 * Переходим только по внутренним адресам: ссылку формирует бэкенд, но
 * `javascript:` и чужие домены в интерфейс не пускаем.
 */
export function isInternalLink(link: string) {
  return link.startsWith("/") && !link.startsWith("//");
}

/** Адрес уведомления на вкладке «Уведомления». */
export function notificationHref(id: string) {
  return `/notifications?notification=${encodeURIComponent(id)}`;
}

export function KindChip({
  isActive,
  label,
  onClick,
  unreadCount = 0,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
  unreadCount?: number;
}) {
  return (
    <button
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        isActive
          ? "border-[var(--atmr-accent-primary)] bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      {unreadCount > 0 ? (
        <span className="rounded-full bg-[var(--atmr-accent-primary)] px-1.5 text-[10px] leading-4 text-white">
          {unreadCount}
        </span>
      ) : null}
    </button>
  );
}
