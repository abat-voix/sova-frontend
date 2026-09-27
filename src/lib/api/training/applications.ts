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
  TrainingApplication,
  TrainingApplicationLearner,
  WriteTrainingApplication,
  WriteTrainingApplicationLearner,
} from "@/types/training";

export function streamApplicationsQueryKey(streamId?: string) {
  return streamId
    ? (["training", "applications", "stream", streamId] as const)
    : (["training", "applications"] as const);
}

/** Заявки потока вместе с участниками; у потока их немного — одной страницей. */
export function getStreamApplications(streamId: string) {
  const query = buildQuery({
    ordering: "created_at",
    page_size: 100,
    stream__ids: streamId,
  });

  return getJson<PaginatedResponse<TrainingApplication>>(
    `${apiEndpoints.training.applications.list}?${query}`,
  );
}

export function createTrainingApplication(
  payload: WriteTrainingApplication,
  csrfToken: string,
) {
  return postJson<TrainingApplication>(
    apiEndpoints.training.applications.list,
    payload,
    csrfToken,
  );
}

export function cancelTrainingApplication(id: string, csrfToken: string) {
  return postJson<TrainingApplication>(
    apiEndpoints.training.applications.cancel(id),
    {},
    csrfToken,
  );
}

export function deleteTrainingApplication(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.training.applications.detail(id), csrfToken);
}

/** Участник вручную — например, чтобы отметить оплату без загрузки JSON. */
export function addApplicationLearner(
  payload: WriteTrainingApplicationLearner,
  csrfToken: string,
) {
  return postJson<TrainingApplicationLearner>(
    apiEndpoints.training.applicationLearners.list,
    payload,
    csrfToken,
  );
}

export function setApplicationLearnerPaid(
  id: string,
  isPaid: boolean,
  csrfToken: string,
) {
  return patchJson<TrainingApplicationLearner>(
    apiEndpoints.training.applicationLearners.detail(id),
    { is_paid: isPaid },
    csrfToken,
  );
}

export function removeApplicationLearner(id: string, csrfToken: string) {
  return deleteJson(
    apiEndpoints.training.applicationLearners.detail(id),
    csrfToken,
  );
}
