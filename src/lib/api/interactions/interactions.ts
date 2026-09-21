import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { Interaction } from "@/types/workflow-board";

export const interactionsPageSize = 20;

export function getInteractions(page: number, search = "") {
  const query = buildQuery({
    page,
    page_size: interactionsPageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<Interaction>>(
    `${apiEndpoints.interactions.interactions.list}?${query}`,
  );
}
