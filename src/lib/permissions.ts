import { ApiError } from "@/lib/api/http";
import type { AuthenticatedUser } from "@/providers/auth-provider";

/**
 * Коды операций политики доступа бэкенда (`accounts.policy.Action`).
 *
 * Интерфейс по ним только прячет недоступные разделы и кнопки: решение о
 * доступе к данным всегда принимает бэкенд, а его 403 интерфейс показывает
 * как «Доступ ограничен».
 */
export type PolicyAction =
  | "interactions.read"
  | "interactions.create"
  | "interactions.update"
  | "interactions.delete"
  | "interactions.responsibles.assign"
  | "interactions.responsibles.unassign"
  | "interactions.chat"
  | "contracts.read"
  | "contracts.create"
  | "contracts.update"
  | "contracts.delete"
  | "contracts.attach"
  | "licenses.read"
  | "licenses.create"
  | "licenses.update"
  | "licenses.delete"
  | "processes.read"
  | "processes.start"
  | "processes.execute"
  | "processes.attachments.upload"
  | "reports.read"
  | "reports.export"
  | "catalog.read"
  | "catalog.create"
  | "catalog.update"
  | "catalog.delete"
  | "catalog.import"
  | "catalog.mappings.manage"
  | "workflows.manage"
  | "users.read"
  | "users.manage"
  | "teams.manage"
  | "integrations.manage"
  | "notifications.use"
  | "messaging.use"
  | "realtime.connect";

type PermissionSubject = Pick<
  AuthenticatedUser,
  "isSuperuser" | "permissions" | "role"
>;

/** Разрешена ли пользователю операция (без учёта конкретной записи). */
export function can(user: PermissionSubject, action: PolicyAction): boolean {
  return user.permissions.includes(action);
}

/** Бэкенд отказал в доступе (403): роль не позволяет эту операцию. */
export function isAccessDenied(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
