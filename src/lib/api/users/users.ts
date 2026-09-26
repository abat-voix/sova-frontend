import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson, patchJson } from "@/lib/api/http";
import type { Page, RoleChoice, SystemRole, User } from "@/types/user";

export type UserQuery = {
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
};

export const usersQueryKey = ["users"] as const;

export function getUsers(query: UserQuery = {}) {
  const suffix = buildQuery(query);
  return getJson<Page<User>>(
    `${apiEndpoints.users.list}${suffix ? `?${suffix}` : ""}`,
  );
}

export function getSystemRoles() {
  return getJson<RoleChoice[]>(apiEndpoints.users.roles);
}

export function setUserRole(
  userId: number,
  role: SystemRole | null,
  csrfToken: string,
) {
  return patchJson<User>(apiEndpoints.users.role(userId), { role }, csrfToken);
}
