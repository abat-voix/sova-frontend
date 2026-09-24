import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

// Страница читает адрес (ссылка из уведомления) — useSearchParams требует границу Suspense.
export default function InteractionsPage() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="interactions" />
    </Suspense>
  );
}
