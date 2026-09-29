"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCompleteAction } from "@/hooks/use-complete-action";
import { resolveActionErrorMessage } from "@/lib/workflow/action-errors";
import { useLocale } from "@/providers/locale-provider";
import type { ActionInstance } from "@/types/action-instance";
import type { BoardOutcome } from "@/types/workflow-board";

const headingId = "complete-action-title";

const copy = {
  ru: {
    attachButton: "Файл",
    attachmentRequired: "Этот исход требует вложение.",
    close: "Закрыть",
    comment: "Комментарий",
    commentRequired: "Этот исход требует комментарий.",
    complete: "Завершить действие",
    completing: "Завершаем…",
    outcome: "Исход",
  },
  en: {
    attachButton: "File",
    attachmentRequired: "This outcome requires an attachment.",
    close: "Close",
    comment: "Comment",
    commentRequired: "This outcome requires a comment.",
    complete: "Complete action",
    completing: "Completing…",
    outcome: "Outcome",
  },
} as const;

type CompleteActionDialogProps = {
  action: ActionInstance;
  csrfToken: string;
  onClose: () => void;
  outcome: BoardOutcome;
};

/**
 * Форма для исхода, который требует комментарий или вложение. Исход без
 * требований завершается кнопкой на карточке, без этого окна.
 */
export function CompleteActionDialog({
  action,
  csrfToken,
  onClose,
  outcome,
}: CompleteActionDialogProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useCompleteAction(csrfToken);

  const needsComment = outcome.is_comment_required;
  const needsAttachment =
    outcome.is_attachment_required && action.attachments_count === 0;
  const canSubmit =
    (!needsComment || comment.trim().length > 0) &&
    (!needsAttachment || file !== null) &&
    !mutation.isPending;

  return (
    <Modal closeLabel={text.close} labelledBy={headingId} onClose={onClose}>
      <form
        className="space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          mutation.mutate(
            { action, comment, file, outcome },
            {
              onError: (mutationError) =>
                setError(
                  mutationError instanceof Error &&
                    mutationError.message === "missing-file"
                    ? text.attachmentRequired
                    : resolveActionErrorMessage(mutationError, locale),
                ),
              onSuccess: onClose,
            },
          );
        }}
      >
        <div>
          <h2 className="text-lg font-medium" id={headingId}>
            {action.action_name_snapshot}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {text.outcome}: {outcome.name}
          </p>
        </div>

        {needsComment ? (
          <div>
            <label
              className="text-muted-foreground text-xs"
              htmlFor="complete-action-comment"
            >
              {text.comment} *
            </label>
            <textarea
              className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              id="complete-action-comment"
              onChange={(event) => setComment(event.target.value)}
              required
              rows={3}
              value={comment}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {text.commentRequired}
            </p>
          </div>
        ) : null}

        {needsAttachment ? (
          <div>
            <label
              className="text-muted-foreground text-xs"
              htmlFor="complete-action-file"
            >
              {text.attachButton} *
            </label>
            <input
              accept=".png,.jpg,.jpeg,.pdf,.zip,.gz,.gzip,.rar,.doc,.docx,.xls,.xlsx"
              className="mt-1 w-full text-sm"
              id="complete-action-file"
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
    </Modal>
  );
}
