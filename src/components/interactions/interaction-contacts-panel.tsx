"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Unlink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ContactPicker } from "@/components/contacts/contact-picker";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ApiError } from "@/lib/api/http";
import {
  getInteractionContacts,
  interactionContactsQueryKey,
  linkInteractionContact,
  unlinkInteractionContact,
} from "@/lib/api/interactions/contacts";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { useLocale } from "@/providers/locale-provider";
import type { InteractionShort } from "@/types/workflow-board";

const copy = {
  ru: {
    title: "Контактные лица",
    add: "Привязать контакт",
    cancel: "Отмена",
    confirm: "Привязать",
    linking: "Привязываем…",
    empty: "Контакты пока не привязаны.",
    loading: "Загружаем контакты…",
    error: "Не удалось загрузить контакты.",
    linkError: "Не удалось привязать контакт.",
    unlinkError: "Не удалось отвязать контакт.",
    linked: "Контакт привязан.",
    unlinked: "Контакт отвязан.",
    unlink: "Отвязать контакт",
    expand: "Развернуть контакты",
    collapse: "Свернуть контакты",
    retry: "Повторить",
  },
  en: {
    title: "Contact people",
    add: "Link a contact",
    cancel: "Cancel",
    confirm: "Link",
    linking: "Linking…",
    empty: "No contacts are linked yet.",
    loading: "Loading contacts…",
    error: "Could not load contacts.",
    linkError: "Could not link the contact.",
    unlinkError: "Could not unlink the contact.",
    linked: "Contact linked.",
    unlinked: "Contact unlinked.",
    unlink: "Unlink contact",
    expand: "Expand contacts",
    collapse: "Collapse contacts",
    retry: "Retry",
  },
} as const;

export function InteractionContactsPanel({
  canEdit = true,
  csrfToken,
  interaction,
}: {
  /** Привязывать и отвязывать контакты; без права панель только показывает их. */
  canEdit?: boolean;
  csrfToken: string;
  interaction: InteractionShort;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isCompactViewport = useMediaQuery("(max-width: 1023.98px)");
  const [isExpandedOverride, setIsExpandedOverride] = useState<boolean | null>(
    null,
  );
  const isExpanded = isExpandedOverride ?? !isCompactViewport;
  const queryKey = interactionContactsQueryKey(interaction.id);
  const contactsQuery = useQuery({
    queryKey,
    queryFn: () => getInteractionContacts(interaction.id),
  });
  const linkMutation = useMutation({
    mutationFn: (contactId: string) =>
      linkInteractionContact(interaction.id, contactId, csrfToken),
    onSuccess: () => {
      setSelected(null);
      setIsAdding(false);
      setError(null);
      toast.success(text.linked);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError
          ? (mutationError.detail ?? text.linkError)
          : text.linkError,
      ),
  });
  const unlinkMutation = useMutation({
    mutationFn: (contactId: string) =>
      unlinkInteractionContact(interaction.id, contactId, csrfToken),
    onSuccess: () => {
      setError(null);
      toast.success(text.unlinked);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError
          ? (mutationError.detail ?? text.unlinkError)
          : text.unlinkError,
      ),
  });

  return (
    <section
      aria-label={text.title}
      className="relative z-10 shrink-0 border-b px-3 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          aria-label={isExpanded ? text.collapse : text.expand}
          aria-expanded={isExpanded}
          className="flex min-w-0 items-center gap-1 text-left text-sm font-medium"
          onClick={() =>
            setIsExpandedOverride((value) => !(value ?? isExpanded))
          }
          type="button"
        >
          {text.title}
          {isExpanded ? (
            <ChevronUp aria-hidden="true" className="size-4" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-4" />
          )}
        </button>
        {canEdit ? (
          <Button
            colorScheme="neutral"
            onClick={() => {
              setSelected(null);
              setError(null);
              setIsExpandedOverride(true);
              setIsAdding((value) => !value);
            }}
            size="s"
            type="button"
            variant="outline"
          >
            {!isAdding ? (
              <Plus aria-hidden="true" className="size-3.5" />
            ) : null}
            {isAdding ? text.cancel : text.add}
          </Button>
        ) : null}
      </div>

      {isExpanded && contactsQuery.isPending ? (
        <p className="text-muted-foreground mt-2 text-xs">{text.loading}</p>
      ) : isExpanded && contactsQuery.isError ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <p className="text-muted-foreground">{text.error}</p>
          <Button
            colorScheme="neutral"
            onClick={() => void contactsQuery.refetch()}
            size="s"
            type="button"
            variant="ghost"
          >
            {text.retry}
          </Button>
        </div>
      ) : isExpanded && (contactsQuery.data?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground mt-2 text-xs">{text.empty}</p>
      ) : isExpanded ? (
        <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto">
          {(contactsQuery.data ?? []).map((link) => {
            const contact = link.contact_person;
            return (
              <li
                className="bg-secondary flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
                key={link.id}
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{contact.full_name}</span>
                  {contact.position ? ` · ${contact.position}` : ""}
                </span>
                {contact.email ? (
                  <a
                    className="text-muted-foreground truncate hover:underline"
                    href={`mailto:${contact.email}`}
                  >
                    {contact.email}
                  </a>
                ) : null}
                {contact.phone ? (
                  <a
                    className="text-muted-foreground truncate hover:underline"
                    href={`tel:${contact.phone}`}
                  >
                    {contact.phone}
                  </a>
                ) : null}
                {canEdit ? (
                  <Button
                    aria-label={`${text.unlink}: ${contact.full_name}`}
                    colorScheme="neutral"
                    disabled={unlinkMutation.isPending}
                    onClick={() => unlinkMutation.mutate(contact.id)}
                    size="icon"
                    title={text.unlink}
                    type="button"
                    variant="ghost"
                  >
                    <Unlink aria-hidden="true" className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {isExpanded && isAdding && canEdit ? (
        <div className="mt-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ContactPicker
              disabled={contactsQuery.isPending || contactsQuery.isError}
              excludeIds={contactsQuery.data?.map(
                (link) => link.contact_person.id,
              )}
              id={`interaction-${interaction.id}-contact`}
              interaction={interaction}
              onChange={setSelected}
              value={selected}
            />
          </div>
          <Button
            disabled={!selected || linkMutation.isPending}
            onClick={() => {
              if (selected) linkMutation.mutate(selected.id);
            }}
            size="m"
            type="button"
          >
            {linkMutation.isPending ? text.linking : text.confirm}
          </Button>
        </div>
      ) : null}
      {isExpanded && error ? (
        <p
          className="mt-2 text-xs text-[var(--atmr-brand-orange)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
