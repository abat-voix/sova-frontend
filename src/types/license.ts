import type { ContractShort } from "./contract";
import type { InteractionProductShort, UserShort } from "./workflow-board";

/**
 * Лицензия на продукт взаимодействия — по схемам `License`, `WriteLicense`,
 * `PatchedWriteLicense` из `docs/SOVA API.yaml`.
 *
 * Лицензия привязывается к паре (договор, продукт взаимодействия). Создание
 * новой лицензии для пары, у которой уже есть действующая, перезаключает её:
 * прежняя закрывается (`superseded_at`) и остаётся в истории.
 *
 * `is_active`, `superseded_at` и автор управляются `LicenseService` и в
 * write-схемах не принимаются.
 */

/** `License` — представление для чтения (list/retrieve). */
export type License = {
  id: string;
  created_at: string;
  /** Дата подписания лицензии (ГГГГ-ММ-ДД). */
  signed_at: string | null;
  /** Момент, когда лицензия была заменена новой; null — действующая. */
  superseded_at: string | null;
  valid_until_year: number | null;
  is_signed: boolean;
  is_active: boolean;
  contract: ContractShort;
  interaction_product: InteractionProductShort;
  /** Пользователь, оформивший лицензию; null, если он удалён. */
  created_by: UserShort | null;
};

/**
 * `WriteLicense` — валидация входных данных (create/update).
 *
 * `is_active`, `superseded_at` и автор не принимаются: ими управляет
 * `LicenseService` при перезаключении. `id` в схеме `readOnly` + `required`.
 */
export type WriteLicense = {
  id?: string;
  signed_at?: string | null;
  valid_until_year?: number | null;
  is_signed?: boolean;
  contract: string;
  interaction_product: string;
};

/** `PatchedWriteLicense` — тело PATCH-запроса. */
export type PatchedWriteLicense = Partial<WriteLicense>;
