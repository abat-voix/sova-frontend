import type { UserShort } from "./workflow-board";

/**
 * Файл договора — журнал: по схеме `ContractFile` из `docs/SOVA API.yaml`.
 *
 * Только для чтения (список и скачивание) — `/api/interactions/contract-files/`.
 * Записи создаёт бэкенд при каждой загрузке файла в договор; вручную не
 * редактируются и не удаляются, поэтому история всех версий сохраняется даже
 * после повторной загрузки (`Contract.download_url` ссылается только на
 * текущую).
 */
export type ContractFile = {
  id: string;
  contract: string;
  /** Имя, под которым файл загрузил пользователь. */
  original_name: string;
  size: number | null;
  content_type: string;
  uploaded_at: string;
  /** Пользователь, загрузивший файл; null, если он удалён. */
  uploaded_by: UserShort | null;
  /** True, если это файл, на который сейчас ссылается договор (`Contract.download_url`). */
  is_current: boolean;
};
