import type { UserShort } from "@/types/workflow-board";

/** Только renderer, поддержанные интерфейсом. Остальные backend-коды игнорируются. */
export type ActionFeatureCode =
  | "contact_person.create"
  | "contact_person.select"
  | "contact_person.link"
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
  | "contract.mark_corrected";

/** Коды из плана, которые подключаются интерфейсом отдельными волнами. */
export type PlannedActionFeatureCode =
  | ActionFeatureCode
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

export type UpdateContactPersonFeaturePayload =
  SelectContactPersonFeaturePayload & {
    full_name: string;
    position: string;
    email: string;
    phone: string;
  };

export type ResponsibleFeaturePayload = {
  manager: number;
};

export type ResponsibleFeatureManager = UserShort & {
  email: string;
  from_registry?: boolean;
};

export type ResponsibleFeatureInitial = {
  managers: ResponsibleFeatureManager[];
};

export type InteractionCompositionDirection = {
  id: string;
  catalog_id: string;
  name: string;
  related_programs_count: number;
};

export type InteractionCompositionProgram = {
  id: string;
  catalog_id: string;
  name: string;
  direction: { id: string; name: string };
  related_products_count: number;
};

export type InteractionCompositionProduct = {
  id: string;
  catalog_id: string;
  name: string;
  interaction_program: string | null;
};

export type InteractionCompositionFeatureInitial = {
  directions: InteractionCompositionDirection[];
  programs: InteractionCompositionProgram[];
  products: InteractionCompositionProduct[];
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

export type ContractOperationItem = {
  id: string;
  contract_number: string;
  sent_at: string | null;
  corrected_at: string | null;
  signed_at: string | null;
  file_name: string;
  download_url: string | null;
  files_count: number;
};

export type ContractOperationFeatureInitial = {
  contracts: ContractOperationItem[];
};

export type ActionFeaturePayloadMap = {
  "contact_person.create": CreateContactPersonFeaturePayload;
  "contact_person.select": SelectContactPersonFeaturePayload;
  "contact_person.link": SelectContactPersonFeaturePayload;
  "contact_person.update": UpdateContactPersonFeaturePayload;
  "contact_person.deactivate": SelectContactPersonFeaturePayload;
  "responsible.assign": ResponsibleFeaturePayload;
  "responsible.unassign": ResponsibleFeaturePayload;
  "interaction_direction.add": { direction: string };
  "interaction_direction.remove": { interaction_direction: string };
  "interaction_program.add": { program: string };
  "interaction_program.remove": { interaction_program: string };
  "interaction_product.add": {
    product: string;
    interaction_program: string | null;
  };
  "interaction_product.remove": { interaction_product: string };
  "contract.create": CreateContractFeaturePayload;
  "contract.update": { contract: string; contract_number: string };
  "contract.sign": { contract: string; signed_at: string };
  "contract.file.upload": { contract: string; file: File };
  "contract.mark_sent": { contract: string; sent_at: string };
  "contract.mark_corrected": { contract: string; corrected_at: string };
};

export type ActionFeatureInitialMap = {
  "contract.create": CreateContractFeatureInitial;
  "responsible.assign": ResponsibleFeatureInitial;
  "responsible.unassign": ResponsibleFeatureInitial;
  "interaction_direction.add": InteractionCompositionFeatureInitial;
  "interaction_direction.remove": InteractionCompositionFeatureInitial;
  "interaction_program.add": InteractionCompositionFeatureInitial;
  "interaction_program.remove": InteractionCompositionFeatureInitial;
  "interaction_product.add": InteractionCompositionFeatureInitial;
  "interaction_product.remove": InteractionCompositionFeatureInitial;
  "contract.update": ContractOperationFeatureInitial;
  "contract.sign": ContractOperationFeatureInitial;
  "contract.file.upload": ContractOperationFeatureInitial;
  "contract.mark_sent": ContractOperationFeatureInitial;
  "contract.mark_corrected": ContractOperationFeatureInitial;
};

export type ExecuteActionFeatureResult = {
  execution: Omit<ActionFeatureExecution, "target">;
  target: ActionFeatureTarget;
};
