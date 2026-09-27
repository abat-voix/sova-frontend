import type { ExternalFieldOption } from "@/types/integration";

function valueType(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value === "object" ? "object" : typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Элемент примера для подсказок и preview: объект — как есть, массив в корне (пачка записей, как
 * «Данные оплат.json») — первый непустой объект; иначе null.
 */
export function samplePayloadItem(
  payload: unknown,
): Record<string, unknown> | null {
  if (Array.isArray(payload)) return payload.find(isObject) ?? null;
  return isObject(payload) ? payload : null;
}

/**
 * Пример payload из внешних путей правил (`$.a.b`, `$.items[].id`): у существующего mapping подсказки
 * и выпадающие списки совпадают с его правилами. Значение листа — имя ключа.
 */
export function sampleFromPaths(paths: string[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const path of paths) {
    if (!path.startsWith("$.")) continue;
    const segments = path.slice(2).split(".");
    let current: Record<string, unknown> = root;
    segments.forEach((segment, index) => {
      const isArray = segment.endsWith("[]");
      const key = isArray ? segment.slice(0, -2) : segment;
      const isLast = index === segments.length - 1;
      if (isArray) {
        const items = Array.isArray(current[key])
          ? (current[key] as unknown[])
          : (current[key] = []);
        if (isLast) return;
        if (!isObject(items[0])) items[0] = {};
        current = items[0] as Record<string, unknown>;
        return;
      }
      if (isLast) {
        if (!(key in current)) current[key] = key;
        return;
      }
      if (!isObject(current[key])) current[key] = {};
      current = current[key] as Record<string, unknown>;
    });
  }
  return root;
}

export function flattenJsonPaths(payload: unknown): ExternalFieldOption[] {
  payload = samplePayloadItem(payload);
  if (!payload) return [];
  const result: ExternalFieldOption[] = [];

  function visit(value: unknown, path: string) {
    if (Array.isArray(value)) {
      const arrayPath = `${path}[]`;
      result.push({ path: arrayPath, valueType: "array" });
      if (value.length > 0 && value[0] && typeof value[0] === "object") {
        visit(value[0], arrayPath);
      }
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        visit(child, `${path}.${key}`);
      }
      return;
    }
    result.push({ path, valueType: valueType(value) });
  }

  visit(payload, "$");
  return result;
}
