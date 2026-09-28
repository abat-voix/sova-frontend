"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Pencil, Upload, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import {
  streamStatusLabels,
  streamStatusTone,
} from "@/components/training/training-labels";
import { BackLink } from "@/components/training/back-link";
import { TrainingStreamApplications } from "@/components/training/training-stream-applications";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import { StatusChip } from "@/components/ui/status-chip";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import {
  searchCounterpartyInstructors,
  trainingInstructorHref,
} from "@/lib/api/training/instructors";
import {
  assignStreamInstructor,
  getTrainingStream,
  trainingStreamQueryKey,
  trainingStreamsQueryKey,
  unassignStreamInstructor,
  updateTrainingStream,
} from "@/lib/api/training/streams";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { TrainingStream, TrainingStreamStatus } from "@/types/training";

const copy = {
  ru: {
    back: "Все потоки",
    loading: "Загружаем поток…",
    error: "Не удалось загрузить поток.",
    program: "Программа",
    counterparty: "Контрагент",
    interaction: "Взаимодействие",
    period: "Период обучения",
    participants: "Участников / оплатили",
    instructors: "Преподаватели",
    noInstructors: "Преподаватели не назначены.",
    assign: "Назначить",
    instructorPlaceholder: "Преподаватель организации-контрагента",
    unassign: "Снять",
    upload: "Загрузить пользователей в этот поток",
    editTitle: "Изменить поток",
    name: "Название",
    startsAt: "Начало",
    endsAt: "Окончание",
    status: "Статус",
    saved: "Поток сохранён.",
    assigned: "Преподаватель назначен.",
    unassigned: "Преподаватель снят.",
  },
  en: {
    back: "All streams",
    loading: "Loading the stream…",
    error: "The stream could not be loaded.",
    program: "Program",
    counterparty: "Counterparty",
    interaction: "Interaction",
    period: "Training period",
    participants: "Participants / paid",
    instructors: "Instructors",
    noInstructors: "No instructors assigned.",
    assign: "Assign",
    instructorPlaceholder: "Instructor of the counterparty",
    unassign: "Remove",
    upload: "Upload users to this stream",
    editTitle: "Edit stream",
    name: "Name",
    startsAt: "Start",
    endsAt: "End",
    status: "Status",
    saved: "Stream saved.",
    assigned: "Instructor assigned.",
    unassigned: "Instructor removed.",
  },
} as const;

const statuses: TrainingStreamStatus[] = [
  "draft",
  "enrollment_open",
  "in_progress",
  "completed",
  "cancelled",
];

