import type { UserShort } from "./workflow-board";

/**
 * Вложение действия — по схемам `ActionAttachment`, `WriteActionAttachment`
 * из `docs/SOVA API.yaml`.
 *
 * Вложения действий — журнал: загрузка (multipart) и просмотр. Записи не
 * редактируются и не удаляются.
 */

/** `ActionAttachment` — представление для чтения (list/retrieve). */
export type ActionAttachment = {
  id: string;
  action_instance: string;
  file: string;
  uploaded_at: string;
  /** Пользователь, загрузивший файл; null, если он удалён. */
  uploaded_by: UserShort | null;
};

/**
 * `WriteActionAttachment` — валидация входных данных (загрузка файла).
 *
 * Формат проверяется по расширению (без учёта регистра, по последнему
 * расширению имени файла): содержимое файла не анализируется.
 */
export type WriteActionAttachment = {
  id?: string;
  action_instance: string;
  /** Допустимые форматы: png, jpg, jpeg, pdf, zip, gz, gzip, rar, doc, docx, xls, xlsx. */
  file: string;
};
