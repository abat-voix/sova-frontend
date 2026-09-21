/**
 * Вендор продукта — по схемам `Vendor`, `VendorShort`, `WriteVendor`
 * из `docs/SOVA API.yaml`.
 *
 * Вендор опционален у продукта: `Product.vendor` может быть `null`,
 * а `ProductShort` в ответах взаимодействий вендора не содержит вовсе.
 */

/** `Vendor` — представление для чтения (list/retrieve). */
export type Vendor = {
  id: string;
  name: string;
  external_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * `VendorShort` — краткое представление для вложенного использования.
 *
 * Используется там, где вендор показывается развёрнуто внутри другого
 * объекта (например, в `Product`).
 */
export type VendorShort = {
  id: string;
  name: string;
};

/**
 * `WriteVendor` — валидация входных данных (create/update).
 *
 * `id` в схеме помечен `readOnly`, но остаётся в `required` — на практике
 * при создании его передавать не нужно, поэтому здесь он опционален.
 */
export type WriteVendor = {
  id?: string;
  name: string;
  external_code?: string | null;
  is_active?: boolean;
};

/**
 * `PatchedWriteVendor` — тело PATCH-запроса.
 *
 * Все поля опциональны: частичное обновление.
 */
export type PatchedWriteVendor = Partial<WriteVendor>;
