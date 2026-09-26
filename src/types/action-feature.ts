import type { UserShort } from "@/types/workflow-board";

/** Только renderer, поддержанные интерфейсом. Остальные backend-коды игнорируются. */
export type ActionFeatureCode =
  | "contact_person.create"
  | "contact_person.select"
  | "contact_person.link"
  | "contract.create";

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

/**
 * Состав взаимодействия в договоре. Бэкенд принимает выбранные элементы по `id`
 * и перезаполняет остальные поля из своих данных.
 */
export type ContractDirection = { id: string; name: string };

export type ContractProgram = { id: string; name: string; direction: string };

export type ContractProduct = {
  id: string;
  name: string;
  /** Программа взаимодействия; пусто — продукт вне программы. */
  program: string;
};

export type ContractLicense = {
  id: string;
  product: string;
  contract_number: string;
  signed_at: string | null;
  valid_until_year: number | null;
  is_signed: boolean;
};

export type ContractScopeKey =
  "directions" | "programs" | "products" | "licenses";

/** Данные договора — контекст рендера шаблона docxtpl на бэкенде. */
export type ContractDocument = {
  contract_number: string;
  /** YYYY-MM-DD; null — дата не указана. */
  contract_date: string | null;
  city: string;
  counterparty: {
    name: string;
    short_name: string;
    inn: string;
    address: string;
    email: string;
    phone: string;
  };
  signatory: {
    full_name: string;
    position: string;
    basis: string;
  };
  directions: ContractDirection[];
  programs: ContractProgram[];
  products: ContractProduct[];
  licenses: ContractLicense[];
  /** Десятичная строка, например "1000.50"; null — сумма не указана. */
  amount: string | null;
  comment: string;
};

export type CreateContractFeaturePayload = {
  template: string;
  document: ContractDocument;
};

export type DocumentTemplateShort = {
  id: string;
  name: string;
};

/** Черновик формы договора: что бэкенд знает о взаимодействии. */
export type CreateContractFeatureInitial = {
  templates: DocumentTemplateShort[];
  contacts: { id: string; full_name: string; position: string }[];
  document: ContractDocument;
};

export type ActionFeaturePayloadMap = {
  "contact_person.create": CreateContactPersonFeaturePayload;
  "contact_person.select": SelectContactPersonFeaturePayload;
  "contact_person.link": SelectContactPersonFeaturePayload;
  "contract.create": CreateContractFeaturePayload;
};

export type ActionFeatureInitialMap = {
  "contract.create": CreateContractFeatureInitial;
};

export type ExecuteActionFeatureResult = {
  execution: Omit<ActionFeatureExecution, "target">;
  target: ActionFeatureTarget;
};
