"use client";

import { useRef, useState } from "react";

import { EntitySelect } from "@/components/ui/entity-select";
import { getContactPersons } from "@/lib/api/catalog/contact-persons";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import type { Locale } from "@/i18n/translations";
import type { ContactOwnerRef, ContactPerson } from "@/types/contact-person";

const copy = {
  ru: {
    alreadyLinked: "Все найденные контакты уже связаны с организацией.",
    label: "Контактное лицо",
    placeholder: "ФИО, email, телефон или Telegram",
  },
  en: {
    alreadyLinked:
      "All matching contacts are already linked to the organization.",
    label: "Contact person",
    placeholder: "Name, email, phone or Telegram",
  },
} as const;

/** Подпись варианта: ФИО, способ связи и организации — чтобы различать тёзок. */
function contactOption(contact: ContactPerson): LookupOption {
  const organizations = contact.affiliations
    .map((item) => item.organization.name)
    .join(", ");

  return {
    id: contact.id,
    name: [contact.full_name, contact.email || contact.phone, organizations]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * Выбор человека из справочника контактов для новой связи с организацией.
 * Только активные люди; уже связанные с этой организацией не предлагаются.
 * Выбранный человек остаётся в поле; сменить — повторным поиском, сбросить — крестиком.
 */
export function ExistingContactSelect({
  id,
  locale,
  onChange,
  organization,
  value,
}: {
  id: string;
  locale: Locale;
  onChange: (contact: ContactPerson | null) => void;
  organization: ContactOwnerRef;
  value: ContactPerson | null;
}) {
  const text = copy[locale];
  // Варианты выпадушки — только id и подпись; полные карточки нужны для способов связи.
  const loaded = useRef(new Map<string, ContactPerson>());
  const [linkedIds, setLinkedIds] = useState<string[]>([]);

  async function loadPage(term: string, page: number) {
    const response = await getContactPersons({
      activity: "active",
      page,
      search: term,
    });
    const linked: string[] = [];
    for (const contact of response.results) {
      loaded.current.set(contact.id, contact);
      if (
        contact.affiliations.some(
          (item) =>
            item.type === organization.type &&
            item.organization.id === organization.id,
        )
      ) {
        linked.push(contact.id);
      }
    }
    if (linked.some((contactId) => !linkedIds.includes(contactId))) {
      setLinkedIds((previous) => [...new Set([...previous, ...linked])]);
    }

    return {
      options: response.results.map(contactOption),
      hasNextPage: Boolean(response.next),
    };
  }

  return (
    <EntitySelect
      excludeIds={linkedIds}
      excludedEmptyMessage={text.alreadyLinked}
      id={id}
      label={text.label}
      onChange={(option) =>
        onChange(option ? (loaded.current.get(option.id) ?? null) : null)
      }
      placeholder={text.placeholder}
      queryKey={[
        "catalog",
        "contact-persons",
        "affiliation-picker",
        organization.type,
        organization.id,
      ]}
      search={async (term) => (await loadPage(term, 1)).options}
      searchPage={loadPage}
      value={value ? contactOption(value) : null}
    />
  );
}
