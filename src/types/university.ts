export type University = {
  id: string;
  name: string;
  inn: string | null;
  external_code: string | null;
  has_interactions: boolean;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lat: string | null;
  lon: string | null;
  city: string;
  /** Место в рейтинге по числу зачисленных людей; `null` — места нет. */
  rank?: number | null;
};

/** Поля, которые принимает бэкенд при создании и изменении вуза. */
export type WriteUniversity = Pick<
  University,
  "name" | "inn" | "external_code" | "email" | "phone" | "is_active"
>;

export type UniversityMapPoint = Pick<
  University,
  "id" | "lat" | "lon" | "has_interactions"
>;

/** Отбор по наличию взаимодействий. `all` параметр не отправляет. */
export type InteractionsFilter = "all" | "with" | "without";
