"use client";

import Image from "next/image";
import { Building2, List, Map as MapIcon, MapPin } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  getOrganizations,
  type OrganizationMapItem,
} from "@/components/organizations/organization-data";
import {
  OrganizationDetails,
  OrganizationMetrics,
  type OrganizationMetricLabels,
} from "@/components/organizations/organization-details";
import { OrganizationSheet } from "@/components/organizations/organization-sheet";
import { OrganizationsMap } from "@/components/organizations/organizations-map";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

// Below `lg` the map takes the full width and the details open in a sheet.
const compactViewportQuery = "(max-width: 1023.98px)";
const panelHeadingId = "organization-panel-title";
const sheetHeadingId = "organization-sheet-title";

type ViewMode = "list" | "map";

const copy = {
  ru: {
    title: "Организации",
    description:
      "Университеты и партнёрские организации, с которыми ведётся работа.",
    list: "Список",
    map: "Карта",
    organizationsCount: "организации",
    active: "Активно",
    planned: "Запланировано",
    interactions: "Взаимодействия",
    programs: "Программы",
    selectedOrganization: "Выбранный вуз",
    selectMarker: "Выберите маркер на карте",
    selectMarkerDescription:
      "Здесь появится краткая информация об организации и текущей работе с ней.",
    demoNotice: "Демонстрационные данные",
    close: "Закрыть",
  },
  en: {
    title: "Organizations",
    description:
      "Universities and partner organizations currently working with the team.",
    list: "List",
    map: "Map",
    organizationsCount: "organizations",
    active: "Active",
    planned: "Planned",
    interactions: "Interactions",
    programs: "Programs",
    selectedOrganization: "Selected university",
    selectMarker: "Select a marker on the map",
    selectMarkerDescription:
      "A short organization summary and its current activity will appear here.",
    demoNotice: "Demo data",
    close: "Close",
  },
} as const;

function OrganizationCard({
  organization,
  statusLabel,
  labels,
}: {
  organization: OrganizationMapItem;
  statusLabel: string;
  labels: OrganizationMetricLabels;
}) {
  return (
    <article className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <Image
          alt=""
          className="size-14 shrink-0 rounded-xl bg-white object-cover ring-1 ring-black/5"
          height={56}
          src={organization.logoUrl}
          width={56}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                {organization.shortName}
              </p>
              <h2 className="mt-1 leading-5 font-medium">
                {organization.name}
              </h2>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                organization.status === "active"
                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {organization.city}, {organization.address}
          </p>
        </div>
      </div>
      <OrganizationMetrics labels={labels} organization={organization} />
    </article>
  );
}

export function OrganizationsWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];
  const organizations = useMemo(() => getOrganizations(locale), [locale]);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isCompactViewport = useMediaQuery(compactViewportQuery);
  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedId) ??
    null;
  const metricLabels = {
    interactions: text.interactions,
    programs: text.programs,
  };
  const clearSelection = useCallback(() => setSelectedId(null), []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
              {text.title}
            </h1>
            <span className="bg-secondary text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
              {text.demoNotice}
            </span>
          </div>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
            {text.description}
          </p>
        </div>

        <div
          aria-label={locale === "ru" ? "Режим отображения" : "View mode"}
          className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm"
          role="group"
        >
          <Button
            aria-pressed={view === "list"}
            colorScheme={view === "list" ? "accent" : "neutral"}
            onClick={() => setView("list")}
            size="m"
            type="button"
            variant={view === "list" ? "secondary" : "ghost"}
          >
            <List aria-hidden="true" className="size-4" />
            {text.list}
          </Button>
          <Button
            aria-pressed={view === "map"}
            colorScheme={view === "map" ? "accent" : "neutral"}
            onClick={() => setView("map")}
            size="m"
            type="button"
            variant={view === "map" ? "secondary" : "ghost"}
          >
            <MapIcon aria-hidden="true" className="size-4" />
            {text.map}
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {organizations.length} {text.organizationsCount}
      </p>

      {view === "list" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {organizations.map((organization) => (
            <OrganizationCard
              key={organization.id}
              labels={metricLabels}
              organization={organization}
              statusLabel={text[organization.status]}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <OrganizationsMap
            onSelect={setSelectedId}
            organizations={organizations}
            selectedId={selectedId}
          />

          <aside
            aria-label={text.selectedOrganization}
            className="bg-card hidden rounded-xl border p-5 shadow-sm lg:block"
          >
            {selectedOrganization ? (
              <>
                <p className="text-muted-foreground mb-5 text-xs font-medium tracking-[0.08em] uppercase">
                  {text.selectedOrganization}
                </p>
                <OrganizationDetails
                  headingId={panelHeadingId}
                  labels={metricLabels}
                  organization={selectedOrganization}
                />
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
                  <Building2 aria-hidden="true" className="size-6" />
                </span>
                <h2 className="mt-4 font-medium">{text.selectMarker}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {text.selectMarkerDescription}
                </p>
              </div>
            )}
          </aside>

          {isCompactViewport && selectedOrganization ? (
            <OrganizationSheet
              closeLabel={text.close}
              labelledBy={sheetHeadingId}
              onClose={clearSelection}
            >
              <OrganizationDetails
                headingId={sheetHeadingId}
                labels={metricLabels}
                organization={selectedOrganization}
              />
            </OrganizationSheet>
          ) : null}
        </div>
      )}
    </div>
  );
}
