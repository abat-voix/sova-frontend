/**
 * Справочники для выпадушек формы взаимодействия.
 *
 * Каждая функция приводит ответ каталога к паре `{ id, name }`: выпадушке
 * (`EntitySelect`) не нужно знать, что у B2C-клиента поле называется
 * `full_name`, а у направления — `name`.
 */

import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import { listUsers } from "@/lib/api/users/team";
import type { SystemRole } from "@/providers/auth-provider";
import type { PaginatedResponse } from "@/types/api";
import type { B2CClient, Direction, Product, Program } from "@/types/catalog";
import type { Contract } from "@/types/contract";
import type { Organization } from "@/types/organization";
import type { Vendor } from "@/types/vendor";
import type {
  Interaction,
  InteractionProduct,
  Workflow,
  WorkflowAudience,
} from "@/types/workflow-board";

export type LookupOption = {
  id: string;
  name: string;
  /** Пояснение под названием варианта в выпадушке. */
  hint?: string;
};

export const lookupPageSize = 20;

function lookupQuery(search: string, extra: Record<string, string> = {}) {
  return buildQuery({
    is_active: "true",
    page: 1,
    page_size: lookupPageSize,
    search: search.trim(),
    ...extra,
  });
}

async function fetchOptions<T>(
  url: string,
  toOption: (item: T) => LookupOption,
) {
  const page = await getJson<PaginatedResponse<T>>(url);

  return page.results.map(toOption);
}

export function searchOrganizations(search: string) {
  return fetchOptions<Organization>(
    `${apiEndpoints.catalog.organizations.list}?${lookupQuery(search)}`,
    (organization) => ({ id: organization.id, name: organization.name }),
  );
}

export function searchB2CClients(search: string) {
  return fetchOptions<B2CClient>(
    `${apiEndpoints.catalog.b2cClients.list}?${lookupQuery(search)}`,
    (client) => ({ id: client.id, name: client.full_name }),
  );
}

export function searchDirections(search: string) {
  return fetchOptions<Direction>(
    `${apiEndpoints.catalog.directions.list}?${lookupQuery(search)}`,
    (direction) => ({ id: direction.id, name: direction.name }),
  );
}

/** Программы каталога принадлежат ровно одному направлению — отсюда фильтр. */
export function searchPrograms(search: string, directionId: string) {
  return fetchOptions<Program>(
    `${apiEndpoints.catalog.programs.list}?${lookupQuery(search, {
      direction__ids: directionId,
    })}`,
    (program) => ({ id: program.id, name: program.name }),
  );
}

/**
 * Продукты выбранной программы. Бэкенд при создании продукта взаимодействия
 * проверяет, что продукт входит в каталог программы, — фильтр снимает этот
 * отказ заранее.
 */
export function searchProducts(search: string, programId: string) {
  return fetchOptions<Product>(
    `${apiEndpoints.catalog.products.list}?${lookupQuery(search, {
      program__ids: programId,
    })}`,
    (product) => ({ id: product.id, name: product.name }),
  );
}

export function searchVendors(search: string) {
  return fetchOptions<Vendor>(
    `${apiEndpoints.catalog.vendors.list}?${lookupQuery(search)}`,
    (vendor) => ({ id: vendor.id, name: vendor.name }),
  );
}

/** Продукты одного вендора — за них отвечает его контактное лицо. */
export function searchVendorProducts(search: string, vendorId: string) {
  return fetchOptions<Product>(
    `${apiEndpoints.catalog.products.list}?${lookupQuery(search, { vendor__ids: vendorId })}`,
    (product) => ({ id: product.id, name: product.name }),
  );
}

/** Любой продукт каталога — для отборов, где программа не важна. */
export function searchCatalogProducts(search: string) {
  return fetchOptions<Product>(
    `${apiEndpoints.catalog.products.list}?${lookupQuery(search)}`,
    (product) => ({ id: product.id, name: product.name }),
  );
}

/**
 * Взаимодействия, включая неактивные: договор мог быть заключён по уже
 * закрытому взаимодействию. Подпись — контрагент, другого имени нет.
 */
export function searchInteractions(search: string) {
  const query = buildQuery({
    page: 1,
    page_size: lookupPageSize,
    search: search.trim(),
  });

  return fetchOptions<Interaction>(
    `${apiEndpoints.interactions.interactions.list}?${query}`,
    (interaction) => ({
      id: interaction.id,
      name:
        interaction.organization?.name ??
        interaction.b2c_client?.full_name ??
        "—",
    }),
  );
}

export function searchContracts(search: string) {
  const query = buildQuery({
    ordering: "contract_number",
    page: 1,
    page_size: lookupPageSize,
    search: search.trim(),
  });

  return fetchOptions<Contract>(
    `${apiEndpoints.interactions.contracts.list}?${query}`,
    (contract) => ({
      id: contract.id,
      name: [
        contract.contract_number || "б/н",
        contract.organization?.name ?? contract.b2c_client?.full_name,
      ]
        .filter(Boolean)
        .join(" · "),
    }),
  );
}

/** Продукты конкретного взаимодействия — лицензия выдаётся только на них. */
export function searchInteractionProducts(
  search: string,
  interactionId: string,
) {
  const query = buildQuery({
    interaction__ids: interactionId,
    page: 1,
    page_size: 50,
    search: search.trim(),
  });

  return fetchOptions<InteractionProduct>(
    `${apiEndpoints.interactions.interactionProducts.list}?${query}`,
    (item) => ({ id: item.id, name: item.product.name }),
  );
}

/** Активные собеседники мессенджера; доступно всем авторизованным пользователям. */
export function searchConversationRecipients(search: string) {
  const query = buildQuery({
    page: 1,
    page_size: 50,
    search: search.trim(),
  });

  return fetchOptions<{ id: number; full_name: string }>(
    `${apiEndpoints.messaging.conversations.recipients}?${query}`,
    (user) => ({ id: String(user.id), name: user.full_name }),
  );
}

/**
 * Кандидаты в ответственные по роли: руководителю бэк сам отдаёт
 * его команду и свободных КАМов, администратору — только КАМов и
 * руководителей. Свободного КАМа руководитель забирает в команду при
 * назначении — `freeHint` подписывает такие варианты.
 */
export function searchManagers(role: SystemRole | null, freeHint?: string) {
  return async (search: string): Promise<LookupOption[]> => {
    const page = await listUsers({
      pageSize: 50,
      role: role === "platform_admin" ? ["kam", "head"] : undefined,
      search,
    });

    return page.results.map((user) => ({
      hint:
        role === "head" && user.role === "kam" && user.head === null
          ? freeHint
          : undefined,
      id: String(user.id),
      name: user.full_name,
    }));
  };
}

/**
 * Шаблоны workflow, пригодные для запуска.
 *
 * `is_active=true` и фильтр по аудитории снимают заранее две ошибки движка —
 * `workflow_inactive` и `audience_mismatch`.
 */
export function searchWorkflows(search: string, audience: WorkflowAudience) {
  const query = buildQuery({
    is_active: "true",
    audience,
    page: 1,
    page_size: lookupPageSize,
    search: search.trim(),
  });

  return fetchOptions<Workflow>(
    `${apiEndpoints.workflows.workflows.list}?${query}`,
    (workflow) => ({ id: workflow.id, name: workflow.name }),
  );
}
