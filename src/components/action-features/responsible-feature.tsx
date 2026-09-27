"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import {
  actionFeatureInitialQueryKey,
  boardQueryKey,
  executeActionFeature,
  getActionFeatureInitial,
} from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  ActionFeatureExecution,
  ExecuteActionFeatureResult,
} from "@/types/action-feature";

const copy = {
  ru: {
    assignTitle: "Назначить ответственного",
    unassignTitle: "Снять ответственного",
    manager: "Ответственный менеджер",
    assignPlaceholder: "Выберите доступного менеджера",
    unassignPlaceholder: "Выберите действующего ответственного",
    registry: "из реестра договора",
    loading: "Загружаем менеджеров…",
    assignEmpty: "Нет доступных менеджеров для назначения.",
    unassignEmpty: "Нет ответственных, которых вы можете снять.",
    assign: "Назначить",
    unassign: "Снять ответственного",
    confirm: "Подтвердить снятие",
    cancel: "Отмена",
    warning: "Открытые задачи этого менеджера вернутся в общий пул.",
    saving: "Сохраняем…",
    assignSuccess: "Ответственный назначен.",
    unassignSuccess: "Ответственный снят.",
    error: "Не удалось изменить ответственного.",
    assigned: "Назначен ответственный",
    unassigned: "Снят ответственный",
  },
  en: {
    assignTitle: "Assign responsible manager",
    unassignTitle: "Remove responsible manager",
    manager: "Responsible manager",
    assignPlaceholder: "Choose an available manager",
    unassignPlaceholder: "Choose a current responsible manager",
    registry: "from contract registry",
    loading: "Loading managers…",
    assignEmpty: "No managers are available for assignment.",
    unassignEmpty: "There are no responsible managers you can remove.",
    assign: "Assign",
    unassign: "Remove responsible",
    confirm: "Confirm removal",
    cancel: "Cancel",
    warning: "This manager's open tasks will return to the shared pool.",
    saving: "Saving…",
    assignSuccess: "Responsible manager assigned.",
    unassignSuccess: "Responsible manager removed.",
    error: "Could not change the responsible manager.",
    assigned: "Assigned responsible manager",
    unassigned: "Removed responsible manager",
  },
} as const;

type ResponsibleFeatureCode = "responsible.assign" | "responsible.unassign";

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  featureCode?: ActionFeatureCode;
  executions?: ActionFeatureExecution[];
  executionNo?: number;
};

export function ResponsibleFeature({
  actionInstanceId,
  csrfToken,
  featureCode,
  workflowInstanceId,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const code: ResponsibleFeatureCode =
    featureCode === "responsible.unassign"
      ? "responsible.unassign"
      : "responsible.assign";
  const isUnassign = code === "responsible.unassign";
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ExecuteActionFeatureResult | null>(null);

  const initialQuery = useQuery({
    queryKey: actionFeatureInitialQueryKey(actionInstanceId, code),
    queryFn: () => getActionFeatureInitial(actionInstanceId, code),
    gcTime: 0,
  });
  const options =
    initialQuery.data?.managers.map((manager) => ({
      id: String(manager.id),
      name: manager.full_name,
      hint: [manager.email, manager.from_registry ? text.registry : ""]
        .filter(Boolean)
        .join(" · "),
    })) ?? [];

  const mutation = useMutation({
    mutationFn: (manager: number) =>
      executeActionFeature(actionInstanceId, code, { manager }, csrfToken),
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError
          ? (mutationError.detail ?? text.error)
          : text.error,
      ),
    onSuccess: (result) => {
      setSaved(result);
      setSelected(null);
      setNeedsConfirmation(false);
      setError(null);
      toast.success(isUnassign ? text.unassignSuccess : text.assignSuccess);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-feature-initial", actionInstanceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["interactions", "list"],
      });
    },
  });

  const title = isUnassign ? text.unassignTitle : text.assignTitle;

  return (
    <section aria-label={title} className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-medium">{title}</h4>
      {initialQuery.isPending ? (
        <p className="text-muted-foreground text-sm">{text.loading}</p>
      ) : initialQuery.isError ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{text.error}</p>
      ) : options.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {isUnassign ? text.unassignEmpty : text.assignEmpty}
        </p>
      ) : (
        <EntitySelect
          id={`${actionInstanceId}-${code}`}
          label={text.manager}
          onChange={(option) => {
            setSelected(option);
            setNeedsConfirmation(false);
            setError(null);
            setSaved(null);
          }}
          options={options}
          placeholder={
            isUnassign ? text.unassignPlaceholder : text.assignPlaceholder
          }
          queryKey={[
            "processes",
            "responsible-feature",
            actionInstanceId,
            code,
          ]}
          value={selected}
        />
      )}

      {selected && isUnassign && needsConfirmation ? (
        <div className="bg-secondary space-y-3 rounded-lg p-3 text-sm">
          <p>{text.warning}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(Number(selected.id))}
              size="m"
              type="button"
            >
              {mutation.isPending ? text.saving : text.confirm}
            </Button>
            <Button
              colorScheme="neutral"
              disabled={mutation.isPending}
              onClick={() => setNeedsConfirmation(false)}
              size="m"
              type="button"
              variant="outline"
            >
              {text.cancel}
            </Button>
          </div>
        </div>
      ) : selected ? (
        <Button
          disabled={mutation.isPending}
          onClick={() => {
            if (isUnassign) setNeedsConfirmation(true);
            else mutation.mutate(Number(selected.id));
          }}
          size="m"
          type="button"
        >
          {mutation.isPending
            ? text.saving
            : isUnassign
              ? text.unassign
              : text.assign}
        </Button>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{error}</p>
      ) : null}
      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {isUnassign ? text.unassigned : text.assigned}:{" "}
          {String(saved.target.data.full_name ?? "")}
        </p>
      ) : null}
    </section>
  );
}
