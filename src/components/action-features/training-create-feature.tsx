"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  Field,
  fieldInputClass,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import {
  actionFeatureInitialQueryKey,
  boardQueryKey,
  executeActionFeature,
  getActionFeatureInitial,
} from "@/lib/api/processes/board";
import {
  trainingStreamHref,
  trainingStreamsQueryKey,
} from "@/lib/api/training/streams";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  ActionFeatureExecution,
  ExecuteActionFeatureResult,
} from "@/types/action-feature";

const copy = {
  ru: {
    title: "Создать обучение",
    loading: "Загружаем программы…",
    error: "Не удалось загрузить данные для потока.",
    noContract:
      "У взаимодействия нет подписанного договора — поток можно создать только после подписания.",
    noPrograms: "У взаимодействия нет активных программ.",
    program: "Программа",
    programPlaceholder: "— выберите программу —",
    name: "Название потока",
    startsAt: "Начало",
    endsAt: "Окончание",
    instructors: "Преподаватели",
    instructorsPlaceholder: "Преподаватели организации-контрагента",
    instructorsHint:
      "В списке — преподаватели, которые ведут выбранную программу.",
    noInstructors:
      "Нет преподавателей для этой программы. Укажите программу в карточке преподавателя, чтобы его можно было назначить.",
    submit: "Создать поток",
    saving: "Создаём…",
    success: "Поток создан.",
    created: "Создан поток",
    open: "Открыть в разделе «Обучение»",
    unknownError: "Не удалось создать поток.",
  },
  en: {
    title: "Create training",
    loading: "Loading programs…",
    error: "Stream data could not be loaded.",
    noContract:
      "The interaction has no signed contract — a stream can be created only after signing.",
    noPrograms: "The interaction has no active programs.",
    program: "Program",
    programPlaceholder: "— choose a program —",
    name: "Stream name",
    startsAt: "Start",
    endsAt: "End",
    instructors: "Instructors",
    instructorsPlaceholder: "Instructors of the counterparty",
    instructorsHint:
      "Only instructors who teach the selected program are listed.",
    noInstructors:
      "No instructors for this program. Add the program to an instructor's profile to assign them.",
    submit: "Create stream",
    saving: "Creating…",
    success: "Stream created.",
    created: "Created stream",
    open: "Open in Training",
    unknownError: "The stream could not be created.",
  },
} as const;

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  featureCode?: ActionFeatureCode;
  executions?: ActionFeatureExecution[];
  executionNo?: number;
};

/**
 * Возможность `training.create`: поток обучения по программе взаимодействия.
 *
 * Поток — отдельная сущность, а не этап процесса: после создания с ним
 * работают в разделе «Обучение» (заявки, участники, оплата).
 */
export function TrainingCreateFeature({
  actionInstanceId,
  csrfToken,
  workflowInstanceId,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [program, setProgram] = useState("");
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [instructors, setInstructors] = useState<LookupOption[]>([]);
  const [saved, setSaved] = useState<ExecuteActionFeatureResult | null>(null);

  const initialQuery = useQuery({
    queryKey: actionFeatureInitialQueryKey(actionInstanceId, "training.create"),
    queryFn: () => getActionFeatureInitial(actionInstanceId, "training.create"),
    gcTime: 0,
  });
  const initial = initialQuery.data;
  // Единственная программа (например, на этапе программы) выбирается сама
  const selectedProgram =
    program || (initial?.programs.length === 1 ? initial.programs[0].id : "");
  // Назначить можно только преподавателей, которые ведут выбранную программу
  const instructorOptions: LookupOption[] =
    initial?.programs
      .find((item) => item.id === selectedProgram)
      ?.instructors.map((item) => ({
        id: item.id,
        name: item.full_name,
        hint: item.position,
      })) ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      executeActionFeature(
        actionInstanceId,
        "training.create",
        {
          ends_at: endsAt || null,
          instructors: instructors.map((item) => item.id),
          interaction_program: selectedProgram,
          name: name.trim(),
          starts_at: startsAt || null,
        },
        csrfToken,
      ),
    onSuccess: (result) => {
      setSaved(result);
      setName("");
      setStartsAt("");
      setEndsAt("");
      setInstructors([]);
      toast.success(text.success);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      void queryClient.invalidateQueries({
        queryKey: trainingStreamsQueryKey(),
      });
    },
  });

  return (
    <section aria-label={text.title} className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-medium">{text.title}</h4>
      {initialQuery.isPending ? (
        <p className="text-muted-foreground text-sm">{text.loading}</p>
      ) : initialQuery.isError || !initial ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{text.error}</p>
      ) : !initial.has_signed_contract ? (
        <p className="text-muted-foreground text-sm">{text.noContract}</p>
      ) : initial.programs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.noPrograms}</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <Field
            htmlFor={`${actionInstanceId}-training-program`}
            label={text.program}
            required
          >
            <select
              className={fieldInputClass}
              id={`${actionInstanceId}-training-program`}
              onChange={(event) => {
                setProgram(event.target.value);
                setInstructors([]);
              }}
              required
              value={selectedProgram}
            >
              <option value="">{text.programPlaceholder}</option>
              {initial.programs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.direction}
                </option>
              ))}
            </select>
          </Field>
          <Field
            htmlFor={`${actionInstanceId}-training-name`}
            label={text.name}
            required
          >
            <input
              className={fieldInputClass}
              id={`${actionInstanceId}-training-name`}
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              htmlFor={`${actionInstanceId}-training-starts`}
              label={text.startsAt}
            >
              <input
                className={fieldInputClass}
                id={`${actionInstanceId}-training-starts`}
                onChange={(event) => setStartsAt(event.target.value)}
                type="date"
                value={startsAt}
              />
            </Field>
            <Field
              htmlFor={`${actionInstanceId}-training-ends`}
              label={text.endsAt}
            >
              <input
                className={fieldInputClass}
                id={`${actionInstanceId}-training-ends`}
                onChange={(event) => setEndsAt(event.target.value)}
                type="date"
                value={endsAt}
              />
            </Field>
          </div>
          {!selectedProgram ? null : instructorOptions.length > 0 ? (
            <div>
              <MultiEntitySelect
                id={`${actionInstanceId}-training-instructors`}
                label={text.instructors}
                onChange={setInstructors}
                placeholder={text.instructorsPlaceholder}
                queryKey={[
                  "processes",
                  "training-create",
                  actionInstanceId,
                  selectedProgram,
                ]}
                search={async (term) =>
                  instructorOptions.filter((option) =>
                    option.name
                      .toLowerCase()
                      .includes(term.trim().toLowerCase()),
                  )
                }
                value={instructors}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {text.instructorsHint}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {text.noInstructors}
            </p>
          )}
          {mutation.isError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {apiErrorMessage(mutation.error, text.unknownError)}
            </p>
          ) : null}
          <Button
            disabled={!selectedProgram || !name.trim() || mutation.isPending}
            size="m"
            type="submit"
          >
            {mutation.isPending ? text.saving : text.submit}
          </Button>
        </form>
      )}
      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {text.created}: {String(saved.target.data.name ?? "")} ·{" "}
          <Link
            className="underline"
            href={trainingStreamHref(saved.target.id)}
          >
            {text.open}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
