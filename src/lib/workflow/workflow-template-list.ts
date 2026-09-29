import type { WorkflowTemplate } from "@/types/workflow-definition";

export type WorkflowTemplateListResponse =
  WorkflowTemplate[] | { results?: WorkflowTemplate[] };

/** Normalize paginated and non-paginated API responses for the admin list. */
export function normalizeWorkflowTemplateList(
  payload: WorkflowTemplateListResponse,
): WorkflowTemplate[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.results) ? payload.results : [];
}
