"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  getInteractionContracts,
  interactionContractsQueryKey,
} from "@/lib/api/interactions/contracts";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { Contract } from "@/types/contract";

const copy = {
  ru: {
    title: "Договоры взаимодействия",
    loading: "Загружаем договоры…",
    error: "Не удалось загрузить договоры.",
    retry: "Повторить",
    empty: "К взаимодействию пока не привязан ни один договор.",
    noNumber: "Без номера",
    draft: "Черновик",
    sent: "Отправлен",
    corrected: "Доработан",
    signed: "Подписан",
    sentAt: "отправлен",
    correctedAt: "доработан",
    signedAt: "подписан",
    currentFile: "Текущий файл",
    noFile: "Файл не загружен",
    versions: "версий",
    download: "Скачать текущий файл",
  },
  en: {
    title: "Interaction contracts",
    loading: "Loading contracts…",
    error: "The contracts could not be loaded.",
    retry: "Retry",
    empty: "No contracts are linked to this interaction yet.",
    noNumber: "No number",
    draft: "Draft",
    sent: "Sent",
    corrected: "Corrected",
    signed: "Signed",
    sentAt: "sent",
    correctedAt: "corrected",
    signedAt: "signed",
    currentFile: "Current file",
    noFile: "No file uploaded",
    versions: "versions",
    download: "Download current file",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

function ContractStage({ contract, text }: { contract: Contract; text: Text }) {
  if (contract.signed_at) {
    return <StatusChip tone="positive">{text.signed}</StatusChip>;
  }
  if (contract.corrected_at) {
    return <StatusChip tone="accent">{text.corrected}</StatusChip>;
  }
  if (contract.sent_at) {
    return <StatusChip tone="accent">{text.sent}</StatusChip>;
  }
  return <StatusChip>{text.draft}</StatusChip>;
}

export function InteractionContractsList({
  className,
  interactionId,
}: {
  className?: string;
  interactionId: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const query = useQuery({
    queryKey: interactionContractsQueryKey(interactionId),
    queryFn: () => getInteractionContracts(interactionId),
  });
  const contracts = query.data?.results ?? [];

  return (
    <section aria-label={text.title} className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">{text.title}</h4>
        {!query.isPending && !query.isError ? (
          <span className="text-muted-foreground text-xs">
            {contracts.length}
          </span>
        ) : null}
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground text-sm">{text.loading}</p>
      ) : query.isError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground text-sm">{text.error}</p>
          <Button
            colorScheme="neutral"
            onClick={() => void query.refetch()}
            size="s"
            type="button"
            variant="ghost"
          >
            {text.retry}
          </Button>
        </div>
      ) : contracts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        <ul className="space-y-2">
          {contracts.map((contract) => {
            const dates = [
              contract.sent_at
                ? `${text.sentAt}: ${formatDate(contract.sent_at, locale)}`
                : null,
              contract.corrected_at
                ? `${text.correctedAt}: ${formatDate(contract.corrected_at, locale)}`
                : null,
              contract.signed_at
                ? `${text.signedAt}: ${formatDate(contract.signed_at, locale)}`
                : null,
            ].filter(Boolean);

            return (
              <li
                className="bg-secondary/40 rounded-lg border p-3"
                key={contract.id}
              >
                <div className="flex items-start gap-3">
                  <FileText
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {contract.contract_number || text.noNumber}
                      </p>
                      <ContractStage contract={contract} text={text} />
                    </div>
                    {dates.length > 0 ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {dates.join(" · ")}
                      </p>
                    ) : null}
                    <div className="text-muted-foreground mt-2 flex min-w-0 items-center gap-2 text-xs">
                      <Paperclip
                        aria-hidden="true"
                        className="size-3 shrink-0"
                      />
                      <span className="truncate">
                        {contract.file_name
                          ? `${text.currentFile}: ${contract.file_name}`
                          : text.noFile}
                      </span>
                      {contract.files_count > 0 ? (
                        <span className="shrink-0">
                          · {contract.files_count} {text.versions}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {contract.download_url ? (
                    <Button
                      asChild
                      colorScheme="neutral"
                      size="icon"
                      variant="ghost"
                    >
                      <a
                        aria-label={`${text.download}: ${contract.contract_number || text.noNumber}`}
                        download
                        href={contract.download_url}
                        title={text.download}
                      >
                        <Download aria-hidden="true" className="size-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
