import type { B2CClientShort, UniversityShort } from "@/types/workflow-board";

/**
 * Контактное лицо — схема `ContactPerson` из `docs/SOVA API.yaml`.
 *
 * Контрагент у контакта ровно один: либо вуз, либо B2C-клиент. В схеме оба
 * поля обязательны, но второе приходит пустым, поэтому храним их как
 * обнуляемые и выбираем при отображении.
 */
export type ContactPerson = {
  id: string;
  full_name: string;
  position?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  university: UniversityShort | null;
  b2c_client: B2CClientShort | null;
  created_at: string;
  updated_at: string;
};

/**
 * Отбор по активности. `all` параметр не отправляет.
 *
 * Отбора по типу контрагента у эндпоинта нет: каталог фильтрует списками
 * `university__ids` и `b2c_client__ids`, то есть по конкретным контрагентам.
 */
export type ContactActivityFilter = "all" | "active" | "inactive";
