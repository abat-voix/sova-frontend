/** Ключ сравнения колонок — как `text_key` на бэке: без регистра и лишних пробелов. */
export function columnKey(value: string): string {
  return value.replace(/\s+/gu, " ").trim().toLowerCase();
}
