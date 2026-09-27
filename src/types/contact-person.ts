/**
 * Контактное лицо — человек без привязки к организации (`ContactPerson` бэкенда).
 *
 * С вузами, B2C-клиентами и вендорами его связывают связи (`affiliations`):
 * должность, способы связи и продукты вендора принадлежат связи. У связи нет
 * активности и дат — она либо есть, либо её нет: человек ушёл из организации —
 * связь удаляют. Активность есть только у человека.
 */
export type ContactPerson = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  /** Ник без `@`; ввод `@nick` и `t.me/nick` бэкенд приводит к `nick`. */
  telegram: string;
  is_active: boolean;
  /** От новых связей к старым. */
  affiliations: ContactAffiliation[];
  created_at: string;
  updated_at: string;
};

/** Человек в составе связи — без его других связей. */
export type ContactPersonShort = Pick<
  ContactPerson,
  "id" | "full_name" | "email" | "phone" | "telegram" | "is_active"
>;

export type OrganizationType = "university" | "b2c_client" | "vendor";

/** Организация, с которой связан человек: тип определяет эндпоинт связи. */
export type OrganizationRef = { id: string; type: OrganizationType };

export const contactChannels = ["email", "telegram", "phone", "other"] as const;

export type ContactChannel = (typeof contactChannels)[number];

export type ProductShort = { id: string; name: string };

/** Связь человека с организацией в карточке человека. */
export type ContactAffiliation = {
  id: string;
  type: OrganizationType;
  organization: { id: string; name: string };
  position: string;
  preferred_channels: ContactChannel[];
  /** Только у вендора, у остальных — пусто. */
  products: ProductShort[];
};

/** Связь в списке контактов организации: человек и его должность в ней. */
export type OrganizationAffiliation = {
  id: string;
  contact: ContactPersonShort;
  position: string;
  preferred_channels: ContactChannel[];
  products: ProductShort[];
  created_at: string;
  updated_at: string;
};

export type ContactPersonPayload = {
  full_name: string;
  email: string;
  phone: string;
  telegram: string;
};

/**
 * Отбор по активности. `all` параметр не отправляет.
 *
 * Отбора по типу контрагента у эндпоинта нет: каталог фильтрует списками
 * `university__ids`, `b2c_client__ids` и `vendor__ids`, то есть по конкретным организациям.
 */
export type ContactActivityFilter = "all" | "active" | "inactive";
