"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { EntitySelect } from "@/components/ui/entity-select";
import { Button } from "@/components/ui/button";
import { contactPersonsQueryKey } from "@/lib/api/catalog/contact-persons";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import {
  getInteractionContacts,
  interactionContactsQueryKey,
} from "@/lib/api/interactions/contacts";
import { boardQueryKey, executeActionFeature } from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureExecution,
  ExecuteActionFeatureResult,
} from "@/types/action-feature";
import type { InteractionShort } from "@/types/workflow-board";

const copy = {
  ru: {
    title: "Деактивировать контактное лицо",
    choose: "Контактное лицо",
    choosePlaceholder: "Выберите контакт из взаимодействия",
    loading: "Загружаем контакты…",
    empty: "У взаимодействия пока нет привязанных контактов.",
    warning:
      "Контакт станет недоступен для новых привязок во всех взаимодействиях.",
    continue: "Деактивировать контакт",
    confirm: "Подтвердить деактивацию",
    cancel: "Отмена",
    saving: "Деактивируем…",
    success: "Контакт деактивирован.",
    error: "Не удалось деактивировать контакт.",
    deactivated: "Деактивирован контакт",
  },
  en: {
    title: "Deactivate contact person",
    choose: "Contact person",
    choosePlaceholder: "Choose a contact from the interaction",
    loading: "Loading contacts…",
    empty: "The interaction has no linked contacts yet.",
    warning:
      "The contact will no longer be available for new links in any interaction.",
    continue: "Deactivate contact",
    confirm: "Confirm deactivation",
    cancel: "Cancel",
    saving: "Deactivating…",
    success: "Contact deactivated.",
    error: "Could not deactivate the contact.",
    deactivated: "Deactivated contact",
  },
} as const;

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
  executions?: ActionFeatureExecution[];
  executionNo?: number;
};

export function ContactPersonDeactivateFeature({
  actionInstanceId,
  csrfToken,
  workflowInstanceId,
  interaction,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ExecuteActionFeatureResult | null>(null);
  const interactionId = interaction?.id ?? "";
  const contactsQuery = useQuery({
    queryKey: interactionContactsQueryKey(interactionId),
    queryFn: () => getInteractionContacts(interactionId),
    enabled: Boolean(interactionId),
  });
  const options =
    contactsQuery.data?.map(({ contact_person: contact }) => ({
      id: contact.id,
      name: contact.position
        ? `${contact.full_name} · ${contact.position}`
        : contact.full_name,
    })) ?? [];

  const mutation = useMutation({
    mutationFn: (contactPerson: string) =>
      executeActionFeature(
        actionInstanceId,
        "contact_person.deactivate",
        { contact_person: contactPerson },
        csrfToken,
      ),
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError
          ? (mutationError.detail ?? text.error)
          : text.error,
      ),
    onSuccess: (result) => {
      setSaved(result);
      setError(null);
      setNeedsConfirmation(false);
      toast.success(text.success);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      void queryClient.invalidateQueries({
        queryKey: contactPersonsQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: interactionContactsQueryKey(interactionId),
      });
    },
  });

  if (!interaction) {
    return (
      <p className="text-muted-foreground border-t pt-3 text-sm">
        {text.error}
      </p>
    );
  }

  return (
    <section aria-label={text.title} className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-medium">{text.title}</h4>
      {contactsQuery.isPending ? (
        <p className="text-muted-foreground text-sm">{text.loading}</p>
      ) : contactsQuery.isError ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{text.error}</p>
      ) : options.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        <EntitySelect
          id={`${actionInstanceId}-contact-person-deactivate`}
          label={text.choose}
          onChange={(option) => {
            setSelected(option);
            setNeedsConfirmation(false);
            setError(null);
            setSaved(null);
          }}
          options={options}
          placeholder={text.choosePlaceholder}
          queryKey={[
            "interactions",
            "contacts",
            interaction.id,
            "deactivate-feature",
          ]}
          value={selected}
        />
      )}
      {selected ? (
        needsConfirmation ? (
          <div className="bg-secondary space-y-3 rounded-lg p-3 text-sm">
            <p>{text.warning}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(selected.id)}
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
        ) : (
          <Button
            onClick={() => setNeedsConfirmation(true)}
            size="m"
            type="button"
          >
            {text.continue}
          </Button>
        )
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{error}</p>
      ) : null}
      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {text.deactivated}: {String(saved.target.data.full_name ?? "")}
        </p>
      ) : null}
    </section>
  );
}
