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

export type SectionAccess =
  | "authenticated"
  | "workflow_manager"
  | "team_manager"
  | "platform_operator"
  | "platform_admin";

export type CrmNavigationItem = {
  access?: SectionAccess;
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
      {
        access: "team_manager",
        id: "team",
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
    items: [
      {
        access: "workflow_manager",
        id: "workflowTemplates",
        labelKey: "workflowTemplates",
        descriptionKey: "workflowTemplatesDescription",
        href: "/settings/workflows",
        icon: Settings2,
      },
      {
        access: "platform_operator",
        id: "integrations",
        labelKey: "integrations",
        descriptionKey: "integrationsDescription",
        href: "/settings/integrations",
        icon: PlugZap,
      },
      {
        access: "platform_admin",
        id: "userRoles",
        labelKey: "userRoles",
        descriptionKey: "userRolesDescription",
        href: "/settings/users",
        icon: UsersRound,
      },
    ],
  },
];

export const crmNavigationItems = crmNavigation.flatMap((group) => group.items);

export function canAccessCrmSection(
  item: CrmNavigationItem,
  user: Pick<AuthenticatedUser, "isStaff" | "role">,
): boolean {
  const access = item.access ?? "authenticated";

  if (access === "authenticated") return true;
  // Команду ведёт руководитель, администратор — команды всех руководителей
  if (access === "workflow_manager" || access === "team_manager") {
    return user.role === "head" || user.role === "platform_admin";
  }
  if (access === "platform_operator") {
    return user.isStaff || user.role === "platform_admin";
  }
  return user.role === "platform_admin";
}

export function canAccessCrmGroup(
  group: CrmNavigationGroup,
  user: Pick<AuthenticatedUser, "isStaff" | "role">,
): boolean {
  return group.items.some((item) => canAccessCrmSection(item, user));
}
