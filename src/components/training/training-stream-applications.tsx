"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  ConfirmDeleteButton,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { applicationStatusLabels } from "@/components/training/training-labels";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { StatusChip } from "@/components/ui/status-chip";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import {
  addApplicationLearner,
  cancelTrainingApplication,
  createTrainingApplication,
  deleteTrainingApplication,
  getStreamApplications,
  removeApplicationLearner,
  setApplicationLearnerPaid,
  streamApplicationsQueryKey,
} from "@/lib/api/training/applications";
import { searchLearners } from "@/lib/api/training/learners";
import { trainingStreamsQueryKey } from "@/lib/api/training/streams";
import { formatDate } from "@/lib/format-date";
import { useLocale } from "@/providers/locale-provider";
import type { TrainingApplication } from "@/types/training";

const copy = {
  ru: {
    title: "Заявки",
    create: "Создать заявку",
    commentPlaceholder: "Комментарий к заявке (необязательно)",
    save: "Создать",
    cancel: "Отмена",
    empty:
      "Заявок пока нет. Их создаёт загрузка «Пользователей» с этим потоком или кнопка «Создать заявку».",
    loading: "Загружаем заявки…",
    error: "Не удалось загрузить заявки.",
    applicationFrom: "Заявка от",
    cancelApplication: "Отменить заявку",
    noParticipants: "В заявке пока нет участников.",
    learner: "Обучающийся",
    contacts: "Контакты",
    paid: "Оплачено",
    enrolled: "Зачислен",
    notEnrolled: "Не зачислен",
    addLearner: "Добавить участника",
    add: "Добавить",
    learnerPlaceholder: "Найдите обучающегося по ФИО",
    remove: "Убрать из заявки",
    created: "Заявка создана.",
    cancelled: "Заявка отменена.",
    deleted: "Заявка удалена.",
    added: "Участник добавлен.",
    removed: "Участник убран из заявки.",
    paidOn: "Оплата отмечена.",
    paidOff: "Отметка об оплате снята.",
  },
  en: {
    title: "Applications",
    create: "Create application",
    commentPlaceholder: "Application comment (optional)",
    save: "Create",
    cancel: "Cancel",
    empty:
      "No applications yet. They are created by a users upload with this stream or with “Create application”.",
    loading: "Loading applications…",
    error: "Applications could not be loaded.",
    applicationFrom: "Application of",
    cancelApplication: "Cancel application",
    noParticipants: "The application has no participants yet.",
    learner: "Learner",
    contacts: "Contacts",
    paid: "Paid",
    enrolled: "Enrolled",
    notEnrolled: "Not enrolled",
    addLearner: "Add participant",
    add: "Add",
    learnerPlaceholder: "Find a learner by name",
    remove: "Remove from application",
    created: "Application created.",
    cancelled: "Application cancelled.",
    deleted: "Application deleted.",
    added: "Participant added.",
    removed: "Participant removed.",
    paidOn: "Payment marked.",
    paidOff: "Payment mark removed.",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

function useInvalidate(streamId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: streamApplicationsQueryKey(streamId),
    });
    // Счётчики участников и оплативших в списке и карточке потока
    void queryClient.invalidateQueries({ queryKey: trainingStreamsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: ["training", "learners"] });
  };
}

