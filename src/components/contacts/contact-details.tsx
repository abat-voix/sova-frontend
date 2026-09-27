import {
  Building2,
  Factory,
  Package,
  Pencil,
  Plus,
  User,
  UserMinus,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { ConfirmAction } from "@/components/contacts/confirm-action";
import { contactChannelLabels } from "@/components/contacts/contact-channels";
import { ContactLinks } from "@/components/organizations/organization-contacts";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format-date";
import type { Locale } from "@/i18n/translations";
import type {
  ContactAffiliation,
  ContactPerson,
  OrganizationType,
} from "@/types/contact-person";

const copy = {
  ru: {
    active: "Активен",
    inactive: "Неактивен",
    organizations: "Организации",
    noOrganizations: "Не работает ни с одной организацией.",
    addOrganization: "Добавить организацию",
    editAffiliation: "Изменить",
    remove: "Удалить из организации",
    removeConfirm: "Да, удалить",
    removing: "Удаляем…",
    cancel: "Отмена",
    removeQuestion: (organization: string) =>
      `Удалить из «${organization}»? Должность и способы связи удалятся.`,
    removeQuestionWithInteractions: (organization: string) =>
      `Удалить из «${organization}»? Человек будет отвязан от активных взаимодействий организации, КАМы получат уведомление.`,
    contacts: "Способы связаться",
    noContacts: "Не указаны",
    createdAt: "Дата создания",
    updatedAt: "Дата обновления",
    types: { b2c_client: "B2C-клиент", university: "Вуз", vendor: "Вендор" },
  },
  en: {
    active: "Active",
    inactive: "Inactive",
    organizations: "Organizations",
    noOrganizations: "Not working with any organization.",
    addOrganization: "Add organization",
    editAffiliation: "Edit",
    remove: "Remove from organization",
    removeConfirm: "Yes, remove",
    removing: "Removing…",
    cancel: "Cancel",
    removeQuestion: (organization: string) =>
      `Remove from “${organization}”? The position and channels will be deleted.`,
    removeQuestionWithInteractions: (organization: string) =>
      `Remove from “${organization}”? The person will be unlinked from the organization's active interactions and account managers will be notified.`,
    contacts: "Ways to reach",
    noContacts: "Not provided",
    createdAt: "Created",
    updatedAt: "Updated",
    types: {
      b2c_client: "B2C client",
      university: "University",
      vendor: "Vendor",
    },
  },
} as const;

const typeIcons: Record<OrganizationType, typeof Building2> = {
  b2c_client: User,
  university: Building2,
  vendor: Factory,
};

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b py-3 last:border-b-0">
      <dt className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm break-words">{children}</dd>
    </div>
  );
}

/**
 * Карточка человека: его данные и связи с организациями — в каждой своя
 * должность, способы связи и (у вендора) продукты.
 */
export function ContactDetails({
  canCreate,
  canDelete,
  canUpdate,
  contact,
  headingId,
  isRemoving,
  locale,
  onAddAffiliation,
  onEditAffiliation,
  onRemoveAffiliation,
}: {
  /** Права справочников: без них кнопки связей не показываются. */
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  contact: ContactPerson;
  headingId: string;
  isRemoving: boolean;
  locale: Locale;
  onAddAffiliation: () => void;
  onEditAffiliation: (affiliation: ContactAffiliation) => void;
  onRemoveAffiliation: (affiliation: ContactAffiliation) => void;
}) {
  const text = copy[locale];

  return (
    <>
      <span className="flex size-16 items-center justify-center rounded-2xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
        <UserRound aria-hidden="true" className="size-8" />
      </span>
      <h2 className="mt-3 text-xl leading-6 font-medium" id={headingId}>
        {contact.full_name}
      </h2>
      <span className="mt-3 flex flex-wrap gap-2">
        <StatusChip tone={contact.is_active ? "positive" : "neutral"}>
          {contact.is_active ? text.active : text.inactive}
        </StatusChip>
      </span>

      <section aria-label={text.organizations} className="mt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{text.organizations}</h3>
          {canCreate ? (
            <Button
              className="ml-auto"
              colorScheme="neutral"
              onClick={onAddAffiliation}
              size="s"
              type="button"
              variant="outline"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              {text.addOrganization}
            </Button>
          ) : null}
        </div>
        {contact.affiliations.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            {text.noOrganizations}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {contact.affiliations.map((affiliation) => {
              const Icon = typeIcons[affiliation.type];
              const question =
                affiliation.type === "vendor"
                  ? text.removeQuestion
                  : text.removeQuestionWithInteractions;

              return (
                <li
                  className="bg-secondary/70 rounded-lg p-3"
                  key={affiliation.id}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      aria-hidden="true"
                      className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium break-words">
                        {affiliation.organization.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {[text.types[affiliation.type], affiliation.position]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {affiliation.preferred_channels.length > 0 ? (
                        <p className="text-muted-foreground text-xs">
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
                          onClick={() => onEditAffiliation(affiliation)}
                          size="s"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />
                          {text.editAffiliation}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <ConfirmAction
                          cancelLabel={text.cancel}
                          confirmLabel={text.removeConfirm}
                          icon={
                            <UserMinus
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          }
                          isPending={isRemoving}
                          label={text.remove}
                          onConfirm={() => onRemoveAffiliation(affiliation)}
                          pendingLabel={text.removing}
                          question={question(affiliation.organization.name)}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <dl className="mt-5">
        <DetailRow label={text.contacts}>
          {contact.email || contact.phone || contact.telegram ? (
            <div className="-mt-2 -ml-6">
              <ContactLinks contact={contact} />
            </div>
          ) : (
            <span className="text-muted-foreground">{text.noContacts}</span>
          )}
        </DetailRow>
        <DetailRow label={text.createdAt}>
          {formatDate(contact.created_at, locale) ?? "—"}
        </DetailRow>
        <DetailRow label={text.updatedAt}>
          {formatDate(contact.updated_at, locale) ?? "—"}
        </DetailRow>
      </dl>
    </>
  );
}
