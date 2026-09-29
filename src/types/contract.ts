import type {
  B2CClientShort,
  InteractionShort,
  OrganizationShort,
} from "./workflow-board";

/**
 * Договор — по схемам `Contract`, `ContractShort`, `WriteContract`,
 * `PatchedWriteContract` из `docs/SOVA API.yaml`.
 *
 * Даты (`sent_at`, `corrected_at`, `signed_at`) — только дата без времени
 * (`format: date`, ГГГГ-ММ-ДД), в отличие от `created_at` / `updated_at`,
 * которые приходят как `date-time`. Файл договора передаётся как multipart.
 *
 * Файл в хранилище лежит под случайным ключом; при повторной загрузке ссылка
 * в `download_url` меняется, но прежние файлы не пропадают — история всех
 * загруженных файлов договора доступна через `/api/interactions/contract-files/?contract=<id>`
 * (тип `ContractFile`, см. `src/types/contract-file.ts`).
 */

/** `Contract` — представление для чтения (list/retrieve). */
export type Contract = {
  id: string;
  /** Имя текущего файла, под которым его загрузил пользователь; пусто, если файла нет. */
  file_name: string;
  /** Ссылка на скачивание текущего файла; null, если файл не загружен. */
  download_url: string | null;
  /** Число загруженных файлов, включая прежние версии. */
  files_count: number;
  contract_number: string;
  /** Отправлен на подписание (ГГГГ-ММ-ДД). */
  sent_at: string | null;
  /** Скорректирован перед подписанием (ГГГГ-ММ-ДД). */
  corrected_at: string | null;
  /** Подписан (ГГГГ-ММ-ДД). */
  signed_at: string | null;
  /** Взаимодействие; null у договора из реестра, ещё не привязанного к взаимодействию. */
  interaction: InteractionShort | null;
  /** Контрагент договора (есть и без взаимодействия); null у договора с B2C-клиентом. */
  organization: OrganizationShort | null;
  /** Контрагент договора (есть и без взаимодействия); null у договора с организацией. */
  b2c_client: B2CClientShort | null;
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
