/**
 * Справочники для выпадушек формы взаимодействия.
 *
 * Каждая функция приводит ответ каталога к паре `{ id, name }`: выпадушке
 * (`EntitySelect`) не нужно знать, что у B2C-клиента поле называется
 * `full_name`, а у направления — `name`.
 */

import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { B2CClient, Direction, Product, Program } from "@/types/catalog";
import type { University } from "@/types/university";
import type { SovaUser } from "@/types/user";
import type { Workflow, WorkflowAudience } from "@/types/workflow-board";

export type LookupOption = {
  id: string;
  name: string;
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

export function searchUniversities(search: string) {
  return fetchOptions<University>(
    `${apiEndpoints.catalog.universities.list}?${lookupQuery(search)}`,
    (university) => ({ id: university.id, name: university.name }),
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

/**
 * Кандидаты в ответственные.
 *
 * Состав списка определяет бэкенд по роли текущего пользователя: руководитель
 * видит КАМов, администратор платформы — всех, кроме администраторов. КАМу
 * эндпоинт отвечает 403, поэтому форма его для КАМа не вызывает.
 *
 * `id` пользователя — число; приводим к строке, потому что выпадушка работает
 * со строковыми идентификаторами, и разворачиваем обратно при назначении.
 */
export function searchManagers(search: string) {
  const query = buildQuery({
    page: 1,
    page_size: 50,
    search: search.trim(),
  });

  return fetchOptions<SovaUser>(
    `${apiEndpoints.users.list}?${query}`,
    (user) => ({ id: String(user.id), name: user.full_name }),
  );
}

/**
 * Шаблоны workflow, пригодные для запуска.
 *
 * `active=true` и фильтр по аудитории снимают заранее две ошибки движка —
 * `workflow_inactive` и `audience_mismatch`.
 */
export function searchWorkflows(search: string, audience: WorkflowAudience) {
  const query = buildQuery({
    active: "true",
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
