"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { getContactPersons } from "@/lib/api/catalog/contact-persons";
import type { PaginatedResponse } from "@/types/api";
import { executeActionFeature, boardQueryKey } from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type { ActionFeatureExecution } from "@/types/action-feature";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import type { InteractionShort } from "@/types/workflow-board";
import type { ContactPerson } from "@/types/contact-person";

const copy = {
  ru: {
    title: "Выбрать существующий контакт",
    search: "Поиск контакта",
    placeholder: "ФИО, должность, email или телефон",
    choose: "Выбрать",
    chosen: "Выбран контакт",
    empty: "Контакты не найдены.",
    loading: "Загружаем…",
    saving: "Сохраняем…",
    success: "Контакт выбран.",
    error: "Не удалось выбрать контакт.",
  },
  en: {
    title: "Select an existing contact",
    search: "Search contact",
    placeholder: "Name, position, email or phone",
    choose: "Select",
    chosen: "Selected contact",
    empty: "No contacts found.",
    loading: "Loading…",
    saving: "Saving…",
    success: "Contact selected.",
    error: "Could not select the contact.",
  },
} as const;

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
  executionNo?: number;
  executions?: ActionFeatureExecution[];
};

/** Каталог в разных версиях API возвращает либо страницу, либо массив. */
export function contactPersonOptions(
  response: PaginatedResponse<ContactPerson> | ContactPerson[],
): LookupOption[] {
  const contacts = Array.isArray(response) ? response : response.results;

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.position
      ? `${contact.full_name} · ${contact.position}`
      : contact.full_name,
  }));
}

export function ContactPersonSelectFeature({
  actionInstanceId,
  csrfToken,
  workflowInstanceId,
  interaction,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counterparty = interaction?.university
    ? { universityId: interaction.university.id }
    : { b2cClientId: interaction?.b2c_client?.id ?? null };
  const mutation = useMutation({
    mutationFn: () =>
      executeActionFeature(
        actionInstanceId,
        "contact_person.select",
        { contact_person: selected?.id as string },
        csrfToken,
      ),
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error ? mutationError.message : text.error,
      ),
    onSuccess: () => {
      setError(null);
      toast.success(text.success);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
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
      <EntitySelect
        disabled={!interaction}
        id={`${actionInstanceId}-contact-select`}
        label={text.search}
        onChange={setSelected}
        placeholder={text.placeholder}
        queryKey={[
          "catalog",
          "contact-persons",
          "feature-select",
          counterparty,
        ]}
        search={async (term) => {
          const response = await getContactPersons({
            ...counterparty,
            page: 1,
            search: term,
          });
          return contactPersonOptions(response);
        }}
        value={selected}
      />
      {error ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{error}</p>
      ) : null}
      <Button
        disabled={!selected || mutation.isPending}
        onClick={() => mutation.mutate()}
        size="m"
        type="button"
      >
        {mutation.isPending ? text.saving : text.choose}
      </Button>
    </section>
  );
}
