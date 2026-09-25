import {
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  ContactRound,
  Factory,
  FileText,
  Handshake,
  House,
  Layers,
  ListChecks,
  PlugZap,
  Settings2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/i18n/translations";
import type { SystemRole } from "@/providers/auth-provider";

export type CrmSection =
  | "home"
  | "myTasks"
  | "contracts"
  | "licenses"
  | "reports"
  | "interactions"
  | "notifications"
  | "organizations"
  | "b2cClients"
  | "contacts"
  | "itCatalog"
  | "vendors"
  | "workflowTemplates"
  | "integrations"
  | "team";

export type CrmNavigationItem = {
  adminOnly?: boolean;
  descriptionKey: TranslationKey;
  href: string;
  icon: LucideIcon;
  id: CrmSection;
  labelKey: TranslationKey;
  /** Пункт виден только этим прикладным ролям СОВА; `isStaff` его не открывает. */
  roles?: SystemRole[];
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
        id: "interactions",
        labelKey: "interactions",
        descriptionKey: "interactionsDescription",
        href: "/interactions",
        icon: Handshake,
      },
      {
        id: "team",
        labelKey: "team",
        descriptionKey: "teamDescription",
        href: "/team",
        icon: Users,
        roles: ["head", "platform_admin"],
      },
      {
        id: "myTasks",
        labelKey: "myTasks",
        descriptionKey: "myTasksDescription",
        href: "/tasks",
        icon: ListChecks,
      },
      {
        id: "notifications",
        labelKey: "notifications",
        descriptionKey: "notificationsDescription",
        href: "/notifications",
        icon: Bell,
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
        id: "b2cClients",
        labelKey: "b2cClients",
        descriptionKey: "b2cClientsDescription",
        href: "/b2c-clients",
        icon: UserRound,
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
      {
        adminOnly: true,
        id: "integrations",
        labelKey: "integrations",
        descriptionKey: "integrationsDescription",
        href: "/settings/integrations",
        icon: PlugZap,
      },
    ],
  },
];

export const crmNavigationItems = crmNavigation.flatMap((group) => group.items);
