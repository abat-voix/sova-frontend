/**
 * Роли пользователей: справочник и смена роли администратором платформы.
 *
 * Список пользователей — `listUsers` из `team.ts`.
 */

import { apiEndpoints } from "@/lib/api/endpoints";
import { getJson, putJson } from "@/lib/api/http";
import type { SystemRole } from "@/providers/auth-provider";
import type { AccountChangeResult, RoleChoice } from "@/types/user";

export function getSystemRoles() {
  return getJson<RoleChoice[]>(apiEndpoints.users.roles);
}

/**
 * Назначает, меняет или снимает (`null`) роль. Смена роли руководителя
 * распускает его команду — её КАМы приходят в `orphaned_kams`.
 */
export function setUserRole(
  userId: number,
  role: SystemRole | null,
  csrfToken: string,
) {
  return putJson<AccountChangeResult>(
    apiEndpoints.users.role(userId),
    { role },
    csrfToken,
  );
}
