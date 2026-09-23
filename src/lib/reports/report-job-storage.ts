const storageKey = "sova-report-export-jobs";

export function loadTrackedJobIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function saveTrackedJobIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Хранилище недоступно (приватный режим, квота) — список заданий не
    // переживёт перезагрузку, но текущая сессия продолжит работать.
  }
}

export function addTrackedJobId(id: string): string[] {
  const ids = loadTrackedJobIds();
  if (ids.includes(id)) return ids;
  const next = [id, ...ids];
  saveTrackedJobIds(next);
  return next;
}

export function removeTrackedJobId(id: string): string[] {
  const next = loadTrackedJobIds().filter((existing) => existing !== id);
  saveTrackedJobIds(next);
  return next;
}
