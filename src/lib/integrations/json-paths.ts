import type { ExternalFieldOption } from "@/types/integration";

function valueType(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value === "object" ? "object" : typeof value;
}

export function flattenJsonPaths(payload: unknown): ExternalFieldOption[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return [];
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
