import { apiEndpoints } from "@/lib/api/endpoints";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/api/http";
import type {
  CreateIntegrationMappingDto,
  IntegrationEntityMetadata,
  IntegrationMapping,
  IntegrationMappingPreview,
  IntegrationMappingPreviewDto,
  IntegrationMappingProcessPayload,
  IntegrationMappingProcessResult,
  IntegrationSystem,
  UpdateIntegrationMappingDto,
} from "@/types/integration";

export const integrationMappingsQueryKey = [
  "integrations",
  "mappings",
] as const;

export function getIntegrationEntities() {
  return getJson<IntegrationEntityMetadata[]>(
    apiEndpoints.integrations.entities,
  );
}

export function getIntegrationSystems() {
  return getJson<IntegrationSystem[]>(apiEndpoints.integrations.systems);
}

export function getIntegrationMappings() {
  return getJson<IntegrationMapping[]>(apiEndpoints.integrations.mappings.list);
}

export function getIntegrationMapping(id: string) {
  return getJson<IntegrationMapping>(
    apiEndpoints.integrations.mappings.detail(id),
  );
}

export function createIntegrationMapping(
  payload: CreateIntegrationMappingDto,
  csrfToken: string,
) {
  return postJson<IntegrationMapping>(
    apiEndpoints.integrations.mappings.list,
    payload,
    csrfToken,
  );
}

export function updateIntegrationMapping(
  id: string,
  payload: UpdateIntegrationMappingDto,
  csrfToken: string,
) {
  return patchJson<IntegrationMapping>(
    apiEndpoints.integrations.mappings.detail(id),
    payload,
    csrfToken,
  );
}

export function deleteIntegrationMapping(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.integrations.mappings.detail(id), csrfToken);
}

export function previewIntegrationMapping(
  payload: IntegrationMappingPreviewDto,
  csrfToken: string,
) {
  return postJson<IntegrationMappingPreview>(
    apiEndpoints.integrations.mappings.preview,
    payload,
    csrfToken,
  );
}

export function processIntegrationMapping(
  id: string,
  payload: IntegrationMappingProcessPayload,
  csrfToken: string,
) {
  return postJson<IntegrationMappingProcessResult>(
    apiEndpoints.integrations.mappings.process(id),
    { payload },
    csrfToken,
  );
}
