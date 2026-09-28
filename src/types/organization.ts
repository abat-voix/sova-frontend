import type { OrganizationAddress } from "@/types/address";

/** Вид организации; вуз — `education`. */
export type OrganizationType =
  | "education"
  | "healthcare"
  | "company"
  | "archive"
  | "nonprofit"
  | "government"
  | "facility"
  | "funder"
  | "other";

export type Organization = {
  id: string;
  name: string;
  inn: string | null;
  external_code: string | null;
  organization_type: OrganizationType;
  has_interactions: boolean;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  legal_address: OrganizationAddress | null;
  /** С учётом `actual_same_as_legal`: тогда здесь юридический адрес. */
  actual_address: OrganizationAddress | null;
  actual_same_as_legal: boolean;
  /** Место в рейтинге по числу зачисленных людей; `null` — места нет. */
  rank?: number | null;
};

/**
 * Поля, которые принимает бэкенд при создании и изменении организации.
 * Адрес `null` удаляется, отсутствующий ключ — не меняется.
 */
export type WriteOrganization = Pick<
  Organization,
  | "name"
  | "inn"
  | "external_code"
  | "organization_type"
  | "email"
  | "phone"
  | "is_active"
  | "actual_same_as_legal"
> & {
  legal_address?: Partial<OrganizationAddress> | null;
  actual_address?: Partial<OrganizationAddress> | null;
};

/** Точка карты: по фактическому адресу, без его координат — по юридическому. */
export type OrganizationMapPoint = Pick<
  Organization,
  "id" | "has_interactions"
> & {
  lat: string;
  lon: string;
};

/** Отбор по наличию взаимодействий. `all` параметр не отправляет. */
export type InteractionsFilter = "all" | "with" | "without";
