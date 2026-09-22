import { Building2, Mail, Phone, User, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format-date";
import type { Locale } from "@/i18n/translations";
import type { ContactPerson } from "@/types/contact-person";

export type ContactDetailsLabels = {
  active: string;
  b2cClient: string;
  createdAt: string;
  email: string;
  inactive: string;
  noCounterparty: string;
  noValue: string;
  phone: string;
  university: string;
  updatedAt: string;
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
 * Карточка контактного лица для панели просмотра.
 *
 * Контрагент у контакта ровно один, поэтому показываем ту связь, которая
 * заполнена, и подписываем её типом — иначе вуз и B2C-клиент в списке
 * выглядели бы одинаково.
 */
export function ContactDetails({
  contact,
  headingId,
  labels,
  locale,
}: {
  contact: ContactPerson;
  headingId: string;
  labels: ContactDetailsLabels;
  locale: Locale;
}) {
  const counterparty = contact.university ?? contact.b2c_client;
  const counterpartyName = contact.university
    ? contact.university.name
    : (contact.b2c_client?.full_name ?? null);

  return (
    <>
      <span className="flex size-16 items-center justify-center rounded-2xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
        <UserRound aria-hidden="true" className="size-8" />
      </span>
      <h2 className="mt-3 text-xl leading-6 font-medium" id={headingId}>
        {contact.full_name}
      </h2>
      {contact.position ? (
        <p className="text-muted-foreground mt-1 text-sm">{contact.position}</p>
      ) : null}
      <span className="mt-3 flex flex-wrap gap-2">
        <StatusChip tone={contact.is_active ? "positive" : "neutral"}>
          {contact.is_active ? labels.active : labels.inactive}
        </StatusChip>
      </span>

      <dl className="mt-5">
        <DetailRow
          label={contact.university ? labels.university : labels.b2cClient}
        >
          {counterparty ? (
            <span className="flex items-center gap-2">
              {contact.university ? (
                <Building2 aria-hidden="true" className="size-4 shrink-0" />
              ) : (
                <User aria-hidden="true" className="size-4 shrink-0" />
              )}
              {counterpartyName}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {labels.noCounterparty}
            </span>
          )}
        </DetailRow>
        <DetailRow label={labels.email}>
          {contact.email ? (
            <a
              className="flex items-center gap-2 break-all hover:underline"
              href={`mailto:${contact.email}`}
            >
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              {contact.email}
            </a>
          ) : (
            <span className="text-muted-foreground">{labels.noValue}</span>
          )}
        </DetailRow>
        <DetailRow label={labels.phone}>
          {contact.phone ? (
            <a
              className="flex items-center gap-2 hover:underline"
              href={`tel:${contact.phone}`}
            >
              <Phone aria-hidden="true" className="size-4 shrink-0" />
              {contact.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">{labels.noValue}</span>
          )}
        </DetailRow>
        <DetailRow label={labels.createdAt}>
          {formatDate(contact.created_at, locale) ?? labels.noValue}
        </DetailRow>
        <DetailRow label={labels.updatedAt}>
          {formatDate(contact.updated_at, locale) ?? labels.noValue}
        </DetailRow>
      </dl>
    </>
  );
}
