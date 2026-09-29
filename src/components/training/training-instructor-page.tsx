"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Pencil, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  ConfirmDeleteButton,
  DetailRows,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { groupByDirection } from "@/components/catalog/direction-programs-field";
import { BackLink } from "@/components/training/back-link";
import {
  academicDegreeLabels,
  academicTitleLabels,
  qualificationDocumentLabels,
  qualificationKindLabels,
} from "@/components/training/training-labels";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { StatusChip } from "@/components/ui/status-chip";
import { type LookupOption, searchPrograms } from "@/lib/api/catalog/lookups";
import {
  createInstructorQualification,
  deleteInstructor,
  deleteInstructorQualification,
  getInstructor,
  getInstructorQualifications,
  instructorQualificationsQueryKey,
  instructorsQueryKey,
} from "@/lib/api/training/instructors";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  QualificationDocumentType,
  QualificationKind,
} from "@/types/training";

const text = {
  back: "Все преподаватели",
  loading: "Загружаем преподавателя…",
  error: "Не удалось загрузить преподавателя.",
  active: "Активен",
  inactive: "Неактивен",
  deleted: "Преподаватель удалён.",
  organization: "Организация",
  department: "Подразделение",
  position: "Должность",
  contacts: "Контакты",
  email: "Email",
  phone: "Телефон",
  telegram: "Telegram",
  qualification: "Квалификация",
  degree: "Учёная степень",
  titleLabel: "Учёное звание",
  experience: "Стаж преподавания, лет",
  education: "Образование",
  competences: "Компетенции",
  directions: "Направления",
  noPrograms: "Программы не выбраны",
  competencePlaceholder: "Выберите программу",
  service: "Служебное",
  lms: "ID в LMS",
  comment: "Комментарий",
  qualifications: "Подготовка",
  noQualifications: "Записей о подготовке нет.",
  addQualification: "Добавить запись",
  kind: "Вид",
  program: "Программа",
  completedAt: "Завершено",
  documentType: "Документ",
  documentNumber: "Номер документа",
  validUntil: "Действует до",
  qualificationAdded: "Запись о подготовке добавлена.",
  qualificationDeleted: "Запись о подготовке удалена.",
  remove: "Удалить запись",
} as const;

function InfoSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section aria-label={title} className="bg-card rounded-xl border p-4">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Qualifications({
  canEdit,
  csrfToken,
  instructorId,
}: {
  canEdit: boolean;
  csrfToken: string;
  instructorId: string;
}) {
  const { locale } = useLocale();
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [kind, setKind] = useState<QualificationKind>("initial");
  const [program, setProgram] = useState<LookupOption | null>(null);
  const [completedAt, setCompletedAt] = useState("");
  const [documentType, setDocumentType] =
    useState<QualificationDocumentType>("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const queryKey = instructorQualificationsQueryKey(instructorId);
  const query = useQuery({
    queryKey,
    queryFn: () => getInstructorQualifications(instructorId),
  });
  const onError = (error: unknown) =>
    toast.error(apiErrorMessage(error, common.unknownError));
  const createMutation = useMutation({
    mutationFn: () =>
      createInstructorQualification(
        {
          completed_at: completedAt,
          document_number: documentNumber.trim(),
          document_type: documentType,
          instructor: instructorId,
          kind,
          program: (program as LookupOption).id,
          valid_until: validUntil || null,
        },
        csrfToken,
      ),
    onSuccess: () => {
      toast.success(text.qualificationAdded);
      setIsAdding(false);
      setProgram(null);
      setCompletedAt("");
      setDocumentNumber("");
      setValidUntil("");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInstructorQualification(id, csrfToken),
    onSuccess: () => {
      toast.success(text.qualificationDeleted);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError,
  });
  const items = query.data?.results ?? [];

  return (
    <section aria-label={text.qualifications} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{text.qualifications}</h2>
        {canEdit && !isAdding ? (
          <Button
            colorScheme="neutral"
            onClick={() => setIsAdding(true)}
            size="s"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" />
            {text.addQualification}
          </Button>
        ) : null}
      </div>
      {items.length === 0 && !query.isPending ? (
        <p className="text-muted-foreground text-sm">{text.noQualifications}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              className="bg-secondary flex items-start justify-between gap-2 rounded-lg p-3 text-sm"
              key={item.id}
            >
              <div>
                <p className="font-medium">
                  {qualificationKindLabels[item.kind]}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(item.completed_at, locale)}
                  {item.document_type
                    ? ` · ${qualificationDocumentLabels[item.document_type]}`
                    : ""}
                  {item.document_number ? ` № ${item.document_number}` : ""}
                  {item.valid_until
                    ? ` · ${text.validUntil} ${formatDate(item.valid_until, locale)}`
                    : ""}
                </p>
              </div>
              {canEdit ? (
                <Button
                  aria-label={text.remove}
                  colorScheme="neutral"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(item.id)}
                  size="s"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {isAdding ? (
        <div className="bg-secondary space-y-3 rounded-lg p-3">
          <Field htmlFor="qualification-kind" label={text.kind} required>
            <select
              className={fieldInputClass}
              id="qualification-kind"
              onChange={(event) =>
                setKind(event.target.value as QualificationKind)
              }
              value={kind}
            >
              {Object.entries(qualificationKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <EntitySelect
            id="qualification-program"
            label={text.program}
            onChange={setProgram}
            placeholder={text.competencePlaceholder}
            queryKey={["training", "qualification-program"]}
            search={(term) => searchPrograms(term, "")}
            value={program}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              htmlFor="qualification-completed"
              label={text.completedAt}
              required
            >
              <input
                className={fieldInputClass}
                id="qualification-completed"
                onChange={(event) => setCompletedAt(event.target.value)}
                type="date"
                value={completedAt}
              />
            </Field>
            <Field htmlFor="qualification-valid" label={text.validUntil}>
              <input
                className={fieldInputClass}
                id="qualification-valid"
                onChange={(event) => setValidUntil(event.target.value)}
                type="date"
                value={validUntil}
              />
            </Field>
            <Field htmlFor="qualification-document" label={text.documentType}>
              <select
                className={fieldInputClass}
                id="qualification-document"
                onChange={(event) =>
                  setDocumentType(
                    event.target.value as QualificationDocumentType,
                  )
                }
                value={documentType}
              >
                <option value="">—</option>
                {Object.entries(qualificationDocumentLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field htmlFor="qualification-number" label={text.documentNumber}>
              <input
                className={fieldInputClass}
                id="qualification-number"
                onChange={(event) => setDocumentNumber(event.target.value)}
                value={documentNumber}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!program || !completedAt || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              size="s"
              type="button"
            >
              {common.save}
            </Button>
            <Button
              colorScheme="neutral"
              onClick={() => setIsAdding(false)}
              size="s"
              type="button"
              variant="outline"
            >
              {common.cancel}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Страница преподавателя: анкета по группам и история подготовки. */
export function TrainingInstructorPage({
  instructorId,
}: {
  instructorId: string;
}) {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const canUpdate = user !== null && can(user, "catalog.update");
  const canDelete = user !== null && can(user, "catalog.delete");
  const common = registryCopy[locale];
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["training", "instructors", "detail", instructorId],
    queryFn: () => getInstructor(instructorId),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteInstructor(instructorId, csrfToken),
    onSuccess: () => {
      toast.success(text.deleted);
      void queryClient.invalidateQueries({ queryKey: instructorsQueryKey() });
      router.push("/training/instructors");
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });
  const instructor = query.data;

  if (!instructor)
    return (
      <div className="space-y-4">
        <BackLink href="/training/instructors" label={text.back} />
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          {query.isError ? (
            text.error
          ) : (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              {text.loading}
            </>
          )}
        </p>
      </div>
    );
  const competences = groupByDirection(
    instructor.directions,
    instructor.programs,
  );

  return (
    <div className="space-y-5">
      <BackLink href="/training/instructors" label={text.back} />

      <header className="bg-card flex flex-wrap items-start justify-between gap-3 rounded-xl border p-5">
        <div>
          <h1 className="text-2xl font-medium">{instructor.full_name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {[
              instructor.position,
              instructor.organization?.name ?? instructor.b2c_client?.full_name,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <span className="mt-2 inline-flex">
            <StatusChip tone={instructor.is_active ? "positive" : "neutral"}>
              {instructor.is_active ? text.active : text.inactive}
            </StatusChip>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate ? (
            <Button asChild colorScheme="neutral" size="m" variant="outline">
              <Link href={`/training/instructors/${instructor.id}/edit`}>
                <Pencil aria-hidden="true" className="size-4" />
                {common.edit}
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <ConfirmDeleteButton
              isPending={deleteMutation.isPending}
              locale={locale}
              onConfirm={() => deleteMutation.mutate()}
            />
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <InfoSection title={text.organization}>
          <DetailRows
            noValue={common.noValue}
            rows={[
              [
                text.organization,
                instructor.organization?.name ??
                  instructor.b2c_client?.full_name,
              ],
              [text.department, instructor.department],
              [text.position, instructor.position],
            ]}
          />
        </InfoSection>
        <InfoSection title={text.contacts}>
          <DetailRows
            noValue={common.noValue}
            rows={[
              [text.email, instructor.email],
              [text.phone, instructor.phone],
              [text.telegram, instructor.telegram],
            ]}
          />
        </InfoSection>
        <InfoSection title={text.qualification}>
          <DetailRows
            noValue={common.noValue}
            rows={[
              [text.degree, academicDegreeLabels[instructor.academic_degree]],
              [text.titleLabel, academicTitleLabels[instructor.academic_title]],
              [
                text.experience,
                instructor.teaching_experience_years?.toString(),
              ],
              [text.education, instructor.education],
            ]}
          />
        </InfoSection>
        <InfoSection title={text.competences}>
          <DetailRows
            noValue={common.noValue}
            // Программа — внутри своего направления: тёзки из разных направлений различимы
            rows={
              competences.length > 0
                ? competences.map(({ direction, programs }) => [
                    direction.name,
                    programs.map((item) => item.name).join(", ") ||
                      text.noPrograms,
                  ])
                : [[text.directions, null]]
            }
          />
        </InfoSection>
        <InfoSection title={text.service}>
          <DetailRows
            noValue={common.noValue}
            rows={[
              [text.lms, instructor.lms_external_id],
              [text.comment, instructor.comment],
            ]}
          />
        </InfoSection>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <Qualifications
          canEdit={canUpdate}
          csrfToken={csrfToken}
          instructorId={instructor.id}
        />
      </div>
    </div>
  );
}
