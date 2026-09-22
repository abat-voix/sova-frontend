import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  ContactActivityFilter,
  ContactPerson,
} from "@/types/contact-person";

export const contactPersonsPageSize = 20;

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
  /** Один вуз из списка `university__ids`. */
  universityId?: string | null;
};

export function getContactPersons({
  activity = "all",
  b2cClientId,
  ordering,
  page,
  search = "",
  universityId,
}: ContactPersonsQuery) {
  const query = buildQuery({
    b2c_client__ids: b2cClientId ?? undefined,
    is_active: activityParam(activity),
    ordering: ordering ?? undefined,
    page,
    page_size: contactPersonsPageSize,
    search: search.trim(),
    university__ids: universityId ?? undefined,
  });

  return getJson<PaginatedResponse<ContactPerson>>(
    `${apiEndpoints.catalog.contactPersons.list}?${query}`,
  );
}

export function getContactPerson(id: string) {
  return getJson<ContactPerson>(apiEndpoints.catalog.contactPersons.detail(id));
}
