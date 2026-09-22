import type { UserShort } from "@/types/workflow-board";

/** Только renderer, поддержанные интерфейсом. Остальные backend-коды игнорируются. */
export type ActionFeatureCode =
  "contact_person.create" | "contact_person.select";

/** Коды из плана, которые подключаются интерфейсом отдельными волнами. */
export type PlannedActionFeatureCode =
  | ActionFeatureCode
  | "contact_person.update"
  | "contact_person.deactivate"
  | "responsible.assign"
  | "responsible.unassign"
  | "interaction_direction.add"
  | "interaction_direction.remove"
  | "interaction_program.add"
  | "interaction_program.remove"
  | "interaction_product.add"
  | "interaction_product.remove"
  | "contract.create"
  | "contract.update"
  | "contract.sign"
  | "contract.file.upload"
  | "contract.mark_sent"
  | "contract.mark_corrected"
  | "license.create"
  | "license.update"
  | "communication.create"
  | "meeting.create"
  | "installation.create"
  | "training.create"
  | "program_update.create"
  | "result_check.create"
  | "checklist.fill"
  | "email.send"
  | "link.attach"
  | "reminder.create";

export type AvailableActionFeature = {
  code: string;
  settings: Record<string, unknown>;
};

export type ActionFeatureTarget = {
  type: string;
  id: string;
  data: Record<string, unknown>;
};

export type ActionFeatureExecution = {
  id: string;
  feature_code: string;
  performed_at: string;
  performed_by: UserShort | null;
  target: ActionFeatureTarget;
};

export type CreateContactPersonFeaturePayload = {
  full_name: string;
  position: string;
  email: string;
  phone: string;
};

export type SelectContactPersonFeaturePayload = {
  contact_person: string;
};

export type ActionFeaturePayloadMap = {
  "contact_person.create": CreateContactPersonFeaturePayload;
  "contact_person.select": SelectContactPersonFeaturePayload;
};

export type ExecuteActionFeatureResult = {
  execution: Omit<ActionFeatureExecution, "target">;
  target: ActionFeatureTarget;
};
