"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import { searchWorkflows, type LookupOption } from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import {
  startWorkflowInstance,
  workflowInstancesQueryKey,
} from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type { WorkflowAudience } from "@/types/workflow-board";

const copy = {
  ru: {
    cancel: "Отмена",
    errors: {
      already_started: "Этот шаблон уже запущен для взаимодействия.",
      audience_mismatch: "Шаблон не подходит контрагенту взаимодействия.",
      empty_workflow: "В шаблоне нет активных этапов.",
      unknown: "Не удалось запустить процесс.",
      workflow_inactive: "Шаблон неактивен.",
    },
    hint: "Движок создаст все этапы и действия и откроет начальные — дальше процесс ведёт себя сам.",
    placeholder: "Выберите шаблон",
    started: "Процесс запущен.",
    starting: "Запускаем…",
    submit: "Запустить",
    title: "Запустить процесс",
    workflow: "Шаблон workflow",
  },
  en: {
    cancel: "Cancel",
    errors: {
      already_started: "This workflow is already running for the interaction.",
      audience_mismatch: "The workflow does not match the counterparty.",
      empty_workflow: "The workflow has no active stages.",
      unknown: "The process could not be started.",
      workflow_inactive: "The workflow is inactive.",
    },
    hint: "The engine creates every stage and action and opens the starting ones — from there it moves on its own.",
    placeholder: "Pick a workflow",
    started: "The process has started.",
    starting: "Starting…",
    submit: "Start",
    title: "Start a process",
    workflow: "Workflow template",
  },
} as const;

type Locale = keyof typeof copy;

/** Код ошибки движка → текст; правила проверяет бэкенд, а не интерфейс. */
function resolveErrorMessage(error: unknown, locale: Locale) {
  const messages = copy[locale].errors;
  if (!(error instanceof ApiError)) return messages.unknown;

  const code = error.code as keyof typeof messages | null;
  if (code && code in messages) return messages[code];

  return error.detail ?? messages.unknown;
}

export function StartProcessDialog({
  audience,
  csrfToken,
  interactionId,
  onClose,
  onStarted,
}: {
  /** Определяется контрагентом: вуз — `b2b`, клиент — `b2c`. */
  audience: WorkflowAudience;
  csrfToken: string;
  interactionId: string;
  onClose: () => void;
  onStarted: (workflowInstanceId: string) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [workflow, setWorkflow] = useState<LookupOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      startWorkflowInstance(
        { interaction: interactionId, workflow: workflow!.id },
        csrfToken,
      ),
    onError: (mutationError) => {
      setError(resolveErrorMessage(mutationError, locale));
    },
    onSuccess: (instance) => {
      setError(null);
      toast.success(text.started);
      void queryClient.invalidateQueries({
        queryKey: workflowInstancesQueryKey(interactionId),
      });
      onStarted(instance.id);
    },
  });

  return (
    <Modal
      closeLabel={text.cancel}
      labelledBy="start-process-title"
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id="start-process-title">
            {text.title}
          </h2>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <p className="text-muted-foreground text-xs">{text.workflow}</p>
            <div className="mt-1">
              <EntitySelect
                id="start-process-workflow"
                label={text.workflow}
                onChange={setWorkflow}
                placeholder={text.placeholder}
                queryKey={["workflows", "startable", audience]}
                search={(term) => searchWorkflows(term, audience)}
                value={workflow}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs leading-5">{text.hint}</p>
        </div>

        <div className="space-y-3 border-t px-5 py-4">
          {error ? (
            <p className="text-sm text-[var(--atmr-accent-primary)]">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={onClose}
              size="m"
              type="button"
              variant="outline"
            >
              {text.cancel}
            </Button>
            <Button
              disabled={workflow === null || mutation.isPending}
              size="m"
              type="submit"
            >
              {mutation.isPending ? text.starting : text.submit}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
