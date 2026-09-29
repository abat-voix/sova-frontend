import type { OrganizationType } from "@/types/organization";

/** Подписи видов организаций — порядок как в выпадающем списке формы. */
export const organizationTypeLabels: Record<
  "ru" | "en",
  Record<OrganizationType, string>
> = {
  ru: {
    education: "Вуз",
    company: "Компания",
    government: "Государственная организация",
    nonprofit: "Некоммерческая организация",
    healthcare: "Здравоохранение",
    facility: "Научный объект",
    funder: "Фонд",
    archive: "Архив",
    other: "Другое",
  },
  en: {
    education: "University",
    company: "Company",
    government: "Government",
    nonprofit: "Nonprofit",
    healthcare: "Healthcare",
    facility: "Research facility",
    funder: "Funder",
    archive: "Archive",
    other: "Other",
  },
};
