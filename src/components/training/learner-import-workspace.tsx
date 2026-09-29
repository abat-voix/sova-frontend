"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { FileImportFlow } from "@/components/catalog-import/file-import-flow";
import { RegistryHeader } from "@/components/registry/registry-shared";
import { BackLink } from "@/components/training/back-link";
import { EntitySelect } from "@/components/ui/entity-select";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import {
  getLearnerImportMapping,
  readLearnerImportHeaders,
  saveLearnerImportMapping,
  uploadLearners,
} from "@/lib/api/training/learners";
import {
  getTrainingStream,
  searchTrainingStreams,
  trainingStreamHref,
  trainingStreamQueryKey,
} from "@/lib/api/training/streams";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import type { LearnerImportResult } from "@/types/training";

type ImportMode = "stream" | "none";

const learnerImportApi = {
  readHeaders: readLearnerImportHeaders,
  getMapping: getLearnerImportMapping,
  saveMapping: saveLearnerImportMapping,
};

/**
 * Загрузка файла «Пользователи»: с потоком — обучающиеся сразу становятся
 * участниками новой заявки на него, без потока — только карточки обучающихся.
 * Шаги открываются по очереди, как в импорте справочников: файл — после выбора
 * режима (и потока в режиме «В поток»).
 *
 * Файл, маппинг колонок (тип «Обучающиеся») и загрузка — общие с импортом
 * справочников (`FileImportFlow`), но эндпоинты свои — под `training.import`.
 */
export function LearnerImportWorkspace() {
  const { csrfToken, user } = useAuth();
  const canManageIntegrations =
    user !== null && can(user, "integrations.manage");
  // Ссылка «Загрузить пользователей в этот поток» из карточки потока — начальный выбор
  const linkedStreamId = useSearchParams()?.get("stream") || null;
  const linkedStream = useQuery({
    queryKey: trainingStreamQueryKey(linkedStreamId ?? ""),
    queryFn: () => getTrainingStream(linkedStreamId as string),
    enabled: linkedStreamId !== null,
  });
  const [chosen, setChosen] = useState<{ value: LookupOption | null } | null>(
    null,
  );
  // Ссылка из карточки потока сразу выбирает режим «В поток»
  const [chosenMode, setChosenMode] = useState<ImportMode | null>(null);
  const mode: ImportMode | null =
    chosenMode ?? (linkedStreamId !== null ? "stream" : null);
  const stream: LookupOption | null = chosen
    ? chosen.value
    : linkedStream.data
      ? { id: linkedStream.data.id, name: linkedStream.data.name }
      : null;
  const uploadStream = mode === "stream" ? stream : null;
  const isFirstStepDone =
    mode === "none" || (mode === "stream" && stream !== null);

  // Страница живёт в разделе «Обучающиеся» (training.read), а загрузка требует своего права
  if (user === null || !can(user, "training.import"))
    return (
      <div className="space-y-4">
        <BackLink href="/training/learners" label="Все обучающиеся" />
        <div className="bg-card rounded-xl border border-dashed p-12 text-center">
          <h1 className="text-2xl font-medium">Доступ ограничен</h1>
          <p className="text-muted-foreground mt-2">
            Загрузка обучающихся недоступна для вашей роли. Если доступ нужен,
            обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <BackLink href="/training/learners" label="Все обучающиеся" />
      <div>
        <RegistryHeader
          description="Обучающиеся и их персональные данные из файла «Пользователи». Существующий обучающийся находится по email, затем по телефону; пустая ячейка стирает значение, колонки, которой нет в файле, это не касается."
          title="Загрузка обучающихся"
        />
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          Оплаты из JSON загружаются в разделе{" "}
          {canManageIntegrations ? (
            <Link className="underline" href="/settings/integrations">
              «Интеграции»
            </Link>
          ) : (
            "«Интеграции»"
          )}{" "}
          (маппинг «Оплата обучения»).
        </p>
      </div>

      <section className="bg-card space-y-3 rounded-xl border p-4">
        <h2 className="text-lg font-medium">1. Поток</h2>
        <div className="flex flex-wrap gap-4 text-sm" role="radiogroup">
          {(["stream", "none"] as const).map((value) => (
            <label className="flex items-center gap-2" key={value}>
              <input
                checked={mode === value}
                name="learner-import-mode"
                onChange={() => setChosenMode(value)}
                type="radio"
              />
              {value === "stream" ? "В поток" : "Без потока"}
            </label>
          ))}
        </div>
        {mode === "stream" ? (
          <div className="sm:max-w-md">
            <EntitySelect
              id="learner-import-stream"
              label="Поток"
              onChange={(value) => setChosen({ value })}
              placeholder="Выберите поток"
              queryKey={["training", "streams", "lookup"]}
              search={searchTrainingStreams}
              value={stream}
            />
          </div>
        ) : null}
        {isFirstStepDone ? (
          <p className="text-muted-foreground text-sm">
            {mode === "stream"
              ? "Будет создана заявка на этот поток, все обучающиеся из файла станут её участниками. Кто уже участвует в заявке потока — будет пропущен с предупреждением."
              : "Обучающиеся будут созданы без заявки; добавить их в заявку можно позже в карточке потока."}
          </p>
        ) : null}
      </section>

      {isFirstStepDone ? (
        <FileImportFlow<LearnerImportResult>
          api={learnerImportApi}
          catalogType="learner"
          firstStep={2}
          renderResultExtra={(result) =>
            result.application && uploadStream ? (
              <p className="text-sm">
                Создана заявка на поток{" "}
                <Link
                  className="underline"
                  href={trainingStreamHref(uploadStream.id)}
                >
                  «{uploadStream.name}»
                </Link>
                .
              </p>
            ) : null
          }
          upload={(file) =>
            uploadLearners(file, uploadStream?.id ?? null, csrfToken)
          }
        />
      ) : null}
    </div>
  );
}
