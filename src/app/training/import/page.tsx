import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

// Страница читает адрес (ссылка «Загрузить пользователей в этот поток») — useSearchParams требует границу Suspense.
export default function LearnerImportPage() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="learnerImport" />
    </Suspense>
  );
}
