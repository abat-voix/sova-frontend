import type { UserShort } from "./workflow-board";

/**
 * Вложение действия — по схемам `ActionAttachment`, `WriteActionAttachment`
 * из `docs/SOVA API.yaml`.
 *
 * Вложения действий — журнал: загрузка (multipart) и просмотр. Записи не
 * редактируются и не удаляются.
 */

/**
 * `ActionAttachment` — представление для чтения (list/retrieve).
 *
 * Файл в хранилище лежит под случайным ключом — нет ни прямого URL, ни
 * `file`; `download_url` — единственный способ получить файл. Эндпоинт сам
 * проверяет права и либо стримит файл, либо отдаёт `302` на подписанную
 * ссылку (см. `sova-backend/docs/plans/2026-09-23-s3-storage.md`).
 */
export type ActionAttachment = {
  id: string;
  action_instance: string;
  /** Имя, под которым файл загрузил пользователь (не ключ в хранилище). */
  original_name: string;
  size: number | null;
  content_type: string;
  /** Относительный путь `/api/...`; открывать обычной ссылкой, не `fetch`. */
  download_url: string;
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
