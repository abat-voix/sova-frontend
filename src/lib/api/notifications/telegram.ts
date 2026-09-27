import { apiEndpoints } from "@/lib/api/endpoints";
import { deleteJson, getJson } from "@/lib/api/http";
import type { TelegramLinkStatus } from "@/types/notification";

export function telegramLinkQueryKey() {
  return ["notifications", "telegram-link"] as const;
}

export function getTelegramLinkStatus() {
  return getJson<TelegramLinkStatus>(apiEndpoints.notifications.telegram.link);
}

export function disconnectTelegram(csrfToken: string) {
  return deleteJson(apiEndpoints.notifications.telegram.link, csrfToken);
}
