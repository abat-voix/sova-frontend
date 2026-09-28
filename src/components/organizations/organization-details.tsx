import { Building2 } from "lucide-react";

import { RankChip } from "@/components/catalog/rank-chip";
import { OrganizationInspector } from "@/components/organizations/organization-inspector";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format-date";
import type { University } from "@/types/university";

export type OrganizationDetailsLabels = {
  active: string;
  city: string;
  createdAt: string;
  email: string;
  externalCode: string;
  hasInteractions: string;
  inactive: string;
  inn: string;
  noInteractions: string;
  noValue: string;
  phone: string;
  place: (rank: number) => string;
  updatedAt: string;
};

/**
 * Details of the organization picked on the map. Rendered in the desktop side
 * panel and in the mobile sheet, so both stay in sync.
 */
export function OrganizationDetails({
  headingId,
  labels,
  locale,
  organization,
}: {
  headingId: string;
  labels: OrganizationDetailsLabels;
  locale: "ru" | "en";
  organization: University;
}) {
  return (
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
        [labels.city, organization.city],
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
  );
}
