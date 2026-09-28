"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  AffiliationFields,
  affiliationPayload,
  emptyAffiliationValues,
  type AffiliationFieldValues,
} from "@/components/contacts/affiliation-fields";
import {
  PossibleDuplicates,
  usePossibleDuplicates,
} from "@/components/contacts/possible-duplicates";
import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createAffiliation } from "@/lib/api/catalog/contact-affiliations";
import { createContactPerson } from "@/lib/api/catalog/contact-persons";
import { useLocale } from "@/providers/locale-provider";
import type {
  ContactPerson,
  ContactPersonPayload,
  ContactOwnerRef,
} from "@/types/contact-person";

const headingId = "add-organization-contact-title";

const copy = {
  ru: {
    title: "Добавить контакт",
    fullName: "ФИО",
    email: "Email",
    phone: "Телефон",
    telegram: "Telegram",
    telegramHint: "Ник, @ник или ссылка t.me",
    picked: "Существующий человек",
    another: "Другой человек",
    submit: "Добавить",
  },
  en: {
    title: "Add a contact",
    fullName: "Full name",
    email: "Email",
    phone: "Phone",
    telegram: "Telegram",
    telegramHint: "Handle, @handle, or a t.me link",
    picked: "Existing person",
    another: "Someone else",
    submit: "Add",
  },
} as const;

const emptyPerson: ContactPersonPayload = {
  email: "",
  full_name: "",
  phone: "",
  telegram: "",
};

/**
 * Контакт организации: новый человек или уже существующий (подсказка дублей) и
 * его связь с организацией. Выбран существующий — создаётся только связь.
 */
export function AddOrganizationContact({
  csrfToken,
  onClose,
  onSaved,
  organization,
  organizationName,
}: {
  csrfToken: string;
  onClose: () => void;
  onSaved: () => void;
  organization: ContactOwnerRef;
  organizationName: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [person, setPerson] = useState<ContactPersonPayload>(emptyPerson);
  const [existing, setExisting] = useState<ContactPerson | null>(null);
  const [affiliation, setAffiliation] = useState<AffiliationFieldValues>(
    emptyAffiliationValues,
  );
  const duplicatesQuery = usePossibleDuplicates(
    {
      email: person.email,
      fullName: person.full_name,
      phone: person.phone,
      telegram: person.telegram,
    },
    existing === null,
  );
  // Уже связанный с этой организацией человек второй связи не получит — не предлагаем его.
  const duplicates = (duplicatesQuery.data ?? []).filter(
    (contact) =>
      !contact.affiliations.some(
        (item) =>
          item.type === organization.type &&
          item.organization.id === organization.id,
      ),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const contact =
        existing ?? (await createContactPerson(trimmed(person), csrfToken));

      return createAffiliation(
        {
          contactId: contact.id,
          organization,
          ...affiliationPayload(affiliation),
        },
        csrfToken,
      );
    },
    onSuccess: onSaved,
  });

  const canSubmit = existing !== null || person.full_name.trim().length > 0;

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
            {organizationName}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {existing ? (
            <div className="bg-secondary/70 flex items-center justify-between gap-3 rounded-lg p-3">
              <div className="min-w-0 text-sm">
                <p className="text-muted-foreground text-xs">{text.picked}</p>
                <p className="font-medium break-words">{existing.full_name}</p>
              </div>
              <Button
                colorScheme="neutral"
                onClick={() => setExisting(null)}
                size="s"
                type="button"
                variant="outline"
              >
                {text.another}
              </Button>
            </div>
          ) : (
            <>
              <PersonFields
                locale={locale}
                onChange={setPerson}
                values={person}
              />
              <PossibleDuplicates
                contacts={duplicates}
                locale={locale}
                onPick={setExisting}
              />
            </>
          )}
          <AffiliationFields
            idPrefix="add-organization-contact"
            locale={locale}
            onChange={setAffiliation}
            organization={organization}
            values={affiliation}
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
            <Button
              disabled={!canSubmit || mutation.isPending}
              size="m"
              type="submit"
            >
              {mutation.isPending ? common.saving : text.submit}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function trimmed(person: ContactPersonPayload): ContactPersonPayload {
  return {
    email: person.email.trim(),
    full_name: person.full_name.trim(),
    phone: person.phone.trim(),
    telegram: person.telegram.trim(),
  };
}

/** Данные человека: ФИО, email, телефон, Telegram. */
export function PersonFields({
  idPrefix = "contact-person",
  locale,
  onChange,
  values,
}: {
  idPrefix?: string;
  locale: "ru" | "en";
  onChange: (values: ContactPersonPayload) => void;
  values: ContactPersonPayload;
}) {
  const text = copy[locale];
  const input = (
    name: keyof ContactPersonPayload,
    type = "text",
    maxLength = 255,
  ) => (
    <input
      autoComplete={
        name === "full_name" ? "name" : name === "email" ? "email" : "off"
      }
      className={fieldInputClass}
      id={`${idPrefix}-${name}`}
      maxLength={maxLength}
      onChange={(event) => onChange({ ...values, [name]: event.target.value })}
      required={name === "full_name"}
      type={type}
      value={values[name]}
    />
  );

  return (
    <>
      <Field htmlFor={`${idPrefix}-full_name`} label={text.fullName} required>
        {input("full_name")}
      </Field>
      <Field htmlFor={`${idPrefix}-email`} label={text.email}>
        {input("email", "email", 254)}
      </Field>
      <Field htmlFor={`${idPrefix}-phone`} label={text.phone}>
        {input("phone", "text", 50)}
      </Field>
      <Field
        hint={text.telegramHint}
        htmlFor={`${idPrefix}-telegram`}
        label={text.telegram}
      >
        {input("telegram", "text", 100)}
      </Field>
    </>
  );
}
