"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  LoaderCircle,
  Mail,
  Package,
  Pencil,
  Phone,
  Plus,
  Send,
  UserMinus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { AddOrganizationContact } from "@/components/contacts/add-organization-contact";
import { ConfirmAction } from "@/components/contacts/confirm-action";
import { contactChannelLabels } from "@/components/contacts/contact-channels";
import { EditAffiliation } from "@/components/contacts/edit-affiliation";
import {
  apiErrorMessage,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import {
  deleteAffiliation,
  getOrganizationAffiliations,
  organizationAffiliationsQueryKey,
} from "@/lib/api/catalog/contact-affiliations";
import { contactPersonsQueryKey } from "@/lib/api/catalog/contact-persons";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  OrganizationAffiliation,
  ContactOwnerRef,
} from "@/types/contact-person";

const copy = {
  ru: {
    title: "Контактные лица",
    add: "Добавить контакт",
    edit: "Изменить",
    remove: "Удалить из организации",
    removing: "Удаляем…",
    removeConfirm: "Да, удалить",
    removeQuestion: (name: string, organization: string) =>
      `Удалить ${name} из «${organization}»? Должность и способы связи удалятся.`,
    removeQuestionWithInteractions: (name: string, organization: string) =>
      `Удалить ${name} из «${organization}»? Он будет отвязан от активных взаимодействий организации, КАМы получат уведомление.`,
    removed: "Контакт удалён из организации.",
    added: "Контакт добавлен.",
    saved: "Изменения сохранены.",
    inactive: "Неактивен",
    empty: "Контактные лица не указаны",
    error: "Не удалось загрузить контактные лица.",
    loading: "Загружаем контактные лица…",
    loadMore: "Показать ещё",
    loadingMore: "Загружаем…",
    retry: "Повторить",
  },
  en: {
    title: "Contact people",
    add: "Add contact",
    edit: "Edit",
    remove: "Remove from organization",
    removing: "Removing…",
    removeConfirm: "Yes, remove",
    removeQuestion: (name: string, organization: string) =>
      `Remove ${name} from “${organization}”? The position and channels will be deleted.`,
    removeQuestionWithInteractions: (name: string, organization: string) =>
      `Remove ${name} from “${organization}”? They will be unlinked from the organization's active interactions and account managers will be notified.`,
    removed: "The contact was removed from the organization.",
    added: "Contact added.",
    saved: "Changes saved.",
    inactive: "Inactive",
    empty: "No contact people provided",
    error: "Could not load contact people.",
    loading: "Loading contact people…",
    loadMore: "Show more",
    loadingMore: "Loading…",
    retry: "Retry",
  },
} as const;

/**
 * Контактные лица организации — вуза, B2C-клиента или вендора: её связи с
 * людьми. Отсюда человека добавляют (новым или существующим), меняют его
 * должность и удаляют из организации — «ушёл из организации».
 */
