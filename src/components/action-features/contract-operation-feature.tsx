"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiErrorMessage, Field } from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Input } from "@/components/ui/input";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import {
  contractFilesQueryKey,
  contractQueryKey,
  contractsQueryKey,
  interactionContractsQueryKey,
} from "@/lib/api/interactions/contracts";
import {
  actionFeatureInitialQueryKey,
  boardQueryKey,
  executeActionFeature,
  executeContractFileUploadFeature,
  getActionFeatureInitial,
} from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  ActionFeatureExecution,
  ContractOperationItem,
  ExecuteActionFeatureResult,
} from "@/types/action-feature";
import type { InteractionShort } from "@/types/workflow-board";

type ContractOperationCode =
  | "contract.update"
  | "contract.sign"
  | "contract.file.upload"
  | "contract.mark_sent"
  | "contract.mark_corrected";

const copy = {
  ru: {
    titles: {
      "contract.update": "Изменить договор",
      "contract.sign": "Подписать договор",
      "contract.file.upload": "Загрузить файл договора",
      "contract.mark_sent": "Отметить отправку договора",
      "contract.mark_corrected": "Отметить доработку договора",
    },
    contract: "Договор",
    chooseContract: "Выберите договор",
    number: "Номер договора",
    sentAt: "Дата отправки",
    correctedAt: "Дата доработки",
    signedAt: "Дата подписания",
    file: "Файл договора",
    fileHint:
      "Новая версия станет текущей, прежние версии сохранятся в истории.",
    currentFile: "Текущий файл",
    noFile: "Файл договора ещё не загружен.",
    download: "Скачать",
    sent: "отправлен",
    corrected: "доработан",
    signed: "подписан",
    noNumber: "Без номера",
    noContracts: "Нет договоров, доступных для этой операции.",
    loading: "Загружаем договоры…",
    saving: "Сохраняем…",
    save: "Сохранить",
    upload: "Загрузить",
    sign: "Отметить подписанным",
    success: "Договор обновлён.",
    error: "Не удалось обновить договор.",
    updated: "Обновлён договор",
  },
  en: {
    titles: {
      "contract.update": "Update contract",
      "contract.sign": "Sign contract",
      "contract.file.upload": "Upload contract file",
      "contract.mark_sent": "Mark contract as sent",
      "contract.mark_corrected": "Mark contract as corrected",
    },
    contract: "Contract",
    chooseContract: "Choose a contract",
    number: "Contract number",
    sentAt: "Sent date",
    correctedAt: "Correction date",
    signedAt: "Signing date",
    file: "Contract file",
    fileHint:
      "The new version becomes current; earlier versions stay in history.",
    currentFile: "Current file",
    noFile: "No contract file has been uploaded yet.",
    download: "Download",
    sent: "sent",
    corrected: "corrected",
    signed: "signed",
    noNumber: "No number",
    noContracts: "No contracts are available for this operation.",
    loading: "Loading contracts…",
    saving: "Saving…",
    save: "Save",
    upload: "Upload",
    sign: "Mark as signed",
    success: "Contract updated.",
    error: "The contract could not be updated.",
    updated: "Updated contract",
  },
} as const;

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
  featureCode?: ActionFeatureCode;
  executions?: ActionFeatureExecution[];
  executionNo?: number;
};

function normalizeCode(featureCode?: ActionFeatureCode): ContractOperationCode {
  switch (featureCode) {
    case "contract.update":
    case "contract.sign":
    case "contract.file.upload":
    case "contract.mark_sent":
    case "contract.mark_corrected":
      return featureCode;
    default:
      return "contract.update";
  }
}

function valueForCode(
  code: ContractOperationCode,
  contract: ContractOperationItem,
) {
  if (code === "contract.update") return contract.contract_number;
  if (code === "contract.sign") return contract.signed_at ?? "";
  if (code === "contract.mark_sent") return contract.sent_at ?? "";
  if (code === "contract.mark_corrected") return contract.corrected_at ?? "";
  return "";
}

