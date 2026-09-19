import Image from "next/image";
import { GraduationCap, MapPin, Workflow } from "lucide-react";

import type { OrganizationMapItem } from "@/components/organizations/organization-data";

export type OrganizationMetricLabels = {
  interactions: string;
  programs: string;
};

export function OrganizationMetrics({
  organization,
  labels,
}: {
  organization: OrganizationMapItem;
  labels: OrganizationMetricLabels;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="bg-secondary/55 rounded-lg p-3">
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <Workflow aria-hidden="true" className="size-4" />
          {labels.interactions}
        </span>
        <strong className="mt-1 block text-xl font-medium">
          {organization.interactions}
        </strong>
      </div>
      <div className="bg-secondary/55 rounded-lg p-3">
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <GraduationCap aria-hidden="true" className="size-4" />
          {labels.programs}
        </span>
        <strong className="mt-1 block text-xl font-medium">
          {organization.programs}
        </strong>
      </div>
    </div>
  );
}

/**
 * Details of the organization picked on the map. Rendered in the desktop side
 * panel and in the mobile sheet, so both stay in sync.
 */
export function OrganizationDetails({
  headingId,
  organization,
  labels,
}: {
  headingId: string;
  organization: OrganizationMapItem;
  labels: OrganizationMetricLabels;
}) {
  return (
    <>
      <Image
        alt=""
        className="size-20 rounded-2xl bg-white object-cover ring-1 ring-black/5"
        height={80}
        src={organization.logoUrl}
        width={80}
      />
      <p className="text-muted-foreground mt-4 text-sm font-medium">
        {organization.shortName}
      </p>
      <h2 className="mt-1 text-xl leading-6 font-medium" id={headingId}>
        {organization.name}
      </h2>
      <p className="text-muted-foreground mt-4 flex gap-2 text-sm leading-6">
        <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <span>
          {organization.city}
          <br />
          {organization.address}
        </span>
      </p>
      <OrganizationMetrics labels={labels} organization={organization} />
    </>
  );
}
