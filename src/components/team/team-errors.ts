import { ApiError } from "@/lib/api/http";

const messages = {
  ru: {
    kamHasHead: "Этого КАМа уже забрал другой руководитель. Список обновлён.",
    notInTeam: "КАМ уже не в вашей команде. Список обновлён.",
    invalidSupervision: "Руководителя назначают только активному КАМу.",
    fallback: "Не удалось изменить команду. Попробуйте ещё раз.",
  },
  en: {
    kamHasHead:
      "Another head has already taken this KAM. The list is refreshed.",
    notInTeam: "The KAM is no longer in your team. The list is refreshed.",
    invalidSupervision: "A head can only be set for an active KAM.",
    fallback: "The team could not be changed. Please try again.",
  },
} as const;

/**
 * Текст ошибки изменения команды. 404 значит то же, что `kam_has_head`:
 * список устарел — КАМ уже не виден руководителю.
 */
export function teamErrorMessage(error: unknown, locale: "ru" | "en") {
  const text = messages[locale];
  if (!(error instanceof ApiError)) return text.fallback;
  if (error.code === "kam_has_head" || error.status === 404)
    return text.kamHasHead;
  if (error.code === "not_in_team") return text.notInTeam;
  if (error.code === "invalid_supervision") return text.invalidSupervision;
  return text.fallback;
}
