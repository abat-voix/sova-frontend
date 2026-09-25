export type IntegrationDirection = "incoming" | "outgoing";

export type IntegrationFieldMetadata = {
  name: string;
  label: string;
  help_text: string;
  type:
    | "string"
    | "integer"
    | "number"
    | "boolean"
    | "uuid"
    | "date"
    | "datetime"
    | "json"
    | "object"
    | "array"
    | "relation"
    | "choice";
  required: boolean;
  read_only: boolean;
  allow_null: boolean;
  many: boolean;
  choices: Array<{ value: string | number | boolean; label: string }>;
};

export type IntegrationEntityMetadata = {
  code: string;
  label: string;
  serializer: string;
  fields: IntegrationFieldMetadata[];
};

export type IntegrationSystem = { code: string; label: string };

export type IntegrationMappingRule = {
  sourcePath: string;
  targetField: string;
  required: boolean;
  defaultValue: unknown | null;
};

export type IntegrationMapping = {
  id: string;
  name: string;
  system: string;
  eventType: string;
  direction: IntegrationDirection;
  entity: string;
  isActive: boolean;
  version: number;
  rules: IntegrationMappingRule[];
  createdAt: string;
  updatedAt: string;
};

export type CreateIntegrationMappingDto = Omit<
  IntegrationMapping,
  "id" | "version" | "createdAt" | "updatedAt"
>;

export type UpdateIntegrationMappingDto = Partial<CreateIntegrationMappingDto>;

export type IntegrationMappingPreviewDto = Pick<
  CreateIntegrationMappingDto,
  "entity" | "direction" | "rules"
> & { payload: unknown };

export type IntegrationMappingPreview = {
  result: unknown;
  errors: string[];
  warnings: string[];
};

export type ExternalFieldOption = { path: string; valueType: string };
