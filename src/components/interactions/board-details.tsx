"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  ActionFeatureRenderer,
  FeatureExecutionHistory,
} from "@/components/action-features/action-feature-renderer";
import {
  ActionRollbackHistory,
  StageRollbackHistory,
} from "@/components/interactions/rollback-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { useCompleteAction } from "@/hooks/use-complete-action";
import {
  boardQueryKey,
  cancelAction,
  cancelStage,
} from "@/lib/api/processes/board";
import { rollbacksQueryKey } from "@/lib/api/processes/rollbacks";
import {
  resolveActionErrorMessage,
  resolveRollbackErrorMessage,
} from "@/lib/workflow/action-errors";
import {
  resolveActionState,
  type BoardSelection,
} from "@/lib/workflow/board-to-gantt";
import { formatMoment, formatRange } from "@/lib/workflow/format-moment";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { useLocale } from "@/providers/locale-provider";
import type {
  BoardAction,
  BoardStage,
  CancelStageMode,
  InteractionShort,
} from "@/types/workflow-board";

const copy = {
  ru: {
    actual: "Факт",
    attachButton: "Выбрать файл",
    attachments: "Вложений",
    attachmentRequired: "Этот исход требует вложение.",
    cancelStage: "Откатить на предыдущий этап",
    cancelStageHint:
      "Этапы после этапа возврата снова перейдут в ожидание и будут выполнены заново.",
    close: "Закрыть",
    comment: "Комментарий",
    commentRequired: "Этот исход требует комментарий.",
    complete: "Завершить действие",
    completing: "Завершаем…",
    chooseOutcome: "Выберите результат",
    confirmReturn: "Подтвердить возврат",
    confirmRollback: "Подтвердить откат",
    empty: "Выберите действие или этап на диаграмме.",
    mode: "Как вернуть этап",
    modes: {
      last_only: "Только последнее обязательное действие",
      restart: "Заново целиком",
    },
    noDates: "нет дат",
    optional: "Необязательное",
    outcome: "Результат",
    overdue: "Просрочено",
    plan: "План",
    reason: "Причина",
    reasonRequired: "Причина обязательна.",
    responsible: "Ответственный",
    result: "Результат",
    returnTo: "Вернуться к этапу",
    rollbackAction: "Откатить действие",
    rollbackDone: "Действие откачено, создано новое исполнение.",
    rollbackHint:
      "Действие будет выполнено заново: движок создаст новое исполнение вместо текущего.",
    stageCancelled: "Этап отменён, процесс вернулся назад.",
    stageClosed: "Закрыт",
    stageOpened: "Открыт",
    unassigned: "не назначен",
  },
  en: {
    actual: "Actual",
    attachButton: "Choose file",
    attachments: "Attachments",
    attachmentRequired: "This outcome requires an attachment.",
    cancelStage: "Roll back to the previous stage",
    cancelStageHint:
      "Stages after the return point go back to pending and will be done again.",
    close: "Close",
    comment: "Comment",
    commentRequired: "This outcome requires a comment.",
    complete: "Complete action",
    completing: "Completing…",
    chooseOutcome: "Choose an outcome",
    confirmReturn: "Confirm return",
    confirmRollback: "Confirm rollback",
    empty: "Pick an action or a stage on the chart.",
    mode: "How to return the stage",
    modes: {
      last_only: "Only the last required action",
      restart: "Restart entirely",
    },
    noDates: "no dates",
    optional: "Optional",
    outcome: "Outcome",
    overdue: "Overdue",
    plan: "Plan",
    reason: "Reason",
    reasonRequired: "A reason is required.",
    responsible: "Responsible",
    result: "Result",
    returnTo: "Return to stage",
    rollbackAction: "Roll back the action",
    rollbackDone: "The action was rolled back; a new execution was created.",
    rollbackHint:
      "The action will be done again: the engine creates a new execution instead of the current one.",
    stageCancelled: "The stage was cancelled and the process moved back.",
    stageClosed: "Closed",
    stageOpened: "Opened",
    unassigned: "unassigned",
  },
} as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

type PanelProps = {
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
};

