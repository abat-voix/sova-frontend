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
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/i18n/translations";
import { can, type PolicyAction } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/providers/auth-provider";

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
  | "userRoles"
  | "team";

export type SectionAccess = "everyone";

export type CrmNavigationItem = {
  access?: SectionAccess;
  /** Операция политики, открывающая раздел; важнее `access`. */
  permission?: PolicyAction;
  descriptionKey: TranslationKey;
  href: string;
  icon: LucideIcon;
  id: CrmSection;
  labelKey: TranslationKey;
};

export type CrmNavigationGroup = {
  labelKey: TranslationKey;
  items: CrmNavigationItem[];
};

export const crmNavigation: CrmNavigationGroup[] = [
  {
    labelKey: "navWork",
    items: [
      {
        access: "everyone",
        id: "home",
        labelKey: "home",
        descriptionKey: "homeDescription",
        href: "/",
        icon: House,
      },
      {
        id: "interactions",
        permission: "interactions.read",
        labelKey: "interactions",
        descriptionKey: "interactionsDescription",
        href: "/interactions",
        icon: Handshake,
      },
      {
        id: "myTasks",
        permission: "processes.read",
        labelKey: "myTasks",
        descriptionKey: "myTasksDescription",
        href: "/tasks",
        icon: ListChecks,
      },
      {
        id: "notifications",
        permission: "notifications.use",
        labelKey: "notifications",
        descriptionKey: "notificationsDescription",
        href: "/notifications",
        icon: Bell,
      },
      {
        id: "team",
        permission: "teams.manage",
        labelKey: "team",
        descriptionKey: "teamDescription",
        href: "/team",
        icon: Users,
      },
    ],
  },
  {
    labelKey: "navDocuments",
    items: [
      {
        id: "contracts",
        permission: "contracts.read",
        labelKey: "contracts",
        descriptionKey: "contractsDescription",
        href: "/contracts",
        icon: FileText,
      },
      {
        id: "licenses",
        permission: "licenses.read",
        labelKey: "licenses",
        descriptionKey: "licensesDescription",
        href: "/licenses",
        icon: BadgeCheck,
      },
      {
        id: "reports",
        permission: "reports.read",
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
        permission: "catalog.read",
        labelKey: "organizations",
        descriptionKey: "organizationsDescription",
        href: "/organizations",
        icon: Building2,
      },
      {
        id: "b2cClients",
        permission: "catalog.read",
        labelKey: "b2cClients",
        descriptionKey: "b2cClientsDescription",
        href: "/b2c-clients",
        icon: UserRound,
      },
      {
        id: "contacts",
        permission: "catalog.read",
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
        permission: "catalog.read",
        labelKey: "itCatalog",
        descriptionKey: "itCatalogDescription",
        href: "/catalog/it",
        icon: Layers,
      },
      {
        id: "vendors",
        permission: "catalog.read",
        labelKey: "vendors",
        descriptionKey: "vendorsDescription",
        href: "/catalog/vendors",
        icon: Factory,
      },
    ],
  },
  {
    labelKey: "navAdministration",
    items: [
      {
        id: "workflowTemplates",
        permission: "workflows.manage",
        labelKey: "workflowTemplates",
        descriptionKey: "workflowTemplatesDescription",
        href: "/settings/workflows",
        icon: Settings2,
      },
      {
        id: "integrations",
        permission: "integrations.manage",
        labelKey: "integrations",
        descriptionKey: "integrationsDescription",
        href: "/settings/integrations",
        icon: PlugZap,
      },
      {
        id: "userRoles",
        permission: "users.manage",
        labelKey: "userRoles",
        descriptionKey: "userRolesDescription",
        href: "/settings/users",
        icon: UsersRound,
      },
    ],
  },
];

export const crmNavigationItems = crmNavigation.flatMap((group) => group.items);

type NavigationUser = Pick<
  AuthenticatedUser,
  "isStaff" | "isSuperuser" | "permissions" | "role"
>;

export function canAccessCrmSection(
  item: CrmNavigationItem,
  user: NavigationUser,
): boolean {
  if (item.permission) return can(user, item.permission);

  return item.access === "everyone";
}

export function canAccessCrmGroup(
  group: CrmNavigationGroup,
  user: NavigationUser,
): boolean {
  return group.items.some((item) => canAccessCrmSection(item, user));
}
