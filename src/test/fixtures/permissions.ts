import type { PolicyAction } from "@/lib/permissions";

/** Операции КАМа во взаимодействиях — как в `accounts.policy.ROLE_ACTIONS`. */
export const kamPermissions: PolicyAction[] = [
  "interactions.read",
  "interactions.create",
  "interactions.update",
  "interactions.delete",
  "interactions.responsibles.assign",
  "interactions.chat",
];

/** Наблюдатель только читает взаимодействия. */
export const observerPermissions: PolicyAction[] = ["interactions.read"];
