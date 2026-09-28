import { Building2 } from "lucide-react";

import { RankChip } from "@/components/catalog/rank-chip";
import { Button } from "@/components/ui/button";
import { OrganizationInspector } from "@/components/organizations/organization-inspector";
import { StatusChip } from "@/components/ui/status-chip";
import { formatAddress, organizationCity } from "@/lib/address";
import { formatDate } from "@/lib/format-date";
import { organizationTypeLabels } from "@/lib/organization-type";
import type { Organization } from "@/types/organization";

export type OrganizationDetailsLabels = {
  active: string;
  actualAddress: string;
  city: string;
  createdAt: string;
  email: string;
  externalCode: string;
  hasInteractions: string;
  inactive: string;
  inn: string;
  legalAddress: string;
  noInteractions: string;
  noValue: string;
  phone: string;
  place: (rank: number) => string;
  sameAsLegal: string;
  type: string;
  updatedAt: string;
  createInteraction: string;
};

/**
 * Details of the organization picked on the map. Rendered in the desktop side
 * panel and in the mobile sheet, so both stay in sync.
 */
export function OrganizationDetails({
  headingId,
  labels,
  locale,
  onCreateInteraction,
  organization,
}: {
  headingId: string;
  labels: OrganizationDetailsLabels;
  locale: "ru" | "en";
  onCreateInteraction?: () => void;
  organization: Organization;
}) {
  return (
    <>
      <OrganizationInspector
        chips={
          <>
            <StatusChip tone={organization.is_active ? "positive" : "neutral"}>
              {organization.is_active ? labels.active : labels.inactive}
            </StatusChip>
            <StatusChip
              tone={organization.has_interactions ? "accent" : "neutral"}
            >
              {organization.has_interactions
                ? labels.hasInteractions
                : labels.noInteractions}
            </StatusChip>
            <RankChip label={labels.place} rank={organization.rank} />
          </>
        }
        headingId={headingId}
        icon={<Building2 aria-hidden="true" className="size-6" />}
        noValueLabel={labels.noValue}
        rows={[
          [
            labels.type,
            organizationTypeLabels[locale][organization.organization_type],
          ],
          [labels.city, organizationCity(organization)],
          [labels.legalAddress, formatAddress(organization.legal_address)],
          [
            labels.actualAddress,
            organization.actual_same_as_legal
              ? labels.sameAsLegal
              : formatAddress(organization.actual_address),
          ],
          [labels.inn, organization.inn],
          [
            labels.email,
            organization.email ? (
              <a
                className="break-all hover:underline"
                href={`mailto:${organization.email}`}
              >
                {organization.email}
              </a>
            ) : null,
          ],
          [
            labels.phone,
            organization.phone ? (
              <a className="hover:underline" href={`tel:${organization.phone}`}>
                {organization.phone}
              </a>
            ) : null,
          ],
          [
            labels.externalCode,
            organization.external_code ? (
              <a
                className="break-all text-[var(--atmr-accent-primary)] hover:underline"
                href={organization.external_code}
                rel="noreferrer"
                target="_blank"
              >
                {organization.external_code}
              </a>
            ) : null,
          ],
          [labels.createdAt, formatDate(organization.created_at, locale)],
          [labels.updatedAt, formatDate(organization.updated_at, locale)],
        ]}
        title={organization.name}
      />
      {onCreateInteraction ? (
        <Button
          className="mt-5 w-full"
          onClick={onCreateInteraction}
          size="m"
          type="button"
        >
          {labels.createInteraction}
        </Button>
      ) : null}
    </>
  );
}
