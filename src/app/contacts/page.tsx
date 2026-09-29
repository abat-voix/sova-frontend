import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

// Страница читает адрес (ссылка на человека из карточки организации) — useSearchParams требует границу Suspense.
export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="contacts" />
    </Suspense>
  );
}
