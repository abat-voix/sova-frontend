"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  History,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  formatFileSize,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { apiEndpoints } from "@/lib/api/endpoints";
import {
  contractFilesQueryKey,
  contractQueryKey,
  contractsQueryKey,
  getContractFiles,
  uploadContractFile,
} from "@/lib/api/interactions/contracts";
import { useLocale } from "@/providers/locale-provider";
import type { Contract } from "@/types/contract";

const copy = {
  ru: {
    currentFile: "Файл договора",
    noFile: "Файл ещё не загружен.",
    download: "Скачать",
    upload: "Загрузить файл",
    uploadNew: "Загрузить новую версию",
    uploading: "Загружаем…",
    uploaded: "Файл загружен.",
    uploadError: "Не удалось загрузить файл.",
    history: "История файлов",
    historyHint: "Прежние версии не удаляются и доступны для скачивания.",
    current: "Текущий",
    loading: "Загружаем историю…",
    error: "Не удалось загрузить историю файлов.",
    retry: "Повторить",
    empty: "Файлов пока нет.",
    by: "загрузил",
  },
  en: {
    currentFile: "Contract file",
    noFile: "No file uploaded yet.",
    download: "Download",
    upload: "Upload file",
    uploadNew: "Upload a new version",
    uploading: "Uploading…",
    uploaded: "File uploaded.",
    uploadError: "The file could not be uploaded.",
    history: "File history",
    historyHint: "Earlier versions are kept and can be downloaded.",
    current: "Current",
    loading: "Loading the history…",
    error: "The file history could not be loaded.",
    retry: "Retry",
    empty: "No files yet.",
    by: "by",
  },
} as const;

function formatMoment(value: string, locale: "ru" | "en") {
  return new Date(value).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Файлы договора: текущий файл, загрузка новой версии и журнал всех версий.
 *
 * Новая версия не заменяет прежнюю — бэкенд пишет каждую загрузку в журнал
 * `contract-files`, поэтому скачать можно любую из них.
 */
export function ContractFiles({
  contract,
  csrfToken,
}: {
  contract: Contract;
  csrfToken: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const filesQuery = useQuery({
    queryKey: contractFilesQueryKey(contract.id),
    queryFn: () => getContractFiles(contract.id),
    enabled: contract.files_count > 0,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadContractFile(contract.id, file, csrfToken),
    onSuccess: (updated) => {
      toast.success(text.uploaded);
      queryClient.setQueryData(contractQueryKey(contract.id), updated);
      void queryClient.invalidateQueries({
        queryKey: contractFilesQueryKey(contract.id),
      });
      void queryClient.invalidateQueries({ queryKey: contractsQueryKey() });
    },
    onError: (error) => toast.error(apiErrorMessage(error, text.uploadError)),
  });

  const files = filesQuery.data?.results ?? [];
  const hasFile = Boolean(contract.download_url);

  return (
    <div className="mt-5 space-y-5 border-t pt-4">
      <section aria-label={text.currentFile}>
        <h3 className="text-sm font-medium">{text.currentFile}</h3>
        {hasFile ? (
          <div className="bg-secondary/40 mt-3 flex items-center gap-3 rounded-lg border p-3">
            <FileText
              aria-hidden="true"
              className="text-muted-foreground size-5 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-sm">
              {contract.file_name || common.noValue}
            </span>
            <Button asChild colorScheme="neutral" size="m" variant="outline">
              <a download href={contract.download_url ?? undefined}>
                <Download aria-hidden="true" className="size-4" />
                {text.download}
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">{text.noFile}</p>
        )}

        <input
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadMutation.mutate(file);
            event.target.value = "";
          }}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
        <Button
          className="mt-3"
          colorScheme="neutral"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
          size="m"
          type="button"
          variant="outline"
        >
          {uploadMutation.isPending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden="true" className="size-4" />
          )}
          {uploadMutation.isPending
            ? text.uploading
            : hasFile
              ? text.uploadNew
              : text.upload}
        </Button>
      </section>

      {contract.files_count > 0 ? (
        <section aria-label={text.history}>
          <div className="flex items-center gap-2">
            <History
              aria-hidden="true"
              className="text-muted-foreground size-4"
            />
            <h3 className="text-sm font-medium">{text.history}</h3>
            <span className="text-muted-foreground text-xs">
              {contract.files_count}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {text.historyHint}
          </p>

          {filesQuery.isPending ? (
            <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              {text.loading}
            </p>
          ) : filesQuery.isError ? (
            <div className="mt-3 space-y-2">
              <p className="text-muted-foreground text-sm">{text.error}</p>
              <Button
                colorScheme="neutral"
                onClick={() => void filesQuery.refetch()}
                size="m"
                type="button"
                variant="outline"
              >
                {text.retry}
              </Button>
            </div>
          ) : files.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">{text.empty}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {files.map((file) => (
                <li
                  className="flex items-start gap-3 rounded-lg border p-3"
                  key={file.id}
                >
                  <FileText
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium">
                        {file.original_name || common.noValue}
                      </span>
                      {file.is_current ? (
                        <StatusChip tone="accent">{text.current}</StatusChip>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {[
                        formatMoment(file.uploaded_at, locale),
                        formatFileSize(file.size, locale),
                        file.uploaded_by
                          ? `${text.by} ${file.uploaded_by.full_name}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Button
                    asChild
                    colorScheme="neutral"
                    size="icon"
                    variant="ghost"
                  >
                    <a
                      aria-label={`${text.download}: ${file.original_name}`}
                      download
                      href={apiEndpoints.interactions.contractFiles.download(
                        file.id,
                      )}
                      title={text.download}
                    >
                      <Download aria-hidden="true" className="size-4" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
