import type { SystemRole } from "@/providers/auth-provider";

/**
 * Пользователь из `GET /api/users/`.
 *
 * `id` — число, в отличие от UUID справочников каталога: назначение
 * ответственного принимает именно его.
 */
export type SovaUser = {
  id: number;
  email: string;
  /** ФИО, а при его отсутствии — логин. Всегда непустая строка. */
  full_name: string;
  first_name: string;
  last_name: string;
  role: SystemRole | null;
  role_display: string | null;
};
