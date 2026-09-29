import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

// Страница читает адрес (ссылка из карточки взаимодействия или обучающегося) — useSearchParams требует границу Suspense.
export default function TrainingStreamsPage() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="trainingStreams" />
    </Suspense>
  );
}
