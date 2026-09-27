"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ContactPicker } from "@/components/contacts/contact-picker";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";
import {
  getInteractionContacts,
  interactionContactsQueryKey,
} from "@/lib/api/interactions/contacts";
import { executeActionFeature, boardQueryKey } from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  ActionFeatureExecution,
} from "@/types/action-feature";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import type { InteractionShort } from "@/types/workflow-board";

export { affiliationOptions } from "@/components/contacts/contact-picker";

const copy = {
  ru: {
    title: "Привязать существующий контакт",
    choose: "Привязать",
    saving: "Привязываем…",
    success: "Контакт привязан к взаимодействию.",
    error: "Не удалось привязать контакт.",
  },
  en: {
    title: "Link an existing contact",
    choose: "Link contact",
    saving: "Linking…",
    success: "Contact linked to the interaction.",
    error: "Could not link the contact.",
  },
} as const;

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
  featureCode?: ActionFeatureCode;
  executionNo?: number;
  executions?: ActionFeatureExecution[];
};

export function ContactPersonSelectFeature({
  actionInstanceId,
  csrfToken,
  workflowInstanceId,
  interaction,
  featureCode = "contact_person.select",
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const linkCode =
    featureCode === "contact_person.link"
      ? "contact_person.link"
      : "contact_person.select";

  const interactionId = interaction?.id ?? "";
  const linksQuery = useQuery({
    queryKey: interactionContactsQueryKey(interactionId),
    queryFn: () => getInteractionContacts(interactionId),
    enabled: Boolean(interactionId),
  });
  const mutation = useMutation({
    mutationFn: (contactId: string) =>
      executeActionFeature(
        actionInstanceId,
        linkCode,
        { contact_person: contactId },
        csrfToken,
      ),
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError
          ? (mutationError.detail ?? text.error)
          : text.error,
      ),
    onSuccess: () => {
      setSelected(null);
      setError(null);
      toast.success(text.success);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
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
      <ContactPicker
        excludeIds={linksQuery.data?.map((link) => link.contact_person.id)}
        id={`${actionInstanceId}-${linkCode}-contact`}
        interaction={interaction}
        onChange={setSelected}
        value={selected}
      />
      {error ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{error}</p>
      ) : null}
      <Button
        disabled={!selected || mutation.isPending}
        onClick={() => {
          if (selected) mutation.mutate(selected.id);
        }}
        size="m"
        type="button"
      >
        {mutation.isPending ? text.saving : text.choose}
      </Button>
    </section>
  );
}
