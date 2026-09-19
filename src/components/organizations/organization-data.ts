import type { Locale } from "@/i18n/translations";

export type OrganizationStatus = "active" | "planned";

export type OrganizationMapItem = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  logoUrl: string;
  interactions: number;
  programs: number;
  status: OrganizationStatus;
};

type OrganizationSource = Omit<
  OrganizationMapItem,
  "address" | "city" | "name"
> & {
  address: Record<Locale, string>;
  city: Record<Locale, string>;
  name: Record<Locale, string>;
};

const organizationSources: OrganizationSource[] = [
  {
    id: "bmstu",
    shortName: "МГТУ",
    name: {
      ru: "МГТУ им. Н. Э. Баумана",
      en: "Bauman Moscow State Technical University",
    },
    city: { ru: "Москва", en: "Moscow" },
    address: {
      ru: "2-я Бауманская улица, 5",
      en: "5, 2nd Baumanskaya Street",
    },
    latitude: 55.7659,
    longitude: 37.6848,
    logoUrl: "/universities/bmstu.svg",
    interactions: 4,
    programs: 7,
    status: "active",
  },
  {
    id: "msu",
    shortName: "МГУ",
    name: {
      ru: "МГУ имени М. В. Ломоносова",
      en: "Lomonosov Moscow State University",
    },
    city: { ru: "Москва", en: "Moscow" },
    address: {
      ru: "Ленинские горы, 1",
      en: "1, Leninskie Gory",
    },
    latitude: 55.7033,
    longitude: 37.5307,
    logoUrl: "/universities/msu.svg",
    interactions: 3,
    programs: 5,
    status: "active",
  },
  {
    id: "hse",
    shortName: "ВШЭ",
    name: {
      ru: "Национальный исследовательский университет ВШЭ",
      en: "HSE University",
    },
    city: { ru: "Москва", en: "Moscow" },
    address: {
      ru: "Мясницкая улица, 20",
      en: "20, Myasnitskaya Street",
    },
    latitude: 55.7618,
    longitude: 37.6336,
    logoUrl: "/universities/hse.svg",
    interactions: 2,
    programs: 4,
    status: "planned",
  },
  {
    id: "itmo",
    shortName: "ИТМО",
    name: {
      ru: "Университет ИТМО",
      en: "ITMO University",
    },
    city: { ru: "Санкт-Петербург", en: "Saint Petersburg" },
    address: {
      ru: "Кронверкский проспект, 49",
      en: "49, Kronverksky Avenue",
    },
    latitude: 59.9561,
    longitude: 30.309,
    logoUrl: "/universities/itmo.svg",
    interactions: 3,
    programs: 6,
    status: "active",
  },
];

export function getOrganizations(locale: Locale): OrganizationMapItem[] {
  return organizationSources.map((organization) => ({
    ...organization,
    address: organization.address[locale],
    city: organization.city[locale],
    name: organization.name[locale],
  }));
}
