import type { Locale } from "@/i18n/translations";
import type {
  AcademicDegree,
  AcademicTitle,
  QualificationDocumentType,
  QualificationKind,
  TrainingApplicationStatus,
  TrainingStreamStatus,
} from "@/types/training";

type Tone = "accent" | "neutral" | "positive";

/** Подписи и тона статусов потока — одинаковые в списке, карточке и карточке взаимодействия. */
export const streamStatusLabels: Record<
  Locale,
  Record<TrainingStreamStatus, string>
> = {
  ru: {
    draft: "Черновик",
    enrollment_open: "Идёт набор",
    in_progress: "Идёт обучение",
    completed: "Завершён",
    cancelled: "Отменён",
  },
  en: {
    draft: "Draft",
    enrollment_open: "Enrollment open",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  },
};

export const streamStatusTone: Record<TrainingStreamStatus, Tone> = {
  draft: "neutral",
  enrollment_open: "accent",
  in_progress: "accent",
  completed: "positive",
  cancelled: "neutral",
};

export const applicationStatusLabels: Record<
  Locale,
  Record<TrainingApplicationStatus, string>
> = {
  ru: { new: "Действует", cancelled: "Отменена" },
  en: { new: "Active", cancelled: "Cancelled" },
};

export const academicDegreeLabels: Record<AcademicDegree, string> = {
  none: "Нет",
  candidate: "Кандидат наук",
  doctor: "Доктор наук",
};

export const academicTitleLabels: Record<AcademicTitle, string> = {
  none: "Нет",
  docent: "Доцент",
  professor: "Профессор",
};

export const qualificationKindLabels: Record<QualificationKind, string> = {
  initial: "Обучение преподавателей",
  advanced: "Повышение квалификации",
};

export const qualificationDocumentLabels: Record<
  Exclude<QualificationDocumentType, "">,
  string
> = {
  certificate: "Сертификат",
  diploma: "Удостоверение",
  other: "Другое",
};
