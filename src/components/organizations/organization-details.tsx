import {
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  createInteraction: string;
};

/**
 * Details of the organization picked on the map. Rendered in the desktop side
 * panel and in the mobile sheet, so both stay in sync.
 */
export function OrganizationDetails({
  headingId,
  labels,
  onCreateInteraction,
  locale,
  organization,
}: {
  headingId: string;
  labels: OrganizationDetailsLabels;
  onCreateInteraction?: () => void;
  locale: "ru" | "en";
  organization: University;
}) {
  return (
    <>
      <span className="flex size-16 items-center justify-center rounded-2xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
        <Building2 aria-hidden="true" className="size-8" />
      </span>
      <h2 className="mt-1 text-xl leading-6 font-medium" id={headingId}>
        {organization.name}
      </h2>
      <span className="mt-3 flex flex-wrap gap-2">
        <StatusChip tone={organization.is_active ? "positive" : "neutral"}>
          {organization.is_active ? labels.active : labels.inactive}
        </StatusChip>
        <StatusChip tone={organization.has_interactions ? "accent" : "neutral"}>
          {organization.has_interactions
            ? labels.hasInteractions
            : labels.noInteractions}
        </StatusChip>
      </span>
      {organization.city ? (
        <p className="text-muted-foreground mt-4 flex gap-2 text-sm leading-6">
          <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
          {organization.city}
        </p>
      ) : null}
      {organization.inn ? (
        <p className="text-muted-foreground mt-3 text-sm">
          {labels.inn}: {organization.inn}
        </p>
      ) : null}
      <div className="mt-4 space-y-2 text-sm">
        {organization.email ? (
          <a
            className="flex items-center gap-2 hover:underline"
            href={`mailto:${organization.email}`}
          >
            <Mail aria-hidden="true" className="size-4" />
            {organization.email}
          </a>
        ) : null}
        {organization.phone ? (
          <a
            className="flex items-center gap-2 hover:underline"
            href={`tel:${organization.phone}`}
          >
            <Phone aria-hidden="true" className="size-4" />
            {organization.phone}
          </a>
        ) : null}
        {organization.external_code ? (
          <a
            className="flex items-center gap-2 break-all text-[var(--atmr-accent-primary)] hover:underline"
            href={organization.external_code}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            {organization.external_code}
          </a>
        ) : null}
      </div>
      {onCreateInteraction ? (
        <Button
          className="mt-5 w-full"
          onClick={onCreateInteraction}
          size="m"
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          {labels.createInteraction}
        </Button>
      ) : null}
    </>
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
