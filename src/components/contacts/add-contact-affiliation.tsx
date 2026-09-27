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
  apiErrorMessage,
  Field,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { createAffiliation } from "@/lib/api/catalog/contact-affiliations";
import {
  searchB2CClients,
  searchUniversities,
  searchVendors,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { useLocale } from "@/providers/locale-provider";
import type { ContactPerson, OrganizationType } from "@/types/contact-person";

const headingId = "add-contact-affiliation-title";

const copy = {
  ru: {
    title: "Добавить организацию",
    type: "Тип организации",
    organization: "Организация",
    organizationPlaceholder: "Выберите организацию",
    submit: "Добавить",
    types: { b2c_client: "B2C-клиент", university: "Вуз", vendor: "Вендор" },
  },
  en: {
    title: "Add organization",
    type: "Organization type",
    organization: "Organization",
    organizationPlaceholder: "Pick an organization",
    submit: "Add",
    types: {
      b2c_client: "B2C client",
      university: "University",
      vendor: "Vendor",
    },
  },
} as const;

const searchByType: Record<
  OrganizationType,
  (term: string) => Promise<LookupOption[]>
> = {
  b2c_client: searchB2CClients,
  university: searchUniversities,
  vendor: searchVendors,
};

/** Человек начал работать ещё с одной организацией — новая связь. */
export function AddContactAffiliation({
  contact,
  csrfToken,
  onClose,
  onSaved,
}: {
  contact: ContactPerson;
  csrfToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [type, setType] = useState<OrganizationType>("university");
  const [organization, setOrganization] = useState<LookupOption | null>(null);
  const [values, setValues] = useState<AffiliationFieldValues>(
    emptyAffiliationValues,
  );
  // Связь с организацией уже есть — вторую не создать, не предлагаем её.
  const linkedIds = contact.affiliations
    .filter((item) => item.type === type)
    .map((item) => item.organization.id);
  const organizationRef = organization ? { id: organization.id, type } : null;

  const mutation = useMutation({
    mutationFn: () =>
      createAffiliation(
        {
          contactId: contact.id,
          organization: organizationRef!,
          ...affiliationPayload(values),
        },
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
            {contact.full_name}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field htmlFor="add-contact-affiliation-type" label={text.type}>
            <Select
              className="mt-1"
              id="add-contact-affiliation-type"
              onChange={(event) => {
                setType(event.target.value as OrganizationType);
                setOrganization(null);
                setValues(emptyAffiliationValues);
              }}
              value={type}
            >
              {(Object.keys(text.types) as OrganizationType[]).map((value) => (
                <option key={value} value={value}>
                  {text.types[value]}
                </option>
              ))}
            </Select>
          </Field>
          <EntitySelect
            excludeIds={linkedIds}
            id="add-contact-affiliation-organization"
            label={text.organization}
            onChange={setOrganization}
            placeholder={text.organizationPlaceholder}
            queryKey={["catalog", "organizations", "lookup", type]}
            search={searchByType[type]}
            value={organization}
          />
          <AffiliationFields
            idPrefix="add-contact-affiliation"
            locale={locale}
            onChange={setValues}
            organization={organizationRef}
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
            <Button
              disabled={!organization || mutation.isPending}
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
