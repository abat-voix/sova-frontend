import {
  Building2,
  ContactRound,
  FileText,
  House,
  Settings2,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/i18n/translations";

export type CrmSection =
  | "home"
  | "contracts"
  | "processes"
  | "organizations"
  | "contacts"
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
        id: "contracts",
        labelKey: "contracts",
        descriptionKey: "contractsDescription",
        href: "/contracts",
        icon: FileText,
      },
      {
        id: "processes",
        labelKey: "processes",
        descriptionKey: "processesDescription",
        href: "/processes",
        icon: Workflow,
      },
    ],
  },
  {
    labelKey: "navDirectory",
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
