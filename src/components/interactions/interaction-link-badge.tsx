import { ArrowUpRight } from "lucide-react";

/** Компактная ссылка на отфильтрованный список взаимодействий контрагента. */
export function InteractionLinkBadge({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-1 rounded-full bg-[var(--atmr-background-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--atmr-accent-primary)] hover:brightness-95 dark:hover:brightness-110"
      onClick={onClick}
      type="button"
    >
      {label}
      <ArrowUpRight aria-hidden="true" className="size-3" />
    </button>
  );
}
