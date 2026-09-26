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
  | "interactions.chat";

type PermissionSubject = Pick<
  AuthenticatedUser,
  "isSuperuser" | "permissions" | "role"
>;

/** Разрешена ли пользователю операция (без учёта конкретной записи). */
export function can(user: PermissionSubject, action: PolicyAction): boolean {
  return user.permissions.includes(action);
}

/**
 * Доступны ли пользователю разделы, ещё не переведённые на политику
 * (договоры, процессы, уведомления, переписка…).
 *
 * Повторяет правило бэкенда `PolicyPermission`: такие разделы открыты любому
 * вошедшему, кроме наблюдателя. Когда раздел переедет на политику, проверку
 * нужно заменить на `can` с его кодом операции.
 */
export function canUseUnmigratedSection(user: PermissionSubject): boolean {
  return user.isSuperuser || user.role !== "observer";
}

/** Бэкенд отказал в доступе (403): роль не позволяет эту операцию. */
export function isAccessDenied(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
