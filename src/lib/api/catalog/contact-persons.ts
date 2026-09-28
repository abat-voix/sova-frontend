import { apiEndpoints } from "@/lib/api/endpoints";
import {
  buildQuery,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  ContactActivityFilter,
  ContactPerson,
  ContactPersonPayload,
} from "@/types/contact-person";

export const contactPersonsPageSize = 20;

export const contactPersonsQueryKey = (params?: ContactPersonsQuery) => {
  if (!params) return ["catalog", "contact-persons"] as const;

  return [
    "catalog",
    "contact-persons",
    {
      activity: params.activity ?? "all",
      b2cClientId: params.b2cClientId ?? null,
      ordering: params.ordering ?? null,
      page: params.page,
      search: params.search ?? "",
      organizationId: params.organizationId ?? null,
      vendorId: params.vendorId ?? null,
    },
  ] as const;
};

/** `all` параметр не отправляет: каталог отдаёт контакты в обоих состояниях. */
function activityParam(filter: ContactActivityFilter) {
  if (filter === "all") return undefined;

  return filter === "active" ? "true" : "false";
}

export type ContactPersonsQuery = {
  activity?: ContactActivityFilter;
  /** Один клиент из списка `b2c_client__ids`: выпадушка выбирает по одному. */
  b2cClientId?: string | null;
  /** Значение параметра `ordering`; минус в начале — по убыванию. */
  ordering?: string | null;
  page: number;
  search?: string;
  /** Одна организация из списка `organization__ids`. */
  organizationId?: string | null;
  /** Один вендор из списка `vendor__ids`. */
  vendorId?: string | null;
};

export function getContactPersons({
  activity = "all",
  b2cClientId,
  ordering,
  page,
  search = "",
  organizationId,
  vendorId,
}: ContactPersonsQuery) {
  const query = buildQuery({
    b2c_client__ids: b2cClientId ?? undefined,
    is_active: activityParam(activity),
    ordering: ordering ?? undefined,
    page,
    page_size: contactPersonsPageSize,
    search: search.trim(),
    organization__ids: organizationId ?? undefined,
    vendor__ids: vendorId ?? undefined,
  });

  return getJson<PaginatedResponse<ContactPerson>>(
    `${apiEndpoints.catalog.contactPersons.list}?${query}`,
  );
}

export function getContactPerson(id: string) {
  return getJson<ContactPerson>(apiEndpoints.catalog.contactPersons.detail(id));
}

export function createContactPerson(
  payload: ContactPersonPayload,
  csrfToken: string,
) {
  return postJson<ContactPerson>(
    apiEndpoints.catalog.contactPersons.list,
    payload,
    csrfToken,
  );
}

/**
 * `is_active: false` — человек ушёл отовсюду: бэкенд отвязывает его от
 * активных взаимодействий, уведомляет КАМов и удаляет все его связи.
 */
export function updateContactPerson(
  id: string,
  payload: Partial<ContactPersonPayload> & { is_active?: boolean },
  csrfToken: string,
) {
  return patchJson<ContactPerson>(
    apiEndpoints.catalog.contactPersons.detail(id),
    payload,
    csrfToken,
  );
}

/** Был привязан к взаимодействию хоть раз — 409 `protected`: такого выключают. */
export function deleteContactPerson(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.catalog.contactPersons.detail(id), csrfToken);
}

export type PossibleDuplicatesQuery = {
  email?: string;
  /** ID самого человека при редактировании — чтобы не предлагать его же. */
  exclude?: string;
  fullName?: string;
  phone?: string;
  telegram?: string;
};

/** До 10 похожих людей — подсказка «возможно, это он» при создании. */
export function getPossibleDuplicates({
  email = "",
  exclude,
  fullName = "",
  phone = "",
  telegram = "",
}: PossibleDuplicatesQuery) {
  const query = buildQuery({
    email: email.trim(),
    exclude,
    full_name: fullName.trim(),
    phone: phone.trim(),
    telegram: telegram.trim(),
  });

  return getJson<ContactPerson[]>(
    `${apiEndpoints.catalog.contactPersons.possibleDuplicates}?${query}`,
  );
}
