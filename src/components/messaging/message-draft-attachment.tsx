import { FileText, LoaderCircle, RotateCcw, X } from "lucide-react";

import { formatFileSize } from "@/lib/format-file-size";
import type { Locale } from "@/i18n/translations";
import type { StagedMessageAttachment } from "@/types/messaging";

export type DraftAttachment =
  | {
      status: "uploading";
      localId: string;
      file: File;
    }
  | {
      status: "ready";
      localId: string;
      file: File;
      attachment: StagedMessageAttachment;
    }
  | {
      status: "error";
      localId: string;
      file: File;
      error: string;
    };

const copy = {
  ru: {
    uploading: "Загружаем…",
    removing: "Удаляем…",
    retry: "Повторить загрузку",
    remove: "Удалить",
  },
  en: {
    uploading: "Uploading…",
    removing: "Removing…",
    retry: "Retry upload",
    remove: "Remove",
  },
} as const;

export function MessageDraftAttachment({
  isRemoving,
  item,
  locale,
  onRemove,
  onRetry,
}: {
  isRemoving: boolean;
  item: DraftAttachment;
  locale: Locale;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const text = copy[locale];
  const name = item.file.name;

  return (
    <div className="bg-secondary/50 flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2">
      {item.status === "uploading" || isRemoving ? (
        <LoaderCircle
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 animate-spin"
        />
      ) : (
        <FileText
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
        />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{name}</span>
        <span
          className={
            item.status === "error"
              ? "block text-[0.625rem] text-red-600 dark:text-red-400"
              : "text-muted-foreground block text-[0.625rem]"
          }
        >
          {isRemoving
            ? text.removing
            : item.status === "uploading"
              ? text.uploading
              : item.status === "error"
                ? item.error
                : formatFileSize(item.attachment.size, locale)}
        </span>
      </span>

      {item.status === "error" ? (
        <button
          aria-label={`${text.retry} ${name}`}
          className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2"
          onClick={onRetry}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}

      <button
        aria-label={`${text.remove} ${name}`}
        className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40"
        disabled={isRemoving}
        onClick={onRemove}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
