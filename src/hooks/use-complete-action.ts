"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  boardQueryKey,
  completeAction,
  uploadActionAttachment,
} from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type { BoardOutcome } from "@/types/workflow-board";

const copy = {
  ru: {
    success: "Действие завершено.",
    workflowCompleted: "Процесс завершён.",
  },
  en: {
    success: "The action is complete.",
    workflowCompleted: "The process is complete.",
  },
} as const;

/** Поля, которые читает завершение: больше хуку от действия ничего не нужно. */
export type CompleteActionTarget = {
  attachments_count: number;
  id: string;
  workflow_instance: string;
};

export type CompleteActionInput = {
  action: CompleteActionTarget;
  comment?: string;
  file?: File | null;
  outcome: BoardOutcome;
};

/**
 * Завершение действия из раздела задач.
 *
 * Файл уходит раньше команды: `is_attachment_required` бэкенд проверяет уже
 * при завершении. Оптимистичного обновления нет — следующие действия
 * запускает движок, повторить его логику на клиенте нельзя.
 */
export function useCompleteAction(csrfToken: string) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      comment,
      file,
      outcome,
    }: CompleteActionInput) => {
      if (outcome.is_attachment_required && action.attachments_count === 0) {
        if (!file) throw new Error("missing-file");
        await uploadActionAttachment(action.id, file, csrfToken);
      }

      return completeAction(
        action.id,
        { comment: comment?.trim() ?? "", outcome: outcome.id },
        csrfToken,
      );
    },
    onSuccess: (result, { action }) => {
      toast.success(
        result?.workflow_completed ? text.workflowCompleted : text.success,
      );
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      // Кеш доски переживает переход между разделами: без инвалидации на
      // диаграмме осталось бы действие, которое только что завершили.
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(action.workflow_instance),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "workflow-instances"],
      });
    },
  });
}
