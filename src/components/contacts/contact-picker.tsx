"use client";

import { EntitySelect } from "@/components/ui/entity-select";
import {
  getContactPersons,
  type ContactPersonsQuery,
} from "@/lib/api/catalog/contact-persons";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { useLocale } from "@/providers/locale-provider";
import type { PaginatedResponse } from "@/types/api";
import type { ContactPerson } from "@/types/contact-person";
import type { InteractionShort } from "@/types/workflow-board";

const copy = {
  ru: {
    label: "Контактное лицо",
    placeholder: "ФИО, должность, email или телефон",
  },
  en: {
    label: "Contact person",
    placeholder: "Name, position, email or phone",
  },
} as const;

export function contactPersonOptions(
  response: PaginatedResponse<ContactPerson> | ContactPerson[],
): LookupOption[] {
  const contacts = Array.isArray(response) ? response : response.results;

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.position
      ? `${contact.full_name} · ${contact.position}`
      : contact.full_name,
  }));
}

export function ContactPicker({
  disabled = false,
  excludeIds = [],
  id,
  interaction,
  onChange,
  value,
}: {
  disabled?: boolean;
  excludeIds?: string[];
  id: string;
  interaction: InteractionShort;
  onChange: (option: LookupOption | null) => void;
  value: LookupOption | null;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const counterparty: Pick<
    ContactPersonsQuery,
    "universityId" | "b2cClientId"
  > = interaction.university
    ? { universityId: interaction.university.id }
    : { b2cClientId: interaction.b2c_client?.id ?? null };

  async function loadPage(term: string, page: number) {
    const response = await getContactPersons({
      ...counterparty,
      activity: "active",
      page,
      search: term,
    });

    return {
      options: contactPersonOptions(response),
      hasNextPage: !Array.isArray(response) && Boolean(response.next),
    };
  }

  return (
    <EntitySelect
      disabled={disabled}
      excludeIds={excludeIds}
      id={id}
      label={text.label}
      onChange={onChange}
      placeholder={text.placeholder}
      queryKey={["catalog", "contact-persons", "picker", interaction.id]}
      search={async (term) => (await loadPage(term, 1)).options}
      searchPage={loadPage}
      value={value}
    />
  );
}
