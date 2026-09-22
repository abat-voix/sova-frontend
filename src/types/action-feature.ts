import type { UserShort } from "@/types/workflow-board";

/** Только renderer, поддержанные интерфейсом. Остальные backend-коды игнорируются. */
export type ActionFeatureCode = "contact_person.create";

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

export type ExecuteActionFeatureResult = {
  execution: Omit<ActionFeatureExecution, "target">;
  target: ActionFeatureTarget;
};
