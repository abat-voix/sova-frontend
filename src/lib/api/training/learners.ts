import type { LookupOption } from "@/lib/api/catalog/lookups";
import { apiEndpoints } from "@/lib/api/endpoints";
import {
  ApiError,
  buildQuery,
  getJson,
  patchJson,
  postFormData,
  postJson,
} from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  Learner,
  LearnerDetail,
  LearnerImportResult,
  LearnerPayload,
  LearnerPersonalData,
  LearnerPersonalDataPayload,
} from "@/types/training";

export const learnersPageSize = 20;

export type LearnersQuery = {
  ordering: string | null;
  page: number;
  search: string;
  streamIds?: string;
};

export function learnersQueryKey(params?: LearnersQuery) {
  return params
    ? (["training", "learners", "list", params] as const)
    : (["training", "learners"] as const);
}

export function getLearners({
  ordering,
  page,
  search,
  streamIds,
}: LearnersQuery) {
  const query = buildQuery({
    ordering: ordering ?? undefined,
    page,
    page_size: learnersPageSize,
    search: search.trim(),
    stream__ids: streamIds,
  });

  return getJson<PaginatedResponse<Learner>>(
    `${apiEndpoints.training.learners.list}?${query}`,
  );
}

export function getLearner(id: string) {
  return getJson<LearnerDetail>(apiEndpoints.training.learners.detail(id));
}

/** Полные персональные данные: КАМу, руководителю и админу; выдача пишется в журнал. */
export function getLearnerPersonalData(id: string) {
  return getJson<LearnerPersonalData>(
    apiEndpoints.training.learners.personalData(id),
  );
}

/** Варианты для выбора обучающегося: ФИО и маска email подсказкой. */
export async function searchLearners(search: string): Promise<LookupOption[]> {
  const query = buildQuery({ page: 1, page_size: 20, search: search.trim() });
  const page = await getJson<PaginatedResponse<Learner>>(
    `${apiEndpoints.training.learners.list}?${query}`,
  );
  return page.results.map((learner) => ({
    id: learner.id,
    name: learner.full_name,
    hint: [learner.email, learner.phone].filter(Boolean).join(" · "),
  }));
}

/** Загрузка файла «Пользователи»: с потоком — сразу заявка на него. */
export function uploadLearners(
  file: File,
  streamId: string | null,
  csrfToken: string,
) {
  const body = new FormData();
  body.set("file", file);
  if (streamId) body.set("stream", streamId);
  return postFormData<LearnerImportResult>(
    apiEndpoints.training.learners.import,
    body,
    csrfToken,
  );
}

/** Страница обучающегося в разделе «Обучение». */
export function learnerHref(id: string) {
  return `/training/learners/${id}`;
}

/** Новый обучающийся; тот же email или телефон у другого — 409 `learner_exists`. */
export function createLearner(payload: LearnerPayload, csrfToken: string) {
  return postJson<Learner>(
    apiEndpoints.training.learners.list,
    payload,
    csrfToken,
  );
}

export function updateLearner(
  id: string,
  payload: Partial<LearnerPayload>,
  csrfToken: string,
) {
  return patchJson<Learner>(
    apiEndpoints.training.learners.detail(id),
    payload,
    csrfToken,
  );
}

/** Правка ПД: изменённые поля пишутся в журнал доступа. */
export function updateLearnerPersonalData(
  id: string,
  payload: LearnerPersonalDataPayload,
  csrfToken: string,
) {
  return patchJson<LearnerPersonalData>(
    apiEndpoints.training.learners.personalData(id),
    payload,
    csrfToken,
  );
}

/** Id найденного обучающегося из 409 `learner_exists`, иначе `null`. */
export function existingLearnerId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== "learner_exists")
    return null;
  const learner = (error.body as { learner?: unknown } | null)?.learner;
  return typeof learner === "string" ? learner : null;
}