export function ContractOperationFeature({
  actionInstanceId,
  csrfToken,
  featureCode,
  interaction,
  workflowInstanceId,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const code = normalizeCode(featureCode);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState<ExecuteActionFeatureResult | null>(null);

  const initialQuery = useQuery({
    queryKey: actionFeatureInitialQueryKey(actionInstanceId, code),
    queryFn: () => getActionFeatureInitial(actionInstanceId, code),
    gcTime: 0,
  });
  const contracts = initialQuery.data?.contracts ?? [];
  const selectedContract = contracts.find((item) => item.id === selected?.id);
  const options = contracts.map((contract) => {
    const stages = [
      contract.sent_at ? `${text.sent}: ${contract.sent_at}` : null,
      contract.corrected_at
        ? `${text.corrected}: ${contract.corrected_at}`
        : null,
      contract.signed_at ? `${text.signed}: ${contract.signed_at}` : null,
      contract.file_name ? `${text.currentFile}: ${contract.file_name}` : null,
    ].filter(Boolean);
    return {
      id: contract.id,
      name: contract.contract_number || text.noNumber,
      hint: stages.join(" · ") || undefined,
    };
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No contract selected");
      switch (code) {
        case "contract.update":
          return executeActionFeature(
            actionInstanceId,
            code,
            { contract: selected.id, contract_number: value },
            csrfToken,
          );
        case "contract.sign":
          return executeActionFeature(
            actionInstanceId,
            code,
            { contract: selected.id, signed_at: value },
            csrfToken,
          );
        case "contract.mark_sent":
          return executeActionFeature(
            actionInstanceId,
            code,
            { contract: selected.id, sent_at: value },
            csrfToken,
          );
        case "contract.mark_corrected":
          return executeActionFeature(
            actionInstanceId,
            code,
            { contract: selected.id, corrected_at: value },
            csrfToken,
          );
        case "contract.file.upload":
          if (!file) throw new Error("No file selected");
          return executeContractFileUploadFeature(
            actionInstanceId,
            { contract: selected.id, file },
            csrfToken,
          );
      }
    },
    onSuccess: (result) => {
      const contractId = selected?.id;
      setSaved(result);
      setSelected(null);
      setValue("");
      setFile(null);
      toast.success(text.success);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-feature-initial", actionInstanceId],
      });
      void queryClient.invalidateQueries({ queryKey: contractsQueryKey() });
      if (interaction) {
        void queryClient.invalidateQueries({
          queryKey: interactionContractsQueryKey(interaction.id),
        });
      }
      if (contractId) {
        void queryClient.invalidateQueries({
          queryKey: contractQueryKey(contractId),
        });
        void queryClient.invalidateQueries({
          queryKey: contractFilesQueryKey(contractId),
        });
      }
    },
  });

  if (!interaction) {
    return (
      <p className="text-muted-foreground border-t pt-3 text-sm">
        {text.error}
      </p>
    );
  }

  const dateLabel =
    code === "contract.sign"
      ? text.signedAt
      : code === "contract.mark_sent"
        ? text.sentAt
        : text.correctedAt;
  const canSubmit = Boolean(
    selected &&
    !mutation.isPending &&
    (code === "contract.update" ||
      (code === "contract.file.upload" ? file !== null : value !== "")),
  );

  return (
    <section aria-label={text.titles[code]} className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-medium">{text.titles[code]}</h4>
      {initialQuery.isPending ? (
        <p className="text-muted-foreground text-sm">{text.loading}</p>
      ) : initialQuery.isError ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{text.error}</p>
      ) : contracts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.noContracts}</p>
      ) : (
        <>
          <EntitySelect
            id={`${actionInstanceId}-${code}-contract`}
            label={text.contract}
            onChange={(option) => {
              setSelected(option);
              const contract = contracts.find((item) => item.id === option?.id);
              setValue(contract ? valueForCode(code, contract) : "");
              setFile(null);
              setSaved(null);
            }}
            options={options}
            placeholder={text.chooseContract}
            queryKey={["processes", "contract-feature", code]}
            value={selected}
          />

          {selectedContract ? (
            <div className="bg-secondary/40 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-medium">
                {text.currentFile}
              </p>
              {selectedContract.download_url ? (
                <div className="mt-2 flex items-center gap-3">
                  <FileText
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {selectedContract.file_name}
                  </span>
                  <Button
                    asChild
                    colorScheme="neutral"
                    size="m"
                    variant="outline"
                  >
                    <a download href={selectedContract.download_url}>
                      <Download aria-hidden="true" className="size-4" />
                      {text.download}
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">
                  {text.noFile}
                </p>
              )}
            </div>
          ) : null}

          {selected && code === "contract.update" ? (
            <Field
              htmlFor={`${actionInstanceId}-${code}-number`}
              label={text.number}
            >
              <Input
                id={`${actionInstanceId}-${code}-number`}
                maxLength={255}
                onChange={(event) => setValue(event.target.value)}
                value={value}
              />
            </Field>
          ) : null}

          {selected &&
          code !== "contract.update" &&
          code !== "contract.file.upload" ? (
            <Field
              htmlFor={`${actionInstanceId}-${code}-date`}
              label={dateLabel}
              required
            >
              <Input
                id={`${actionInstanceId}-${code}-date`}
                onChange={(event) => setValue(event.target.value)}
                required
                type="date"
                value={value}
              />
            </Field>
          ) : null}

          {selected && code === "contract.file.upload" ? (
            <Field
              hint={text.fileHint}
              htmlFor={`${actionInstanceId}-${code}-file`}
              label={text.file}
              required
            >
              <Input
                id={`${actionInstanceId}-${code}-file`}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
                type="file"
              />
            </Field>
          ) : null}

          {selected ? (
            <Button
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
              size="m"
              type="button"
            >
              {mutation.isPending
                ? text.saving
                : code === "contract.file.upload"
                  ? text.upload
                  : code === "contract.sign"
                    ? text.sign
                    : text.save}
            </Button>
          ) : null}
        </>
      )}

      {mutation.isError ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">
          {apiErrorMessage(mutation.error, text.error)}
        </p>
      ) : null}
      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {text.updated}:{" "}
          {String(saved.target.data.contract_number ?? text.noNumber)}
        </p>
      ) : null}
    </section>
  );
}
