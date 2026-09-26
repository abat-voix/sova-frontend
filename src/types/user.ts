export type SystemRole = "kam" | "head" | "platform_admin";

export type UserRole = SystemRole | null;

export type User = {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string | null;
};

/** Совместимое имя для существующих lookup-адаптеров. */
export type SovaUser = User;

export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type RoleChoice = {
  value: SystemRole;
  label: string;
};
