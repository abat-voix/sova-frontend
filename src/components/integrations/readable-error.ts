import { ApiError } from "@/lib/api/http";

/** Текст ошибки API для тоста или блока ошибок редактора mapping. */
export function readableError(error: unknown) {
  if (error instanceof ApiError) {
    const fields = Object.values(error.fieldErrors).flat().join(" ");
    return fields || error.detail || "Операция отклонена сервером.";
  }
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить операцию.";
}
