"use client";

import Image from "next/image";
import {
  Building2,
  GraduationCap,
  List,
  Map as MapIcon,
  MapPin,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  getOrganizations,
  type OrganizationMapItem,
} from "@/components/organizations/organization-data";
import { OrganizationsMap } from "@/components/organizations/organizations-map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

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
  },
} as const;

function OrganizationMetrics({
  organization,
  labels,
}: {
  organization: OrganizationMapItem;
  labels: { interactions: string; programs: string };
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

function OrganizationCard({
  organization,
  statusLabel,
  labels,
}: {
  organization: OrganizationMapItem;
  statusLabel: string;
  labels: { interactions: string; programs: string };
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
  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedId) ??
    null;
  const metricLabels = {
    interactions: text.interactions,
    programs: text.programs,
  };

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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <OrganizationsMap
            onSelect={setSelectedId}
            organizations={organizations}
            selectedId={selectedId}
          />

          <aside className="bg-card rounded-xl border p-5 shadow-sm">
            {selectedOrganization ? (
              <>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                  {text.selectedOrganization}
                </p>
                <Image
                  alt=""
                  className="mt-5 size-20 rounded-2xl bg-white object-cover ring-1 ring-black/5"
                  height={80}
                  src={selectedOrganization.logoUrl}
                  width={80}
                />
                <p className="text-muted-foreground mt-4 text-sm font-medium">
                  {selectedOrganization.shortName}
                </p>
                <h2 className="mt-1 text-xl leading-6 font-medium">
                  {selectedOrganization.name}
                </h2>
                <p className="text-muted-foreground mt-4 flex gap-2 text-sm leading-6">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
                  <span>
                    {selectedOrganization.city}
                    <br />
                    {selectedOrganization.address}
                  </span>
                </p>
                <OrganizationMetrics
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
        </div>
      )}
    </div>
  );
}
