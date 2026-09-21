/** Тип B2C-клиента: физлицо или юрлицо. */
export type B2CClientKind = "individual" | "legal_entity";

export type B2CClient = {
  id: string;
  full_name: string;
  inn: string | null;
  email: string;
  phone: string;
  kind: B2CClientKind;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DirectionShort = {
  id: string;
  name: string;
};

export type ProgramShort = {
  id: string;
  name: string;
};

export type Direction = {
  id: string;
  name: string;
  external_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Program = {
  id: string;
  name: string;
  is_active: boolean;
  /** Направление каталога; у программы оно ровно одно. */
  direction: DirectionShort;
  created_at: string;
  updated_at: string;
  products_count: number;
};

export type Product = {
  id: string;
  name: string;
  external_code: string | null;
  is_active: boolean;
  vendor: { id: string; name: string } | null;
  programs: ProgramShort[];
  created_at: string;
  updated_at: string;
};
