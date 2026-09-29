import type { B2CClientOpenAddress } from "@/types/address";
import { VendorShort } from "@/types/vendor";

/** B2C-клиент — физическое лицо; компании и вузы — организации. */
export type B2CClient = {
  id: string;
  full_name: string;
  inn: string | null;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Место в рейтинге по числу зачисленных людей; `null` — места нет. */
  rank?: number | null;
  /** Открытая часть адреса регистрации; улица и дом — только администратору. */
  address: B2CClientOpenAddress | null;
};

/** Поля, которые принимает бэкенд при создании и изменении B2C-клиента. */
export type WriteB2CClient = Pick<
  B2CClient,
  "full_name" | "inn" | "email" | "phone" | "is_active"
> & { address?: B2CClientOpenAddress | null };

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
  /** Место в рейтинге по числу зачисленных людей; `null` — места нет. */
  rank?: number | null;
};

export type Program = {
  id: string;
  name: string;
  is_active: boolean;
  /** Направление каталога; у программы оно ровно одно. */
  direction: DirectionShort;
  created_at: string;
  updated_at: string;
  /** Место в рейтинге по числу зачисленных людей; `null` — места нет. */
  rank?: number | null;
  products_count: number;
};

/** Программа с направлением: одинаковые названия бывают в разных направлениях. */
export type ProgramWithDirection = ProgramShort & { direction: DirectionShort };

export type Product = {
  id: string;
  name: string;
  external_code: string | null;
  is_active: boolean;
  vendor: VendorShort | null;
  programs: ProgramWithDirection[];
  created_at: string;
  updated_at: string;
  /** Место в рейтинге по числу взаимодействий с продуктом; `null` — места нет. */
  rank?: number | null;
};
