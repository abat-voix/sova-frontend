import type { PolicyAction } from "@/lib/permissions";

/** Операции КАМа — как в `accounts.policy.ROLE_ACTIONS`. */
export const kamPermissions: PolicyAction[] = [
  "interactions.read",
  "interactions.create",
  "interactions.update",
  "interactions.delete",
  "interactions.responsibles.assign",
  "interactions.chat",
  "contracts.read",
  "contracts.create",
  "contracts.update",
  "contracts.delete",
  "contracts.attach",
  "licenses.read",
  "licenses.create",
  "licenses.update",
  "licenses.delete",
  "processes.read",
  "processes.start",
  "processes.execute",
  "processes.attachments.upload",
  "reports.read",
  "reports.export",
  "catalog.read",
  "catalog.create",
  "catalog.update",
  "catalog.delete",
  "training.read",
  "training.update",
  "training.personal_data.read",
  "training.personal_data.update",
  "notifications.use",
  "messaging.use",
  "realtime.connect",
];

/** Разделы наблюдателя: чтение и разрешённая выгрузка отчётов. */
export const observerPermissions: PolicyAction[] = [
  "interactions.read",
  "contracts.read",
  "licenses.read",
  "processes.read",
  "reports.read",
  "reports.export",
  "catalog.read",
  "training.read",
];
