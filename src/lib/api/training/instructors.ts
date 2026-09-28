import type { LookupOption } from "@/lib/api/catalog/lookups";
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
  TrainingInstructor,
  TrainingInstructorQualification,
  WriteTrainingInstructor,
  WriteTrainingInstructorQualification,
} from "@/types/training";

export const instructorsPageSize = 20;

export type InstructorsQuery = {
  isActive: boolean | null;
  ordering: string | null;
  page: number;
  search: string;
};

export function instructorsQueryKey(params?: InstructorsQuery) {
  return params
    ? (["training", "instructors", "list", params] as const)
    : (["training", "instructors"] as const);
}

export function getInstructors({
  isActive,
  ordering,
  page,
  search,
}: InstructorsQuery) {
  const query = buildQuery({
    is_active: isActive === null ? undefined : String(isActive),
    ordering: ordering ?? undefined,
    page,
    page_size: instructorsPageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<TrainingInstructor>>(
    `${apiEndpoints.training.instructors.list}?${query}`,
  );
}

export function getInstructor(id: string) {
  return getJson<TrainingInstructor>(
    apiEndpoints.training.instructors.detail(id),
  );
}

export function createInstructor(
  payload: WriteTrainingInstructor,
  csrfToken: string,
) {
  return postJson<TrainingInstructor>(
    apiEndpoints.training.instructors.list,
    payload,
    csrfToken,
  );
}

export function updateInstructor(
  id: string,
  payload: Partial<WriteTrainingInstructor>,
  csrfToken: string,
) {
  return patchJson<TrainingInstructor>(
    apiEndpoints.training.instructors.detail(id),
    payload,
    csrfToken,
  );
}

export function deleteInstructor(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.training.instructors.detail(id), csrfToken);
}

/**
 * Кого можно назначить на поток: активные преподаватели организации-контрагента,
 * которые ведут программу потока и ещё не назначены. Для завершённого или
 * отменённого потока список пуст.
 */
export async function searchAssignableInstructors(
  streamId: string,
  search: string,
): Promise<LookupOption[]> {
  const query = buildQuery({
    assignable_to_stream: streamId,
    page: 1,
    page_size: 20,
    search: search.trim(),
  });
  const page = await getJson<PaginatedResponse<TrainingInstructor>>(
    `${apiEndpoints.training.instructors.list}?${query}`,
  );
  return page.results.map((instructor) => ({
    id: instructor.id,
    name: instructor.full_name,
    hint: instructor.position,
  }));
}

export function instructorQualificationsQueryKey(instructorId: string) {
  return ["training", "instructor-qualifications", instructorId] as const;
}

export function getInstructorQualifications(instructorId: string) {
  const query = buildQuery({
    instructor__ids: instructorId,
    ordering: "-completed_at",
    page_size: 100,
  });
  return getJson<PaginatedResponse<TrainingInstructorQualification>>(
    `${apiEndpoints.training.instructorQualifications.list}?${query}`,
  );
}

export function createInstructorQualification(
  payload: WriteTrainingInstructorQualification,
  csrfToken: string,
) {
  return postJson<TrainingInstructorQualification>(
    apiEndpoints.training.instructorQualifications.list,
    payload,
    csrfToken,
  );
}

export function deleteInstructorQualification(id: string, csrfToken: string) {
  return deleteJson(
    apiEndpoints.training.instructorQualifications.detail(id),
    csrfToken,
  );
}

/** Страница преподавателя в разделе «Обучение». */
export function trainingInstructorHref(id: string) {
  return `/training/instructors/${id}`;
}
