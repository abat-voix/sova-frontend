/**
 * Обучение — по схемам `/api/training/` бэкенда (`sova.training`).
 *
 * Поток создаётся возможностью `training.create` у действия процесса; заявки,
 * участники и отметка оплаты — в разделе «Обучение». Обучающиеся приходят из
 * файла «Пользователи», их персональные данные в обычных ответах замаскированы.
 */

import type { DirectionShort, ProgramShort } from "@/types/catalog";
import type { B2CClientShort, OrganizationShort } from "@/types/workflow-board";

export type TrainingStreamStatus =
  "draft" | "enrollment_open" | "in_progress" | "completed" | "cancelled";

export type TrainingApplicationStatus = "new" | "cancelled";

export type TrainingInstructorShort = {
  id: string;
  full_name: string;
  position: string;
};

/** `TrainingStream` — поток: номер потока — его `id`. */
export type TrainingStream = {
  id: string;
  name: string;
  interaction_program: string;
  interaction: string;
  interaction_number: string;
  organization: string | null;
  b2c_client: string | null;
  counterparty_name: string;
  program: ProgramShort;
  starts_at: string | null;
  ends_at: string | null;
  status: TrainingStreamStatus;
  instructors: TrainingInstructorShort[];
  applications_count: number | null;
  participants_count: number | null;
  paid_count: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type WriteTrainingStream = {
  name?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: TrainingStreamStatus;
};

/** `Learner` — обучающийся; email и телефон приходят маской. */
export type Learner = {
  id: string;
  full_name: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  email: string;
  phone: string;
  consent_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LearnerParticipation = {
  id: string;
  application: string;
  stream: string;
  stream_name: string;
  is_paid: boolean;
  is_enrolled: boolean;
};

export type LearnerDetail = Learner & {
  participations: LearnerParticipation[];
};

/** Полные персональные данные — только администратору платформы. */
export type LearnerPersonalData = {
  id: string | null;
  learner: string;
  email: string;
  phone: string;
  gender: "" | "male" | "female";
  birth_date: string | null;
  last_name_dative: string;
  first_name_dative: string;
  middle_name_dative: string;
  snils: string;
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issued_at: string | null;
  passport_division_code: string;
  registration_region: string;
  registration_locality: string;
  registration_street: string;
  registration_house: string;
  registration_apartment: string;
  registration_postcode: string;
  education_level: string;
  diploma_qualification: string;
  diploma_institution: string;
  diploma_last_name: string;
  diploma_series: string;
  diploma_number: string;
  diploma_registration_number: string;
  diploma_issued_at: string | null;
};

/** Участник заявки: факт оплаты и вычисленное зачисление. */
export type TrainingApplicationLearner = {
  id: string;
  application: string;
  learner: Learner;
  is_paid: boolean;
  is_enrolled: boolean | null;
  created_at: string;
  updated_at: string;
};

export type WriteTrainingApplicationLearner = {
  application: string;
  learner: string;
  is_paid?: boolean;
};

export type TrainingApplication = {
  id: string;
  stream: string;
  stream_name: string;
  status: TrainingApplicationStatus;
  comment: string;
  participants: TrainingApplicationLearner[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type WriteTrainingApplication = {
  stream: string;
  comment?: string;
};

export type AcademicDegree = "none" | "candidate" | "doctor";
export type AcademicTitle = "none" | "docent" | "professor";

export type TrainingInstructor = {
  id: string;
  full_name: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  email: string;
  phone: string;
  telegram: string;
  organization: OrganizationShort | null;
  b2c_client: B2CClientShort | null;
  department: string;
  position: string;
  academic_degree: AcademicDegree;
  academic_title: AcademicTitle;
  teaching_experience_years: number | null;
  education: string;
  directions: DirectionShort[];
  programs: ProgramShort[];
  lms_external_id: string;
  is_active: boolean;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type WriteTrainingInstructor = {
  last_name: string;
  first_name: string;
  middle_name?: string;
  email?: string;
  phone?: string;
  telegram?: string;
  organization?: string | null;
  b2c_client?: string | null;
  department?: string;
  position?: string;
  academic_degree?: AcademicDegree;
  academic_title?: AcademicTitle;
  teaching_experience_years?: number | null;
  education?: string;
  directions?: string[];
  programs?: string[];
  lms_external_id?: string;
  is_active?: boolean;
  comment?: string;
};

export type QualificationKind = "initial" | "advanced";
export type QualificationDocumentType =
  "" | "certificate" | "diploma" | "other";

export type TrainingInstructorQualification = {
  id: string;
  instructor: string;
  kind: QualificationKind;
  program: string;
  interaction: string | null;
  completed_at: string;
  document_type: QualificationDocumentType;
  document_number: string;
  document_file: string | null;
  valid_until: string | null;
  comment: string;
  created_by: number | null;
  created_at: string;
};

export type WriteTrainingInstructorQualification = {
  instructor: string;
  kind: QualificationKind;
  program: string;
  completed_at: string;
  document_type?: QualificationDocumentType;
  document_number?: string;
  valid_until?: string | null;
  comment?: string;
};

export type LearnerImportResult = {
  created: number;
  updated: number;
  application: string | null;
  warnings: { row: number; message: string }[];
};

/** Черновик формы `training.create`: программы, договор и преподаватели контрагента. */
export type CreateTrainingStreamFeatureInitial = {
  /** `instructors` — кого можно назначить на поток по этой программе. */
  programs: {
    id: string;
    name: string;
    direction: string;
    instructors: TrainingInstructorShort[];
  }[];
  has_signed_contract: boolean;
  stream: { name: string; starts_at: string | null; ends_at: string | null };
};

export type CreateTrainingStreamFeaturePayload = {
  interaction_program?: string;
  name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  instructors?: string[];
};
