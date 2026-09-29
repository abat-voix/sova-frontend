"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import {
  AffiliationFields,
  affiliationPayload,
  type AffiliationFieldValues,
} from "@/components/contacts/affiliation-fields";
import type { ChannelSource } from "@/components/contacts/contact-channels";
import { contactPersonHref } from "@/components/contacts/contact-href";
import {
  apiErrorMessage,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { updateAffiliation } from "@/lib/api/catalog/contact-affiliations";
import { useLocale } from "@/providers/locale-provider";
import type {
  ContactChannel,
  ContactOwnerRef,
  ProductShort,
} from "@/types/contact-person";

const headingId = "edit-affiliation-title";

const copy = {
  ru: {
    title: "Должность и способы связи",
    person: "Контактное лицо",
    fullName: "ФИО",
    email: "Email",
    phone: "Телефон",
    telegram: "Telegram",
    noValue: "не указано",
    sharedHint:
      "Данные человека общие для всех организаций — изменить их можно в разделе «Контакты».",
    openContact: "Открыть в «Контактах»",
  },
  en: {
    title: "Position and channels",
    person: "Contact person",
    fullName: "Full name",
    email: "Email",
    phone: "Phone",
    telegram: "Telegram",
    noValue: "not set",
    sharedHint:
      "The person's details are shared by all organizations — edit them in Contacts.",
    openContact: "Open in Contacts",
  },
} as const;

/**
 * Правка связи: организация и человек не меняются — другая организация это другая связь.
 * Способы связи — только из заполненных у человека (`contact`) полей. Данные человека
 * показываются только для чтения: они общие для всех организаций и меняются в «Контактах»
 * (`linkToContact` — ссылка туда; в самих «Контактах» не нужна).
 */
export function EditAffiliation({
  affiliation,
  contact,
  csrfToken,
  linkToContact = true,
  onClose,
  onSaved,
  organization,
  organizationName,
}: {
  affiliation: {
    id: string;
    position: string;
    preferred_channels: ContactChannel[];
    products: ProductShort[];
  };
  contact: ChannelSource & { full_name: string; id: string };
  csrfToken: string;
  linkToContact?: boolean;
  onClose: () => void;
  onSaved: () => void;
  organization: ContactOwnerRef;
  organizationName: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [values, setValues] = useState<AffiliationFieldValues>({
    position: affiliation.position,
    preferredChannels: affiliation.preferred_channels,
    products: affiliation.products,
  });
  const mutation = useMutation({
    mutationFn: () =>
      updateAffiliation(
        organization.type,
        affiliation.id,
        affiliationPayload(values, contact),
        csrfToken,
      ),
    onSuccess: onSaved,
  });

  return (
    <Modal
      allowContentOverflow
      closeLabel={common.cancel}
      labelledBy={headingId}
      onClose={onClose}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id={headingId}>
            {text.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {contact.full_name} · {organizationName}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section
            aria-label={text.person}
            className="bg-secondary/70 space-y-3 rounded-lg p-3"
          >
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              {(
                [
                  [text.fullName, contact.full_name],
                  [text.email, contact.email],
                  [text.phone, contact.phone],
                  [text.telegram, contact.telegram],
                ] as const
              ).map(([label, value]) => (
                <div className="min-w-0" key={label}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="break-words">
                    {value || (
                      <span className="text-muted-foreground">
                        {text.noValue}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground text-xs">
              {text.sharedHint}
              {linkToContact ? (
                <>
                  {" "}
                  <Link
                    className="text-foreground underline underline-offset-2"
                    href={contactPersonHref(contact.id)}
                  >
                    {text.openContact}
                  </Link>
                </>
              ) : null}
            </p>
          </section>
          <AffiliationFields
            idPrefix="edit-affiliation"
            locale={locale}
            onChange={setValues}
            organization={organization}
            person={contact}
            values={values}
          />
        </div>
        <div className="space-y-3 border-t px-5 py-4">
          {mutation.isError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {apiErrorMessage(mutation.error, common.unknownError)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={onClose}
              size="m"
              type="button"
              variant="outline"
            >
              {common.cancel}
            </Button>
            <Button disabled={mutation.isPending} size="m" type="submit">
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
