"use client";

import { EntitySelect } from "@/components/ui/entity-select";
import { getOrganizationAffiliations } from "@/lib/api/catalog/contact-affiliations";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { useLocale } from "@/providers/locale-provider";
import type { PaginatedResponse } from "@/types/api";
import type {
  OrganizationAffiliation,
  OrganizationRef,
} from "@/types/contact-person";
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

/** Вариант выбора — человек с должностью именно в этой организации. */
export function affiliationOptions(
  response: PaginatedResponse<OrganizationAffiliation>,
): LookupOption[] {
  return response.results.map(({ contact, position }) => ({
    id: contact.id,
    name: position ? `${contact.full_name} · ${position}` : contact.full_name,
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
  const organization: OrganizationRef = interaction.university
    ? { id: interaction.university.id, type: "university" }
    : { id: interaction.b2c_client?.id ?? "", type: "b2c_client" };

  // Кандидаты — связи контрагента взаимодействия с активными людьми: привязать
  // можно только того, кто в нём работает и не выключен.
  async function loadPage(term: string, page: number) {
    const response = await getOrganizationAffiliations({
      activeContactsOnly: true,
      organization,
      page,
      search: term,
    });

    return {
      options: affiliationOptions(response),
      hasNextPage: Boolean(response.next),
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
      queryKey={["catalog", "contact-affiliations", "picker", interaction.id]}
      search={async (term) => (await loadPage(term, 1)).options}
      searchPage={loadPage}
      value={value}
    />
  );
}
