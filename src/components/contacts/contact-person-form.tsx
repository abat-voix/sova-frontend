"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  PersonFields,
  trimmed,
} from "@/components/contacts/add-organization-contact";
import {
  PossibleDuplicates,
  usePossibleDuplicates,
} from "@/components/contacts/possible-duplicates";
import {
  apiErrorMessage,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createContactPerson,
  updateContactPerson,
} from "@/lib/api/catalog/contact-persons";
import { isValidPhone } from "@/lib/inn-phone";
import { useLocale } from "@/providers/locale-provider";
import type {
  ContactPerson,
  ContactPersonPayload,
} from "@/types/contact-person";

const headingId = "contact-person-form-title";

const copy = {
  ru: { createTitle: "Новый контакт", editTitle: "Изменить контакт" },
  en: { createTitle: "New contact", editTitle: "Edit contact" },
} as const;

/**
 * Данные человека. При создании — подсказка дублей: выбранный похожий человек
 * открывается вместо создания нового (`onPickExisting`).
 */
export function ContactPersonForm({
  contact,
  csrfToken,
  onClose,
  onPickExisting,
  onSaved,
}: {
  contact: ContactPerson | null;
  csrfToken: string;
  onClose: () => void;
  onPickExisting?: (contact: ContactPerson) => void;
  onSaved: (contact: ContactPerson) => void;
}) {
  const { locale } = useLocale();
  const common = registryCopy[locale];
  const [values, setValues] = useState<ContactPersonPayload>({
    email: contact?.email ?? "",
    full_name: contact?.full_name ?? "",
    phone: contact?.phone ?? "",
    telegram: contact?.telegram ?? "",
  });
  const duplicatesQuery = usePossibleDuplicates(
    {
      email: values.email,
      fullName: values.full_name,
      phone: values.phone,
      telegram: values.telegram,
    },
    contact === null,
  );
  const mutation = useMutation({
    mutationFn: () =>
      contact
        ? updateContactPerson(contact.id, trimmed(values), csrfToken)
        : createContactPerson(trimmed(values), csrfToken),
    onSuccess: onSaved,
  });

  return (
    <Modal closeLabel={common.cancel} labelledBy={headingId} onClose={onClose}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id={headingId}>
            {contact ? copy[locale].editTitle : copy[locale].createTitle}
          </h2>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <PersonFields locale={locale} onChange={setValues} values={values} />
          {contact === null ? (
            <PossibleDuplicates
              contacts={duplicatesQuery.data ?? []}
              locale={locale}
              onPick={onPickExisting}
            />
          ) : null}
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
            <Button
              disabled={
                !values.full_name.trim() ||
                !isValidPhone(values.phone) ||
                mutation.isPending
              }
              size="m"
              type="submit"
            >
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
