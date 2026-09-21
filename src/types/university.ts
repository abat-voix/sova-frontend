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
};

export type UniversityMapPoint = Pick<
  University,
  "id" | "lat" | "lon" | "has_interactions"
>;

/** Отбор по наличию взаимодействий. `all` параметр не отправляет. */
export type InteractionsFilter = "all" | "with" | "without";
