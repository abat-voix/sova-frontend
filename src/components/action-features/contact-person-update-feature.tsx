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
  UpdateContactPersonFeaturePayload,
} from "@/types/action-feature";
import type { InteractionShort } from "@/types/workflow-board";

const copy = {
  ru: {
    title: "Изменить контактное лицо",
    choose: "Контактное лицо",
    choosePlaceholder: "Выберите контакт из взаимодействия",
    loading: "Загружаем контакты…",
    empty: "У взаимодействия пока нет привязанных контактов.",
    fullName: "ФИО",
    position: "Должность",
    email: "Email",
    phone: "Телефон",
    telegram: "Telegram",
    save: "Сохранить изменения",
    saving: "Сохраняем…",
    success: "Контакт обновлён.",
    error: "Не удалось обновить контакт.",
    updated: "Обновлён контакт",
  },
  en: {
    title: "Edit contact person",
    choose: "Contact person",
    choosePlaceholder: "Choose a contact from the interaction",
    loading: "Loading contacts…",
    empty: "The interaction has no linked contacts yet.",
    fullName: "Full name",
    position: "Position",
    email: "Email",
    phone: "Phone",
    telegram: "Telegram",
    save: "Save changes",
    saving: "Saving…",
    success: "Contact updated.",
    error: "Could not update the contact.",
    updated: "Updated contact",
  },
} as const;

const fields = ["full_name", "position", "email", "phone", "telegram"] as const;
type FieldName = (typeof fields)[number];
type ContactValues = Omit<UpdateContactPersonFeaturePayload, "contact_person">;

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
  executions?: ActionFeatureExecution[];
  executionNo?: number;
};

export function ContactPersonUpdateFeature({
  actionInstanceId,
  csrfToken,
  workflowInstanceId,
  interaction,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [values, setValues] = useState<ContactValues | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
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
    mutationFn: (payload: UpdateContactPersonFeaturePayload) =>
      executeActionFeature(
        actionInstanceId,
        "contact_person.update",
        payload,
        csrfToken,
      ),
    onError: (error) => {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.detail ?? text.error);
      } else {
        setFormError(text.error);
      }
    },
    onSuccess: (result) => {
      setSaved(result);
      setFieldErrors({});
      setFormError(null);
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

  const labels: Record<FieldName, string> = {
    full_name: text.fullName,
    position: text.position,
    email: text.email,
    phone: text.phone,
    telegram: text.telegram,
  };

  function selectContact(option: LookupOption | null) {
    setSelected(option);
    setFieldErrors({});
    setFormError(null);
    setSaved(null);
    const contact = contactsQuery.data?.find(
      (item) => item.contact_person.id === option?.id,
    )?.contact_person;
    setValues(
      contact
        ? {
            full_name: contact.full_name,
            position: contact.position,
            email: contact.email,
            phone: contact.phone,
            telegram: contact.telegram,
          }
        : null,
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
          id={`${actionInstanceId}-contact-person-update`}
          label={text.choose}
          onChange={selectContact}
          options={options}
          placeholder={text.choosePlaceholder}
          queryKey={[
            "interactions",
            "contacts",
            interaction.id,
            "update-feature",
          ]}
          value={selected}
        />
      )}
      {values && selected ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setFieldErrors({});
            setFormError(null);
            mutation.mutate({ contact_person: selected.id, ...values });
          }}
        >
          {fields.map((name) => (
            <div key={name}>
              <label
                className="text-muted-foreground text-xs"
                htmlFor={`${actionInstanceId}-contact-person-update-${name}`}
              >
                {labels[name]}
                {name === "full_name" ? " *" : ""}
              </label>
              <input
                autoComplete={
                  name === "full_name"
                    ? "name"
                    : name === "email"
                      ? "email"
                      : "off"
                }
                className="border-input bg-background mt-1 h-9 w-full rounded-lg border px-3 text-sm"
                id={`${actionInstanceId}-contact-person-update-${name}`}
                maxLength={
                  name === "full_name" || name === "position"
                    ? 255
                    : name === "phone"
                      ? 50
                      : name === "telegram"
                        ? 64
                        : 254
                }
                onChange={(event) =>
                  setValues((previous) =>
                    previous
                      ? { ...previous, [name]: event.target.value }
                      : previous,
                  )
                }
                required={name === "full_name"}
                type={name === "email" ? "email" : "text"}
                value={values[name]}
              />
              {fieldErrors[name]?.map((message) => (
                <p
                  className="mt-1 text-xs text-[var(--atmr-brand-orange)]"
                  key={message}
                >
                  {message}
                </p>
              ))}
            </div>
          ))}
          {formError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {formError}
            </p>
          ) : null}
          <Button
            disabled={
              mutation.isPending || values.full_name.trim().length === 0
            }
            size="m"
            type="submit"
          >
            {mutation.isPending ? text.saving : text.save}
          </Button>
        </form>
      ) : null}
      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {text.updated}: {String(saved.target.data.full_name ?? "")}
        </p>
      ) : null}
    </section>
  );
}
