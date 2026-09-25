import type { SystemRole } from "@/providers/auth-provider";

/** Краткое представление пользователя (`UserShortSerializer`). */
export type SovaUserShort = {
  id: number;
  email: string;
  /** ФИО, а при его отсутствии — логин. Всегда непустая строка. */
  full_name: string;
};

/**
 * Пользователь из `GET /api/users/`.
 *
 * `id` — число, в отличие от UUID справочников каталога: назначение
 * ответственного принимает именно его.
 */
export type SovaUser = SovaUserShort & {
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: SystemRole | null;
  role_display: string | null;
  /** Руководитель КАМа; `null` — КАМ свободен или пользователь не КАМ. */
  head: SovaUserShort | null;
};

/** Ответ админских экшенов над пользователем (`PUT head/` и др.). */
export type AccountChangeResult = {
  user: SovaUser;
  /** КАМы, потерявшие руководителя; для `PUT head/` всегда пуст. */
  orphaned_kams: SovaUserShort[];
};
