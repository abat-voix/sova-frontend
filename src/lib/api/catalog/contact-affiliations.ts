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
  ContactChannel,
  ContactPersonPayload,
  OrganizationAffiliation,
  ContactOwnerRef,
  ContactOwnerType,
} from "@/types/contact-person";

export const organizationAffiliationsPageSize = 20;

/**
 * У каждого типа организации свой эндпоинт связей: здесь — единственное место,
 * которое знает, какой эндпоинт, поле и фильтр у вуза, B2C-клиента и вендора.
 */
const resources: Record<
  ContactOwnerType,
  {
    endpoint: { detail: (id: string) => string; list: string };
    field: string;
    filter: string;
  }
> = {
  b2c_client: {
    endpoint: apiEndpoints.catalog.b2cClientContacts,
    field: "b2c_client",
    filter: "b2c_client__ids",
  },
  organization: {
    endpoint: apiEndpoints.catalog.organizationContacts,
    field: "organization",
    filter: "organization__ids",
  },
  vendor: {
    endpoint: apiEndpoints.catalog.vendorContacts,
    field: "vendor",
    filter: "vendor__ids",
  },
};

/** Без аргумента — ключ всех списков связей: для инвалидации после записи. */
export function organizationAffiliationsQueryKey(
  organization?: ContactOwnerRef,
) {
  if (!organization) return ["catalog", "contact-affiliations"] as const;

  return [
    "catalog",
    "contact-affiliations",
    organization.type,
    organization.id,
  ] as const;
}

export type OrganizationAffiliationsQuery = {
  /** Только активные люди — кандидаты для привязки к взаимодействию. */
  activeContactsOnly?: boolean;
  organization: ContactOwnerRef;
  page: number;
  search?: string;
};

type RawAffiliation = Omit<OrganizationAffiliation, "products"> & {
  products?: OrganizationAffiliation["products"];
};

export async function getOrganizationAffiliations({
  activeContactsOnly = false,
  organization,
  page,
  search = "",
}: OrganizationAffiliationsQuery): Promise<
  PaginatedResponse<OrganizationAffiliation>
> {
  const resource = resources[organization.type];
  const query = buildQuery({
    [resource.filter]: organization.id,
    contact__is_active: activeContactsOnly ? "true" : undefined,
    page,
    page_size: organizationAffiliationsPageSize,
    search: search.trim(),
  });
  const response = await getJson<PaginatedResponse<RawAffiliation>>(
    `${resource.endpoint.list}?${query}`,
  );

  return {
    ...response,
    // Продукты бывают только у вендора; остальным отдаём пустой список.
    results: response.results.map((affiliation) => ({
      ...affiliation,
      products: affiliation.products ?? [],
    })),
  };
}

export type AffiliationValues = {
  position: string;
  preferredChannels: ContactChannel[];
  /** Только для вендора: продукты этого вендора. */
  productIds?: string[];
};

function affiliationBody(type: ContactOwnerType, values: AffiliationValues) {
  return {
    position: values.position,
    preferred_channels: values.preferredChannels,
    ...(type === "vendor" && values.productIds
      ? { products: values.productIds }
      : {}),
  };
}

/** Человек связи: существующий (`contactId`) или новый — создаётся вместе со связью. */
export type AffiliationPerson =
  | { contactId: string; newContact?: never }
  | { contactId?: never; newContact: ContactPersonPayload };

/**
 * Новая связь; у выключенного человека она включает его (на бэкенде). Новый
 * человек создаётся в той же транзакции: ошибка связи не оставит его без организации.
 */
export function createAffiliation(
  {
    contactId,
    newContact,
    organization,
    ...values
  }: AffiliationValues & AffiliationPerson & { organization: ContactOwnerRef },
  csrfToken: string,
) {
  const resource = resources[organization.type];

  return postJson<{ id: string }>(
    resource.endpoint.list,
    {
      ...(newContact ? { new_contact: newContact } : { contact: contactId }),
      [resource.field]: organization.id,
      ...affiliationBody(organization.type, values),
    },
    csrfToken,
  );
}

export function updateAffiliation(
  type: ContactOwnerType,
  id: string,
  values: AffiliationValues,
  csrfToken: string,
) {
  return patchJson<{ id: string }>(
    resources[type].endpoint.detail(id),
    affiliationBody(type, values),
    csrfToken,
  );
}

/**
 * Удаление связи = человек ушёл из организации: у вуза и B2C-клиента бэкенд
 * отвязывает его от активных взаимодействий организации и уведомляет КАМов.
 */
export function deleteAffiliation(
  type: ContactOwnerType,
  id: string,
  csrfToken: string,
) {
  return deleteJson(resources[type].endpoint.detail(id), csrfToken);
}
