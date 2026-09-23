import {
  BadgeCheck,
  BarChart3,
  Building2,
  ContactRound,
  Factory,
  FileText,
  Handshake,
  House,
  Layers,
  ListChecks,
  Settings2,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/i18n/translations";

export type CrmSection =
  | "home"
  | "myTasks"
  | "contracts"
  | "licenses"
  | "reports"
  | "interactions"
  | "organizations"
  | "contacts"
  | "itCatalog"
  | "vendors"
  | "workflowTemplates";

export type CrmNavigationItem = {
  descriptionKey: TranslationKey;
  href: string;
  icon: LucideIcon;
  id: CrmSection;
  labelKey: TranslationKey;
};

export type CrmNavigationGroup = {
  labelKey: TranslationKey;
  items: CrmNavigationItem[];
  staffOnly?: boolean;
};

export const crmNavigation: CrmNavigationGroup[] = [
  {
    labelKey: "navWork",
    items: [
      {
        id: "home",
        labelKey: "home",
        descriptionKey: "homeDescription",
        href: "/",
        icon: House,
      },
      {
        id: "myTasks",
        labelKey: "myTasks",
        descriptionKey: "myTasksDescription",
        href: "/tasks",
        icon: ListChecks,
      },
      {
        id: "interactions",
        labelKey: "interactions",
        descriptionKey: "interactionsDescription",
        href: "/interactions",
        icon: Handshake,
      },
    ],
  },
  {
    labelKey: "navDocuments",
    items: [
      {
        id: "contracts",
        labelKey: "contracts",
        descriptionKey: "contractsDescription",
        href: "/contracts",
        icon: FileText,
      },
      {
        id: "licenses",
        labelKey: "licenses",
        descriptionKey: "licensesDescription",
        href: "/licenses",
        icon: BadgeCheck,
      },
      {
        id: "reports",
        labelKey: "reports",
        descriptionKey: "reportsDescription",
        href: "/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    labelKey: "navClients",
    items: [
      {
        id: "organizations",
        labelKey: "organizations",
        descriptionKey: "organizationsDescription",
        href: "/organizations",
        icon: Building2,
      },
      {
        id: "contacts",
        labelKey: "contacts",
        descriptionKey: "contactsDescription",
        href: "/contacts",
        icon: ContactRound,
      },
    ],
  },
  {
    labelKey: "navCatalog",
    items: [
      {
        id: "itCatalog",
        labelKey: "itCatalog",
        descriptionKey: "itCatalogDescription",
        href: "/catalog/it",
        icon: Layers,
      },
      {
        id: "vendors",
        labelKey: "vendors",
        descriptionKey: "vendorsDescription",
        href: "/catalog/vendors",
        icon: Factory,
      },
    ],
  },
  {
    labelKey: "navAdministration",
    staffOnly: true,
    items: [
      {
        id: "workflowTemplates",
        labelKey: "workflowTemplates",
        descriptionKey: "workflowTemplatesDescription",
        href: "/settings/workflows",
        icon: Settings2,
      },
    ],
  },
];

export const crmNavigationItems = crmNavigation.flatMap((group) => group.items);