function ActionPanel({
  action,
  csrfToken,
  // Канбан хранит открытое действие снимком в useState и не перечитывает
  // его при рефетче — в отличие от диаграммы, которая каждый раз находит
  // строку заново по id. Без колбэка панель после успеха показывала бы
  // устаревшую форму и второе нажатие било бы в бэкенд с 409.
  onActionChanged,
  workflowInstanceId,
  interaction,
}: PanelProps & { action: BoardAction; onActionChanged?: () => void }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [outcomeId, setOutcomeId] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const rollback = useMutation({
    mutationFn: () =>
      cancelAction(action.id, { reason: rollbackReason.trim() }, csrfToken),
    onError: (mutationError) =>
      setRollbackError(resolveRollbackErrorMessage(mutationError, locale)),
    onSuccess: () => {
      setRollbackError(null);
      setIsRollingBack(false);
      setRollbackReason("");
      toast.success(text.rollbackDone);
      // Откат меняет и диаграмму, и колонки задач: новое исполнение попадает
      // в «Ожидает» или «В работе».
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      void queryClient.invalidateQueries({
        queryKey: rollbacksQueryKey(workflowInstanceId),
      });
      onActionChanged?.();
    },
  });

  const canRollback = action.status === "completed";
  const canConfirmRollback =
    rollbackReason.trim().length > 0 && !rollback.isPending;

  const outcome = action.available_outcomes.find(
    (candidate) => candidate.id === outcomeId,
  );
  const outcomeOptions: LookupOption[] = action.available_outcomes.map(
    (candidate) => ({
      id: candidate.id,
      name: candidate.name,
    }),
  );
  const selectedOutcome =
    outcomeOptions.find((candidate) => candidate.id === outcomeId) ?? null;
  const needsComment = outcome?.is_comment_required ?? false;
  const needsAttachment =
    (outcome?.is_attachment_required ?? false) &&
    action.attachments_count === 0;

  const mutation = useCompleteAction(csrfToken);

  const state = resolveActionState(action);
  const canSubmit =
    Boolean(outcome) &&
    (!needsComment || comment.trim().length > 0) &&
    (!needsAttachment || file !== null) &&
    !mutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-medium">{action.name}</h3>
        {action.execution_no > 1 ? (
          <Badge variant="neutral">
            {locale === "ru" ? "Попытка" : "Attempt"} {action.execution_no}
          </Badge>
        ) : null}
        {action.is_optional ? (
          <Badge variant="neutral">{text.optional}</Badge>
        ) : null}
        {state === "overdue" ? (
          <Badge variant="primary">{text.overdue}</Badge>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Field
          label={text.responsible}
          value={action.responsible?.full_name ?? text.unassigned}
        />
        <Field
          label={text.attachments}
          value={String(action.attachments_count)}
        />
        <Field
          label={text.plan}
          value={formatRange(
            action.planned_start,
            action.planned_end,
            locale,
            text.noDates,
          )}
        />
        <Field
          label={text.actual}
          value={formatRange(
            action.actual_start,
            action.actual_end,
            locale,
            text.noDates,
          )}
        />
      </dl>

      {action.result ? (
        <div className="bg-secondary rounded-lg p-3 text-sm">
          <p className="font-medium">{action.result.outcome_name}</p>
          {action.result.comment ? (
            <p className="text-muted-foreground mt-1">
              {action.result.comment}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1 text-xs">
            {action.result.created_by?.full_name}
            {action.result.created_by ? " · " : ""}
            {formatMoment(action.result.created_at, locale)}
          </p>
        </div>
      ) : null}

      <ActionFeatureRenderer
        actionInstanceId={action.id}
        csrfToken={csrfToken}
        executionNo={action.execution_no}
        executions={action.feature_executions}
        features={action.available_features}
        workflowInstanceId={workflowInstanceId}
        interaction={interaction ?? action.interaction}
      />

      {action.available_outcomes.length > 0 ? (
        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!outcome) return;
            setError(null);
            mutation.mutate(
              {
                // Доска знает процесс из своих пропсов: в BoardAction его нет.
                action: { ...action, workflow_instance: workflowInstanceId },
                comment,
                file,
                outcome,
              },
              {
                onError: (mutationError) =>
                  setError(
                    mutationError instanceof Error &&
                      mutationError.message === "missing-file"
                      ? text.attachmentRequired
                      : resolveActionErrorMessage(mutationError, locale),
                  ),
                onSuccess: () => onActionChanged?.(),
              },
            );
          }}
        >
          <div>
            <label
              className="text-muted-foreground text-xs"
              htmlFor="board-outcome"
            >
              {text.outcome}
            </label>
            <EntitySelect
              clearable={false}
              id="board-outcome"
              label={text.outcome}
              onChange={(option) => setOutcomeId(option?.id ?? "")}
              options={outcomeOptions}
              placement="top"
              placeholder={text.chooseOutcome}
              queryKey={["workflow", "action-outcomes", action.id]}
              value={selectedOutcome}
            />
          </div>

          <div>
            <label
              className="text-muted-foreground text-xs"
              htmlFor="board-comment"
            >
              {text.comment}
              {needsComment ? " *" : ""}
            </label>
            <textarea
              className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              id="board-comment"
              onChange={(event) => setComment(event.target.value)}
              required={needsComment}
              rows={3}
              value={comment}
            />
            {needsComment ? (
              <p className="text-muted-foreground mt-1 text-xs">
                {text.commentRequired}
              </p>
            ) : null}
          </div>

          {needsAttachment ? (
            <div>
              <label
                className="text-muted-foreground text-xs"
                htmlFor="board-file"
              >
                {text.attachButton} *
              </label>
              <input
                accept=".png,.jpg,.jpeg,.pdf,.zip,.gz,.gzip,.rar,.doc,.docx,.xls,.xlsx"
                className="mt-1 w-full text-sm"
                id="board-file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {text.attachmentRequired}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">{error}</p>
          ) : null}

          <Button disabled={!canSubmit} size="m" type="submit">
            {mutation.isPending ? text.completing : text.complete}
          </Button>
        </form>
      ) : null}

      {canRollback ? (
        <div className="space-y-3 border-t pt-4">
          {isRollingBack ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                rollback.mutate();
              }}
            >
              <p className="text-muted-foreground text-xs">
                {text.rollbackHint}
              </p>

              <div>
                <label
                  className="text-muted-foreground text-xs"
                  htmlFor="action-rollback-reason"
                >
                  {text.reason} *
                </label>
                <textarea
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  id="action-rollback-reason"
                  onChange={(event) => setRollbackReason(event.target.value)}
                  required
                  rows={2}
                  value={rollbackReason}
                />
              </div>

              {rollbackError ? (
                <p className="text-sm text-[var(--atmr-brand-orange)]">
                  {rollbackError}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button disabled={!canConfirmRollback} size="m" type="submit">
                  {text.confirmRollback}
                </Button>
                <Button
                  colorScheme="neutral"
                  onClick={() => setIsRollingBack(false)}
                  size="m"
                  type="button"
                  variant="ghost"
                >
                  {text.close}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              colorScheme="neutral"
              onClick={() => setIsRollingBack(true)}
              size="m"
              type="button"
              variant="outline"
            >
              {text.rollbackAction}
            </Button>
          )}
        </div>
      ) : null}

      <ActionRollbackHistory
        actionDefinitionId={action.action.id}
        workflowInstanceId={workflowInstanceId}
      />
      <FeatureExecutionHistory executions={action.feature_executions} />
    </div>
  );
}