function AddParticipant({
  applicationId,
  csrfToken,
  onDone,
  streamId,
  text,
}: {
  applicationId: string;
  csrfToken: string;
  onDone: () => void;
  streamId: string;
  text: Text;
}) {
  const { locale } = useLocale();
  const invalidate = useInvalidate(streamId);
  const [learner, setLearner] = useState<LookupOption | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      addApplicationLearner(
        {
          application: applicationId,
          is_paid: isPaid,
          learner: (learner as LookupOption).id,
        },
        csrfToken,
      ),
    onSuccess: () => {
      toast.success(text.added);
      invalidate();
      onDone();
    },
  });

  return (
    <div className="bg-secondary space-y-2 rounded-lg p-3">
      <EntitySelect
        id={`add-learner-${applicationId}`}
        label={text.learner}
        onChange={setLearner}
        placeholder={text.learnerPlaceholder}
        queryKey={["training", "learners", "lookup"]}
        search={searchLearners}
        value={learner}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={isPaid}
          onChange={(event) => setIsPaid(event.target.checked)}
          type="checkbox"
        />
        {text.paid}
      </label>
      {mutation.isError ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">
          {apiErrorMessage(mutation.error, registryCopy[locale].unknownError)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          disabled={!learner || mutation.isPending}
          onClick={() => mutation.mutate()}
          size="s"
          type="button"
        >
          {text.add}
        </Button>
        <Button
          colorScheme="neutral"
          onClick={onDone}
          size="s"
          type="button"
          variant="outline"
        >
          {text.cancel}
        </Button>
      </div>
    </div>
  );
}

function ApplicationCard({
  application,
  canUpdate,
  csrfToken,
  streamId,
  text,
}: {
  application: TrainingApplication;
  canUpdate: boolean;
  csrfToken: string;
  streamId: string;
  text: Text;
}) {
  const { locale } = useLocale();
  const common = registryCopy[locale];
  const invalidate = useInvalidate(streamId);
  const [isAdding, setIsAdding] = useState(false);
  const isActive = application.status === "new";
  const onError = (error: unknown) =>
    toast.error(apiErrorMessage(error, common.unknownError));

  const paidMutation = useMutation({
    mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) =>
      setApplicationLearnerPaid(id, isPaid, csrfToken),
    onSuccess: (participant) => {
      toast.success(participant.is_paid ? text.paidOn : text.paidOff);
      invalidate();
    },
    onError,
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => removeApplicationLearner(id, csrfToken),
    onSuccess: () => {
      toast.success(text.removed);
      invalidate();
    },
    onError,
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelTrainingApplication(application.id, csrfToken),
    onSuccess: () => {
      toast.success(text.cancelled);
      invalidate();
    },
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteTrainingApplication(application.id, csrfToken),
    onSuccess: () => {
      toast.success(text.deleted);
      invalidate();
    },
    onError,
  });
  const hasPaid = application.participants.some(
    (participant) => participant.is_paid,
  );

  return (
    <article
      aria-label={`${text.applicationFrom} ${formatDate(application.created_at, locale)}`}
      className="space-y-3 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {text.applicationFrom} {formatDate(application.created_at, locale)}
          </span>
          <StatusChip tone={isActive ? "accent" : "neutral"}>
            {applicationStatusLabels[locale][application.status]}
          </StatusChip>
        </div>
        {canUpdate ? (
          <div className="flex flex-wrap gap-2">
            {isActive ? (
              <Button
                colorScheme="neutral"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                size="s"
                type="button"
                variant="outline"
              >
                {text.cancelApplication}
              </Button>
            ) : null}
            {!hasPaid ? (
              <ConfirmDeleteButton
                isPending={deleteMutation.isPending}
                locale={locale}
                onConfirm={() => deleteMutation.mutate()}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {application.comment ? (
        <p className="text-muted-foreground text-sm">{application.comment}</p>
      ) : null}

      {application.participants.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.noParticipants}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th className="py-1 font-medium">{text.learner}</th>
              <th className="py-1 font-medium">{text.contacts}</th>
              <th className="py-1 font-medium">{text.paid}</th>
              <th className="py-1 font-medium">{text.enrolled}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {application.participants.map((participant) => (
              <tr className="border-t" key={participant.id}>
                <td className="py-2">{participant.learner.full_name}</td>
                <td className="text-muted-foreground py-2">
                  {[participant.learner.email, participant.learner.phone]
                    .filter(Boolean)
                    .join(" · ") || common.noValue}
                </td>
                <td className="py-2">
                  <input
                    aria-label={`${text.paid}: ${participant.learner.full_name}`}
                    checked={participant.is_paid}
                    disabled={!canUpdate || paidMutation.isPending}
                    onChange={(event) =>
                      paidMutation.mutate({
                        id: participant.id,
                        isPaid: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </td>
                <td className="py-2">
                  <StatusChip
                    tone={participant.is_enrolled ? "positive" : "neutral"}
                  >
                    {participant.is_enrolled ? text.enrolled : text.notEnrolled}
                  </StatusChip>
                </td>
                <td className="py-2 text-right">
                  {canUpdate && !participant.is_paid ? (
                    <Button
                      aria-label={`${text.remove}: ${participant.learner.full_name}`}
                      colorScheme="neutral"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(participant.id)}
                      size="s"
                      type="button"
                      variant="ghost"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canUpdate && isActive ? (
        isAdding ? (
          <AddParticipant
            applicationId={application.id}
            csrfToken={csrfToken}
            onDone={() => setIsAdding(false)}
            streamId={streamId}
            text={text}
          />
        ) : (
          <Button
            colorScheme="neutral"
            onClick={() => setIsAdding(true)}
            size="s"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" />
            {text.addLearner}
          </Button>
        )
      ) : null}
    </article>
  );
}

/**
 * Заявки потока с участниками. Здесь же ручная работа с оплатой: создать
 * заявку, добавить участника (сразу с отметкой «Оплачено») и поставить или
 * снять отметку — без загрузки JSON оплат.
 */
export function TrainingStreamApplications({
  canCreate,
  canUpdate,
  csrfToken,
  streamId,
}: {
  /** Создавать заявки можно, пока поток не отменён. */
  canCreate: boolean;
  canUpdate: boolean;
  csrfToken: string;
  streamId: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const invalidate = useInvalidate(streamId);
  const [isCreating, setIsCreating] = useState(false);
  const [comment, setComment] = useState("");

  const applicationsQuery = useQuery({
    queryKey: streamApplicationsQueryKey(streamId),
    queryFn: () => getStreamApplications(streamId),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createTrainingApplication(
        { comment: comment.trim(), stream: streamId },
        csrfToken,
      ),
    onSuccess: () => {
      toast.success(text.created);
      setIsCreating(false);
      setComment("");
      invalidate();
    },
  });
  const applications = applicationsQuery.data?.results ?? [];

  return (
    <section aria-label={text.title} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{text.title}</h2>
        {canUpdate && canCreate && !isCreating ? (
          <Button onClick={() => setIsCreating(true)} size="s" type="button">
            <Plus aria-hidden="true" className="size-4" />
            {text.create}
          </Button>
        ) : null}
      </div>

      {isCreating ? (
        <div className="bg-secondary space-y-2 rounded-lg p-3">
          <textarea
            aria-label={text.commentPlaceholder}
            className={`${fieldInputClass} h-20`}
            onChange={(event) => setComment(event.target.value)}
            placeholder={text.commentPlaceholder}
            value={comment}
          />
          {createMutation.isError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {apiErrorMessage(createMutation.error, common.unknownError)}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              size="s"
              type="button"
            >
              {text.save}
            </Button>
            <Button
              colorScheme="neutral"
              onClick={() => setIsCreating(false)}
              size="s"
              type="button"
              variant="outline"
            >
              {text.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {applicationsQuery.isPending ? (
        <p className="text-muted-foreground text-sm">{text.loading}</p>
      ) : applicationsQuery.isError ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{text.error}</p>
      ) : applications.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        applications.map((application) => (
          <ApplicationCard
            application={application}
            canUpdate={canUpdate}
            csrfToken={csrfToken}
            key={application.id}
            streamId={streamId}
            text={text}
          />
        ))
      )}
    </section>
  );
}
