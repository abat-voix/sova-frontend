import type { Locale } from "@/i18n/translations";
import { ApiError } from "@/lib/api/http";

/**
 * Коды ошибок завершения действия → текст.
 *
 * Правила исхода проверяет бэкенд, интерфейс только сопоставляет код с
 * сообщением. Словарь общий: форм завершения две — кнопка исхода на карточке
 * задачи и панель действия на доске процесса.
 */
const messages = {
  ru: {
    attachment_required: "Не приложен обязательный файл.",
    comment_required: "Нужен комментарий к выбранному исходу.",
    invalid_state: "Действие не в работе — обновите страницу.",
    outcome_inactive: "Исход больше не активен.",
    outcome_mismatch: "Исход не относится к этому действию.",
    unknown: "Не удалось выполнить операцию.",
  },
  en: {
    attachment_required: "A required file is missing.",
    comment_required: "The selected outcome needs a comment.",
    invalid_state: "The action is not in progress — refresh the page.",
    outcome_inactive: "This outcome is no longer active.",
    outcome_mismatch: "The outcome does not belong to this action.",
    unknown: "The operation failed.",
  },
} as const;

export function resolveActionErrorMessage(error: unknown, locale: Locale) {
  const dictionary = messages[locale];
  if (!(error instanceof ApiError)) return dictionary.unknown;

  const code = error.code as keyof typeof dictionary | null;
  if (code && code in dictionary) return dictionary[code];

  return error.detail ?? dictionary.unknown;
}
