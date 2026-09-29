/**
 * Пользователи и команды руководителей.
 *
 * Руководитель видит в `/api/users/` свою команду и свободных КАМов,
 * администратор — всех. Команду руководитель ведёт сам (`claim`/`release`),
 * администратор — через `PUT head/`.
 */

import { apiEndpoints } from "@/lib/api/endpoints";
import { getJson, postJson, putJson } from "@/lib/api/http";
import type { SystemRole } from "@/providers/auth-provider";
import type { PaginatedResponse } from "@/types/api";
import type { AccountChangeResult, SovaUser } from "@/types/user";

export const teamPageSize = 20;

export type UserListParams = {
  head?: number;
  /** Поле сортировки бэка, `-` — по убыванию: `last_name`, `-email`. */
  ordering?: string;
  page?: number;
  pageSize?: number;
  role?: SystemRole[];
  search?: string;
  team?: "free" | "mine";
};

export const usersRootKey = ["users"] as const;

export function usersQueryKey(scope: string, params: object = {}) {
  return ["users", scope, params] as const;
}

/**
 * `buildQuery` не умеет повторяющиеся параметры, а `role` бэк ждёт именно
 * так: `?role=kam&role=head`.
 */
function userListQuery(params: UserListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? teamPageSize));
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.team) query.set("team", params.team);
  if (params.head !== undefined) query.set("head", String(params.head));
  if (params.ordering) query.set("ordering", params.ordering);
  for (const role of params.role ?? []) query.append("role", role);
  return query.toString();
}

export function listUsers(params: UserListParams = {}) {
  return getJson<PaginatedResponse<SovaUser>>(
    `${apiEndpoints.users.list}?${userListQuery(params)}`,
  );
}

export function claimKam(id: number, csrfToken: string) {
  return postJson<SovaUser>(apiEndpoints.users.claim(id), {}, csrfToken);
}

export function releaseKam(id: number, csrfToken: string) {
  return postJson<SovaUser>(apiEndpoints.users.release(id), {}, csrfToken);
}

export function setKamHead(
  id: number,
  headId: number | null,
  csrfToken: string,
) {
  return putJson<AccountChangeResult>(
    apiEndpoints.users.head(id),
    { head: headId },
    csrfToken,
  );
}
