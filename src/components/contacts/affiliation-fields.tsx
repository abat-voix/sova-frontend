"use client";

import {
  availableChannels,
  ChannelCheckboxes,
  type ChannelSource,
} from "@/components/contacts/contact-channels";
import { Field, fieldInputClass } from "@/components/registry/registry-shared";
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import {
  searchVendorProducts,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import type { Locale } from "@/i18n/translations";
import type { ContactChannel, ContactOwnerRef } from "@/types/contact-person";

const copy = {
  ru: {
    channels: "Способы связи",
    position: "Должность",
    products: "Продукты",
    productsPlaceholder: "Продукты вендора",
  },
  en: {
    channels: "Preferred channels",
    position: "Position",
    products: "Products",
    productsPlaceholder: "Vendor products",
  },
} as const;

export type AffiliationFieldValues = {
  position: string;
  preferredChannels: ContactChannel[];
  products: LookupOption[];
};

export const emptyAffiliationValues: AffiliationFieldValues = {
  position: "",
  preferredChannels: [],
  products: [],
};

/**
 * Данные связи: должность и способы связи, у вендора — ещё продукты. Способ связи
 * выбирается только из заполненных у человека (`person`) полей.
 */
export function AffiliationFields({
  idPrefix,
  locale,
  onChange,
  organization,
  person,
  values,
}: {
  idPrefix: string;
  locale: Locale;
  onChange: (values: AffiliationFieldValues) => void;
  organization: ContactOwnerRef | null;
  person: ChannelSource;
  values: AffiliationFieldValues;
}) {
  const text = copy[locale];

  return (
    <>
      <Field htmlFor={`${idPrefix}-position`} label={text.position}>
        <input
          className={fieldInputClass}
          id={`${idPrefix}-position`}
          maxLength={255}
          onChange={(event) =>
            onChange({ ...values, position: event.target.value })
          }
          value={values.position}
        />
      </Field>
      <ChannelCheckboxes
        available={availableChannels(person)}
        idPrefix={`${idPrefix}-channel`}
        label={text.channels}
        locale={locale}
        onChange={(preferredChannels) =>
          onChange({ ...values, preferredChannels })
        }
        value={values.preferredChannels}
      />
      {organization?.type === "vendor" ? (
        <MultiEntitySelect
          id={`${idPrefix}-products`}
          label={text.products}
          onChange={(products) => onChange({ ...values, products })}
          placeholder={text.productsPlaceholder}
          queryKey={["catalog", "products", "vendor", organization.id]}
          search={(term) => searchVendorProducts(term, organization.id)}
          value={values.products}
        />
      ) : null}
    </>
  );
}

/** Значения полей → тело запроса связи; способы связи без данных у человека отбрасываются. */
export function affiliationPayload(
  values: AffiliationFieldValues,
  person: ChannelSource,
) {
  const available = availableChannels(person);

  return {
    position: values.position.trim(),
    preferredChannels: values.preferredChannels.filter((channel) =>
      available.includes(channel),
    ),
    productIds: values.products.map((product) => product.id),
  };
}