export function OrganizationContacts({
  organization,
  organizationName,
}: {
  organization: ContactOwnerRef;
  organizationName: string;
}) {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  // Кнопки прячутся по правам справочников; решение всё равно за бэкендом.
  const canCreate = user !== null && can(user, "catalog.create");
  const canUpdate = user !== null && can(user, "catalog.update");
  const canDelete = user !== null && can(user, "catalog.delete");
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<OrganizationAffiliation | null>(null);
  const closeAdd = useCallback(() => setIsAdding(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const contactsQuery = useInfiniteQuery({
    queryKey: organizationAffiliationsQueryKey(organization),
    queryFn: ({ pageParam }) =>
      getOrganizationAffiliations({ organization, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });
  const affiliations = useMemo(
    () => contactsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [contactsQuery.data],
  );
  const count = contactsQuery.data?.pages[0]?.count;

  /** После записи связи устарели и список людей, и контакты взаимодействий. */
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: organizationAffiliationsQueryKey(),
    });
    void queryClient.invalidateQueries({ queryKey: contactPersonsQueryKey() });
    void queryClient.invalidateQueries({
      queryKey: ["interactions", "contacts"],
    });
  }, [queryClient]);

  const removeMutation = useMutation({
    mutationFn: (affiliation: OrganizationAffiliation) =>
      deleteAffiliation(organization.type, affiliation.id, csrfToken),
    onSuccess: () => {
      toast.success(text.removed);
      refresh();
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });

  const removeQuestion =
    organization.type === "vendor"
      ? text.removeQuestion
      : text.removeQuestionWithInteractions;

  return (
    <section aria-label={text.title} className="mt-5 border-t pt-4">
      <div className="flex items-center gap-2">
        <UsersRound
          aria-hidden="true"
          className="text-muted-foreground size-4"
        />
        <h3 className="text-sm font-medium">{text.title}</h3>
        {count !== undefined ? (
          <span className="text-muted-foreground text-xs">{count}</span>
        ) : null}
        {canCreate ? (
          <Button
            className="ml-auto"
            colorScheme="neutral"
            onClick={() => setIsAdding(true)}
            size="s"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            {text.add}
          </Button>
        ) : null}
      </div>

      {contactsQuery.isPending ? (
        <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {text.loading}
        </p>
      ) : contactsQuery.isError ? (
        <div className="mt-3 space-y-2">
          <p className="text-muted-foreground text-sm">{text.error}</p>
          <Button
            colorScheme="neutral"
            onClick={() => void contactsQuery.refetch()}
            size="s"
            type="button"
            variant="outline"
          >
            {text.retry}
          </Button>
        </div>
      ) : affiliations.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">{text.empty}</p>
      ) : (
        <>
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {affiliations.map((affiliation) => {
              const { contact } = affiliation;

              return (
                <li
                  className="bg-secondary/70 rounded-lg p-3"
                  key={affiliation.id}
                >
                  <div className="flex items-start gap-2">
                    <UserRound
                      aria-hidden="true"
                      className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 font-medium break-words">
                        {contact.full_name}
                        {!contact.is_active ? (
                          <span className="text-muted-foreground ml-2 text-xs font-normal">
                            {text.inactive}
                          </span>
                        ) : null}
                      </p>
                      {affiliation.position ? (
                        <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
                          {affiliation.position}
                        </p>
                      ) : null}
                      {affiliation.preferred_channels.length > 0 ? (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {affiliation.preferred_channels
                            .map(
                              (channel) =>
                                contactChannelLabels[locale][channel],
                            )
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <ContactLinks contact={contact} />
                  {affiliation.products.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1 pl-6">
                      {affiliation.products.map((product) => (
                        <li
                          className="bg-background flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                          key={product.id}
                        >
                          <Package aria-hidden="true" className="size-3" />
                          {product.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {canUpdate || canDelete ? (
                    <div className="mt-2 flex flex-wrap items-start gap-1 pl-4">
                      {canUpdate ? (
                        <Button
                          colorScheme="neutral"
                          onClick={() => setEditing(affiliation)}
                          size="s"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />
                          {text.edit}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <ConfirmAction
                          cancelLabel={common.cancel}
                          confirmLabel={text.removeConfirm}
                          icon={
                            <UserMinus
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          }
                          isPending={removeMutation.isPending}
                          label={text.remove}
                          onConfirm={() => removeMutation.mutate(affiliation)}
                          pendingLabel={text.removing}
                          question={removeQuestion(
                            contact.full_name,
                            organizationName,
                          )}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {contactsQuery.hasNextPage ? (
            <Button
              className="mt-3 w-full"
              colorScheme="neutral"
              disabled={contactsQuery.isFetchingNextPage}
              onClick={() => void contactsQuery.fetchNextPage()}
              size="m"
              type="button"
              variant="outline"
            >
              {contactsQuery.isFetchingNextPage ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : null}
              {contactsQuery.isFetchingNextPage
                ? text.loadingMore
                : text.loadMore}
            </Button>
          ) : null}
        </>
      )}

      {isAdding ? (
        <AddOrganizationContact
          csrfToken={csrfToken}
          onClose={closeAdd}
          onSaved={() => {
            toast.success(text.added);
            setIsAdding(false);
            refresh();
          }}
          organization={organization}
          organizationName={organizationName}
        />
      ) : null}
      {editing ? (
        <EditAffiliation
          affiliation={editing}
          contact={editing.contact}
          csrfToken={csrfToken}
          onClose={closeEdit}
          onSaved={() => {
            toast.success(text.saved);
            setEditing(null);
            refresh();
          }}
          organization={organization}
          organizationName={organizationName}
        />
      ) : null}
    </section>
  );
}

/** Почта, телефон и Telegram человека — ссылками. */
export function ContactLinks({
  contact,
}: {
  contact: { email: string; phone: string; telegram: string };
}) {
  if (!contact.email && !contact.phone && !contact.telegram) return null;

  return (
    <div className="mt-2 space-y-1 pl-6 text-xs">
      {contact.email ? (
        <a
          className="flex items-center gap-2 break-all hover:underline"
          href={`mailto:${contact.email}`}
        >
          <Mail aria-hidden="true" className="size-3.5 shrink-0" />
          {contact.email}
        </a>
      ) : null}
      {contact.phone ? (
        <a
          className="flex items-center gap-2 hover:underline"
          href={`tel:${contact.phone}`}
        >
          <Phone aria-hidden="true" className="size-3.5 shrink-0" />
          {contact.phone}
        </a>
      ) : null}
      {contact.telegram ? (
        <a
          className="flex items-center gap-2 hover:underline"
          href={`https://t.me/${contact.telegram}`}
          rel="noreferrer"
          target="_blank"
        >
          <Send aria-hidden="true" className="size-3.5 shrink-0" />@
          {contact.telegram}
        </a>
      ) : null}
    </div>
  );
}
