"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { contactPersonsQueryKey } from "@/lib/api/catalog/contact-persons";
import { interactionContactsQueryKey } from "@/lib/api/interactions/contacts";
import { ApiError } from "@/lib/api/http";
import { executeActionFeature, boardQueryKey } from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureExecution,
  CreateContactPersonFeaturePayload,
  ExecuteActionFeatureResult,
} from "@/types/action-feature";

const copy = {
  ru: {
    title: "Добавить контактное лицо",
    fullName: "ФИО",
    position: "Должность",
    email: "Email",
    phone: "Телефон",
    telegram: "Telegram",
    save: "Добавить контакт",
    saving: "Сохраняем…",
    success: "Контакт добавлен.",
    error: "Не удалось добавить контакт.",
    created: "Создан контакт",
  },
  en: {
    title: "Add a contact person",
    fullName: "Full name",
    position: "Position",
    email: "Email",
    phone: "Phone",
    telegram: "Telegram",
    save: "Add contact",
    saving: "Saving…",
    success: "Contact added.",
    error: "Could not add the contact.",
    created: "Created contact",
  },
} as const;

type Props = {
  actionInstanceId: string;
  executionNo: number;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: import("@/types/workflow-board").InteractionShort;
  executions?: ActionFeatureExecution[];
};

const fields = ["full_name", "position", "email", "phone", "telegram"] as const;
type FieldName = (typeof fields)[number];

export function ContactPersonCreateFeature({
  actionInstanceId,
  executionNo,
  csrfToken,
  workflowInstanceId,
  interaction,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CreateContactPersonFeaturePayload>({
    full_name: "",
    position: "",
    email: "",
    phone: "",
    telegram: "",
  });
  const [saved, setSaved] = useState<ExecuteActionFeatureResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const mutation = useMutation({
    mutationFn: (payload: CreateContactPersonFeaturePayload) =>
      executeActionFeature(
        actionInstanceId,
        "contact_person.create",
        payload,
        csrfToken,
      ),
    onError: (error) => {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.detail);
      } else {
        setFormError(text.error);
      }
    },
    onSuccess: (result) => {
      setSaved(result);
      setValues({
        full_name: "",
        position: "",
        email: "",
        phone: "",
        telegram: "",
      });
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
      if (interaction) {
        void queryClient.invalidateQueries({
          queryKey: interactionContactsQueryKey(interaction.id),
        });
      }
    },
  });

  const labels: Record<FieldName, string> = {
    full_name: text.fullName,
    position: text.position,
    email: text.email,
    phone: text.phone,
    telegram: text.telegram,
  };

  return (
    <section aria-label={text.title} className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-medium">{text.title}</h4>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          setFieldErrors({});
          mutation.mutate(values);
        }}
      >
        {fields.map((name) => (
          <div key={name}>
            <label
              className="text-muted-foreground text-xs"
              htmlFor={`${actionInstanceId}-${executionNo}-${name}`}
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
              id={`${actionInstanceId}-${executionNo}-${name}`}
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
                setValues((previous) => ({
                  ...previous,
                  [name]: event.target.value,
                }))
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
          <p className="text-sm text-[var(--atmr-brand-orange)]">{formError}</p>
        ) : null}
        <Button
          disabled={mutation.isPending || values.full_name.trim().length === 0}
          size="m"
          type="submit"
        >
          {mutation.isPending ? text.saving : text.save}
        </Button>
      </form>

      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {text.created}: {String(saved.target.data.full_name ?? "")}
        </p>
      ) : null}
    </section>
  );
}