function StagePanel({
  csrfToken,
  stage,
  workflowInstanceId,
}: PanelProps & { stage: BoardStage }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [mode, setMode] = useState<CancelStageMode>("restart");
  const [reason, setReason] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      cancelStage(
        stage.id,
        {
          mode,
          reason: reason.trim(),
          return_to: returnTo || (stage.return_options[0]?.id ?? null),
        },
        csrfToken,
      ),
    onError: (mutationError) =>
      setError(resolveActionErrorMessage(mutationError, locale)),
    onSuccess: () => {
      setError(null);
      setIsCancelling(false);
      toast.success(text.stageCancelled);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      // Откат этапа снова открывает действия — колонки задач устареют так
      // же, как после отката отдельного действия.
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      void queryClient.invalidateQueries({
        queryKey: rollbacksQueryKey(workflowInstanceId),
      });
    },
  });

  const canReturn = stage.return_options.length > 0;
  const needsChoice = stage.return_options.length > 1;
  const canSubmit =
    reason.trim().length > 0 &&
    (!needsChoice || returnTo !== "") &&
    !mutation.isPending;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">{stage.stage.name}</h3>

      <dl className="grid grid-cols-2 gap-3">
        <Field
          label={text.stageOpened}
          value={formatMoment(stage.started_at, locale) ?? text.noDates}
        />
        <Field
          label={text.stageClosed}
          value={formatMoment(stage.completed_at, locale) ?? text.noDates}
        />
      </dl>

      {canReturn ? (
        <div className="space-y-3 border-t pt-4">
          {isCancelling ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <p className="text-muted-foreground text-xs">
                {text.cancelStageHint}
              </p>

              {needsChoice ? (
                <div>
                  <label
                    className="text-muted-foreground text-xs"
                    htmlFor="stage-return-to"
                  >
                    {text.returnTo} *
                  </label>
                  <select
                    className="border-input bg-background mt-1 h-9 w-full rounded-lg border px-3 text-sm"
                    id="stage-return-to"
                    onChange={(event) => setReturnTo(event.target.value)}
                    required
                    value={returnTo}
                  >
                    <option value="">—</option>
                    {stage.return_options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.stage_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <fieldset>
                <legend className="text-muted-foreground text-xs">
                  {text.mode}
                </legend>
                {(["restart", "last_only"] as const).map((value) => (
                  <label
                    className="mt-1 flex items-center gap-2 text-sm"
                    key={value}
                  >
                    <input
                      checked={mode === value}
                      name="stage-mode"
                      onChange={() => setMode(value)}
                      type="radio"
                      value={value}
                    />
                    {text.modes[value]}
                  </label>
                ))}
              </fieldset>

              <div>
                <label
                  className="text-muted-foreground text-xs"
                  htmlFor="stage-reason"
                >
                  {text.reason} *
                </label>
                <textarea
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  id="stage-reason"
                  onChange={(event) => setReason(event.target.value)}
                  required
                  rows={2}
                  value={reason}
                />
              </div>

              {error ? (
                <p className="text-sm text-[var(--atmr-brand-orange)]">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button disabled={!canSubmit} size="m" type="submit">
                  {text.confirmReturn}
                </Button>
                <Button
                  colorScheme="neutral"
                  onClick={() => setIsCancelling(false)}
                  size="m"
                  type="button"
                  variant="ghost"
                >
                  {text.close}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              colorScheme="neutral"
              onClick={() => setIsCancelling(true)}
              size="m"
              type="button"
              variant="outline"
            >
              {text.cancelStage}
            </Button>
          )}
        </div>
      ) : null}

      <StageRollbackHistory
        stageInstanceId={stage.id}
        workflowInstanceId={workflowInstanceId}
      />
    </div>
  );
}

export function BoardDetails({
  csrfToken,
  onActionChanged,
  selection,
  workflowInstanceId,
  interaction,
}: PanelProps & {
  onActionChanged?: () => void;
  selection: BoardSelection | null;
}) {
  const { locale } = useLocale();

  if (!selection) {
    return (
      <p className="text-muted-foreground text-sm">{copy[locale].empty}</p>
    );
  }

  // key сбрасывает форму при переходе к другой строке: выбранный исход и
  // комментарий не должны перетекать с одного действия на другое.
  if (selection.kind === "action") {
    return (
      <ActionPanel
        action={selection.action}
        csrfToken={csrfToken}
        key={selection.action.id}
        onActionChanged={onActionChanged}
        workflowInstanceId={workflowInstanceId}
        interaction={interaction}
      />
    );
  }

  return (
    <StagePanel
      csrfToken={csrfToken}
      key={selection.stage.id}
      stage={selection.stage}
      workflowInstanceId={workflowInstanceId}
    />
  );
}
