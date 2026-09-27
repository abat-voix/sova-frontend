"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  AffiliationFields,
  affiliationPayload,
  type AffiliationFieldValues,
} from "@/components/contacts/affiliation-fields";
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
  OrganizationRef,
  ProductShort,
} from "@/types/contact-person";

const headingId = "edit-affiliation-title";

const copy = {
  ru: { title: "Должность и способы связи" },
  en: { title: "Position and channels" },
} as const;

/** Правка связи: организация и человек не меняются — другая организация это другая связь. */
export function EditAffiliation({
  affiliation,
  contactName,
  csrfToken,
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
  contactName: string;
  csrfToken: string;
  onClose: () => void;
  onSaved: () => void;
  organization: OrganizationRef;
  organizationName: string;
}) {
  const { locale } = useLocale();
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
        affiliationPayload(values),
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
            {copy[locale].title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {contactName} · {organizationName}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <AffiliationFields
            idPrefix="edit-affiliation"
            locale={locale}
            onChange={setValues}
            organization={organization}
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
