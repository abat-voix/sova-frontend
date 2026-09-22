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

/**
 * Коды ошибок отката действия → текст.
 *
 * Отдельно от словаря завершения намеренно: код `invalid_state` бэкенд
 * возвращает на обе операции, но значит он разное — «не в работе» при
 * завершении и «не последнее выполненное исполнение» при откате. Один словарь
 * сделал бы текст неверным для одной из них.
 */
const rollbackMessages = {
  ru: {
    has_completed_dependent:
      "От этого действия зависит уже выполненное действие — сначала откатите его.",
    invalid_state:
      "Откатить можно только последнее выполненное исполнение, пока его этап в работе.",
    unknown: "Не удалось откатить действие.",
  },
  en: {
    has_completed_dependent:
      "A dependent action is already complete — roll that one back first.",
    invalid_state:
      "Only the last completed execution can be rolled back, and only while its stage is in progress.",
    unknown: "The action could not be rolled back.",
  },
} as const;

export function resolveRollbackErrorMessage(error: unknown, locale: Locale) {
  const dictionary = rollbackMessages[locale];
  if (!(error instanceof ApiError)) return dictionary.unknown;

  const code = error.code as keyof typeof dictionary | null;
  if (code && code in dictionary) return dictionary[code];

  return error.detail ?? dictionary.unknown;
}