function StreamForm({
  csrfToken,
  onClose,
  onSaved,
  stream,
}: {
  csrfToken: string;
  onClose: () => void;
  onSaved: (stream: TrainingStream) => void;
  stream: TrainingStream;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [name, setName] = useState(stream.name);
  const [startsAt, setStartsAt] = useState(stream.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(stream.ends_at ?? "");
  const [status, setStatus] = useState(stream.status);
  const mutation = useMutation({
    mutationFn: () =>
      updateTrainingStream(
        stream.id,
        {
          ends_at: endsAt || null,
          name: name.trim(),
          starts_at: startsAt || null,
          status,
        },
        csrfToken,
      ),
    onSuccess: onSaved,
  });

  return (
    <Modal
      closeLabel={common.cancel}
      labelledBy="training-stream-form-title"
      onClose={onClose}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id="training-stream-form-title">
            {text.editTitle}
          </h2>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field htmlFor="stream-name" label={text.name} required>
            <input
              className={fieldInputClass}
              id="stream-name"
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="stream-starts-at" label={text.startsAt}>
              <input
                className={fieldInputClass}
                id="stream-starts-at"
                onChange={(event) => setStartsAt(event.target.value)}
                type="date"
                value={startsAt}
              />
            </Field>
            <Field htmlFor="stream-ends-at" label={text.endsAt}>
              <input
                className={fieldInputClass}
                id="stream-ends-at"
                onChange={(event) => setEndsAt(event.target.value)}
                type="date"
                value={endsAt}
              />
            </Field>
          </div>
          <Field htmlFor="stream-status" label={text.status}>
            <select
              className={fieldInputClass}
              id="stream-status"
              onChange={(event) =>
                setStatus(event.target.value as TrainingStreamStatus)
              }
              value={status}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {streamStatusLabels[locale][value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="space-y-3 border-t px-5 py-4">
          {mutation.isError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {apiErrorMessage(mutation.error, common.unknownError)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={onClose}
              size="m"
              type="button"
              variant="outline"
            >
              {common.cancel}
            </Button>
            <Button
              disabled={!name.trim() || mutation.isPending}
              size="m"
              type="submit"
            >
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function StreamInstructors({
  canUpdate,
  csrfToken,
  onChanged,
  stream,
}: {
  canUpdate: boolean;
  csrfToken: string;
  onChanged: (updated?: TrainingStream) => void;
  stream: TrainingStream;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [instructor, setInstructor] = useState<LookupOption | null>(null);
  const onError = (error: unknown) =>
    toast.error(apiErrorMessage(error, common.unknownError));
  const assignMutation = useMutation({
    mutationFn: (instructorId: string) =>
      assignStreamInstructor(stream.id, instructorId, csrfToken),
    onSuccess: (updated) => {
      toast.success(text.assigned);
      setInstructor(null);
      onChanged(updated);
    },
    onError,
  });
  const unassignMutation = useMutation({
    mutationFn: (instructorId: string) =>
      unassignStreamInstructor(stream.id, instructorId, csrfToken),
    onSuccess: () => {
      toast.success(text.unassigned);
      onChanged();
    },
    onError,
  });

  return (
    <section
      aria-label={text.instructors}
      className="bg-card space-y-3 rounded-xl border p-4"
    >
      <h2 className="text-lg font-medium">{text.instructors}</h2>
      {stream.instructors.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.noInstructors}</p>
      ) : (
        <ul className="space-y-2">
          {stream.instructors.map((item) => (
            <li
              className="flex items-center justify-between gap-2 text-sm"
              key={item.id}
            >
              <span>
                <Link
                  className="underline"
                  href={trainingInstructorHref(item.id)}
                >
                  {item.full_name}
                </Link>
                {item.position ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {item.position}
                  </span>
                ) : null}
              </span>
              {canUpdate ? (
                <Button
                  aria-label={`${text.unassign}: ${item.full_name}`}
                  colorScheme="neutral"
                  disabled={unassignMutation.isPending}
                  onClick={() => unassignMutation.mutate(item.id)}
                  size="s"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canUpdate ? (
        <div className="space-y-2">
          <EntitySelect
            excludeIds={stream.instructors.map((item) => item.id)}
            id={`stream-instructor-${stream.id}`}
            label={text.instructors}
            onChange={setInstructor}
            placeholder={text.instructorPlaceholder}
            queryKey={["training", "instructors", "lookup", stream.id]}
            search={(term) =>
              searchCounterpartyInstructors(
                { b2cClient: stream.b2c_client, university: stream.university },
                term,
              )
            }
            value={instructor}
          />
          <Button
            disabled={!instructor || assignMutation.isPending}
            onClick={() => instructor && assignMutation.mutate(instructor.id)}
            size="m"
            type="button"
          >
            {text.assign}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Страница потока: шапка с данными, заявки и участники (основная рабочая
 * область, здесь же ручная отметка оплаты) и преподаватели.
 */
export function TrainingStreamPage({ streamId }: { streamId: string }) {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const canUpdate = user !== null && can(user, "training.update");
  const canImport = user !== null && can(user, "catalog.import");
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const streamQuery = useQuery({
    queryKey: trainingStreamQueryKey(streamId),
    queryFn: () => getTrainingStream(streamId),
  });

  function refresh(updated?: TrainingStream) {
    if (updated)
      queryClient.setQueryData(trainingStreamQueryKey(updated.id), updated);
    void queryClient.invalidateQueries({ queryKey: trainingStreamsQueryKey() });
  }

  const stream = streamQuery.data;
  if (!stream)
    return (
      <div className="space-y-4">
        <BackLink href="/training/streams" label={text.back} />
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          {streamQuery.isError ? (
            text.error
          ) : (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              {text.loading}
            </>
          )}
        </p>
      </div>
    );

  const isCancelled = stream.status === "cancelled";
  const period =
    stream.starts_at || stream.ends_at
      ? `${stream.starts_at ? formatDate(stream.starts_at, locale) : "…"} — ${
          stream.ends_at ? formatDate(stream.ends_at, locale) : "…"
        }`
      : null;

  return (
    <div className="space-y-5">
      <BackLink href="/training/streams" label={text.back} />

      <header className="bg-card space-y-4 rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium">{stream.name}</h1>
            <span className="mt-2 inline-flex">
              <StatusChip tone={streamStatusTone[stream.status]}>
                {streamStatusLabels[locale][stream.status]}
              </StatusChip>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {canImport && !isCancelled ? (
              <Button asChild colorScheme="neutral" size="m" variant="outline">
                <Link href={`/training/import?stream=${stream.id}`}>
                  <Upload aria-hidden="true" className="size-4" />
                  {text.upload}
                </Link>
              </Button>
            ) : null}
            {canUpdate ? (
              <Button
                colorScheme="neutral"
                onClick={() => setIsEditing(true)}
                size="m"
                type="button"
                variant="outline"
              >
                <Pencil aria-hidden="true" className="size-4" />
                {common.edit}
              </Button>
            ) : null}
          </div>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              [text.program, stream.program.name],
              [text.counterparty, stream.counterparty_name || common.noValue],
              [
                text.interaction,
                <Link
                  className="underline"
                  href={`/interactions?interaction=${stream.interaction}`}
                  key="interaction"
                >
                  № {stream.interaction_number}
                </Link>,
              ],
              [text.period, period ?? common.noValue],
              [
                text.participants,
                `${stream.participants_count ?? 0} / ${stream.paid_count ?? 0}`,
              ],
            ] as [string, ReactNode][]
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                {label}
              </dt>
              <dd className="mt-1">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="bg-card rounded-xl border p-4">
          <TrainingStreamApplications
            canCreate={!isCancelled}
            canUpdate={canUpdate}
            csrfToken={csrfToken}
            streamId={stream.id}
          />
        </div>
        <StreamInstructors
          canUpdate={canUpdate}
          csrfToken={csrfToken}
          onChanged={refresh}
          stream={stream}
        />
      </div>

      {isEditing ? (
        <StreamForm
          csrfToken={csrfToken}
          onClose={() => setIsEditing(false)}
          onSaved={(updated) => {
            toast.success(text.saved);
            setIsEditing(false);
            refresh(updated);
          }}
          stream={stream}
        />
      ) : null}
    </div>
  );
}
