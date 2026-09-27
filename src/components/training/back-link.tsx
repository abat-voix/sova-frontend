import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Возврат со страницы сущности к списку раздела. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      href={href}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {label}
    </Link>
  );
}
