import { apiEndpoints } from "@/lib/api/endpoints";
import {
  buildQuery,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  TrainingStream,
  TrainingStreamStatus,
  WriteTrainingStream,
} from "@/types/training";

export const trainingStreamsPageSize = 20;

export type TrainingStreamsQuery = {
  interactionIds?: string;
  ordering: string | null;
  page: number;
  pageSize?: number;
  search: string;
  status: TrainingStreamStatus | null;
};

export function trainingStreamsQueryKey(params?: TrainingStreamsQuery) {
  return params
    ? (["training", "streams", "list", params] as const)
    : (["training", "streams"] as const);
}

export function trainingStreamQueryKey(id: string) {
  return ["training", "streams", "detail", id] as const;
}

export function getTrainingStreams({
  interactionIds,
  ordering,
  page,
  pageSize = trainingStreamsPageSize,
  search,
  status,
}: TrainingStreamsQuery) {
  const query = buildQuery({
    interaction__ids: interactionIds,
    ordering: ordering ?? undefined,
    page,
    page_size: pageSize,
    search: search.trim(),
    status: status ?? undefined,
  });

  return getJson<PaginatedResponse<TrainingStream>>(
    `${apiEndpoints.training.streams.list}?${query}`,
  );
}

export function getTrainingStream(id: string) {
  return getJson<TrainingStream>(apiEndpoints.training.streams.detail(id));
}

export function updateTrainingStream(
  id: string,
  payload: WriteTrainingStream,
  csrfToken: string,
) {
  return patchJson<TrainingStream>(
    apiEndpoints.training.streams.detail(id),
    payload,
    csrfToken,
  );
}

export function assignStreamInstructor(
  id: string,
  instructor: string,
  csrfToken: string,
) {
  return postJson<TrainingStream>(
    apiEndpoints.training.streams.assignInstructor(id),
    { instructor },
    csrfToken,
  );
}

export function unassignStreamInstructor(
  id: string,
  instructor: string,
  csrfToken: string,
) {
  return deleteJson(
    apiEndpoints.training.streams.unassignInstructor(id, instructor),
    csrfToken,
  );
}

/** Варианты для выбора потока: название, программа и контрагент подсказкой. */
export async function searchTrainingStreams(search: string) {
  const page = await getTrainingStreams({
    ordering: "-created_at",
    page: 1,
    search,
    status: null,
  });
  return page.results.map((stream) => ({
    id: stream.id,
    name: stream.name,
    hint: [stream.program.name, stream.counterparty_name]
      .filter(Boolean)
      .join(" · "),
  }));
}

/** Страница потока в разделе «Обучение». */
export function trainingStreamHref(id: string) {
  return `/training/streams/${id}`;
}
