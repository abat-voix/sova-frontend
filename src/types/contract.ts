// contract.ts

import type { InteractionShort } from "./workflow-board";

/**
 * Договор — по схемам `Contract`, `ContractShort`, `WriteContract`,
 * `PatchedWriteContract` из `docs/SOVA API.yaml`.
 *
 * Даты (`sent_at`, `corrected_at`, `signed_at`) — только дата без времени
 * (`format: date`, ГГГГ-ММ-ДД), в отличие от `created_at` / `updated_at`,
 * которые приходят как `date-time`. Файл договора передаётся как multipart.
 */

/** `Contract` — представление для чтения (list/retrieve). */
export type Contract = {
  id: string;
  file: string | null;
  contract_number: string;
  /** Отправлен на подписание (ГГГГ-ММ-ДД). */
  sent_at: string | null;
  /** Скорректирован перед подписанием (ГГГГ-ММ-ДД). */
  corrected_at: string | null;
  /** Подписан (ГГГГ-ММ-ДД). */
  signed_at: string | null;
  interaction: InteractionShort;
  created_at: string;
  updated_at: string;
};

/**
 * `ContractShort` — краткое представление для вложенного использования.
 *
 * В схеме `required` только `id`, но `contract_number` присутствует
 * в `properties` и используется в UI, поэтому оставляем его обязательным.
 */
export type ContractShort = {
  id: string;
  contract_number: string;
};

/**
 * `WriteContract` — валидация входных данных (create/update).
 *
 * `id` в схеме `readOnly` + `required` — как и у вендоров, при создании
 * передавать не нужно. `file` принимается как multipart.
 */
export type WriteContract = {
  id?: string;
  file?: string | null;
  contract_number: string;
  sent_at?: string | null;
  corrected_at?: string | null;
  signed_at?: string | null;
  interaction: string;
};

/** `PatchedWriteContract` — тело PATCH-запроса. */
export type PatchedWriteContract = Partial<WriteContract>;
