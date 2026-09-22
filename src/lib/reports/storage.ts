const STORAGE_KEY = "sova.reports.exportJobIds";

export function loadTrackedJobIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveTrackedJobIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode, quota) — job tracking degrades to in-memory only.
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
