"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import {
  DirectionProgramsField,
  type DirectionPrograms,
  groupByDirection,
} from "@/components/catalog/direction-programs-field";
import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { BackLink } from "@/components/training/back-link";
import {
  academicDegreeLabels,
  academicTitleLabels,
} from "@/components/training/training-labels";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import {
  type LookupOption,
  searchB2CClients,
  searchOrganizations,
} from "@/lib/api/catalog/lookups";
import {
  createInstructor,
  getInstructor,
  instructorsQueryKey,
  trainingInstructorHref,
  updateInstructor,
} from "@/lib/api/training/instructors";
import { isValidPhone, phoneHint, sanitizePhone } from "@/lib/inn-phone";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  AcademicDegree,
  AcademicTitle,
  TrainingInstructor,
} from "@/types/training";

type EmployerKind = "organization" | "b2c";

const text = {
  back: "Все преподаватели",
  backToInstructor: "К преподавателю",
  createTitle: "Новый преподаватель",
  editTitle: "Изменить преподавателя",
  loading: "Загружаем преподавателя…",
  error: "Не удалось загрузить преподавателя.",
  person: "Преподаватель",
  lastName: "Фамилия",
  firstName: "Имя",
  middleName: "Отчество",
  employer: "Место работы",
  employerHint:
    "На поток назначаются только преподаватели организации-контрагента взаимодействия.",
  organization: "Организация",
  b2c: "B2C-клиент",
  organizationPlaceholder: "Выберите организацию",
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
  competencesHint:
    "Какие программы каталога преподаватель может вести: сначала направление, затем его программы.",
  noProgramsHint: "Для подбора на потоки выберите программы.",
  service: "Служебное",
  lms: "ID в LMS",
  comment: "Комментарий",
  active: "Активен",
  created: "Преподаватель добавлен.",
  saved: "Изменения сохранены.",
} as const;

function FormSection({
  children,
  hint,
  title,
}: {
  children: ReactNode;
  hint?: string;
  title: string;
}) {
  return (
    <section className="bg-card space-y-4 rounded-xl border p-5">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        {hint ? (
          <p className="text-muted-foreground mt-1 text-sm">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Множественный выбор из каталога с видимой подписью и выбранными значениями
 * плашками: сам выпадающий список показывает только их число.
 */
function InstructorForm({
  instructor,
}: {
  instructor: TrainingInstructor | null;
}) {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
  const common = registryCopy[locale];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lastName, setLastName] = useState(instructor?.last_name ?? "");
  const [firstName, setFirstName] = useState(instructor?.first_name ?? "");
  const [middleName, setMiddleName] = useState(instructor?.middle_name ?? "");
  const [kind, setKind] = useState<EmployerKind>(
    instructor?.b2c_client ? "b2c" : "organization",
  );
  const [organization, setOrganization] = useState<LookupOption | null>(
    instructor?.organization
      ? { id: instructor.organization.id, name: instructor.organization.name }
      : instructor?.b2c_client
        ? {
            id: instructor.b2c_client.id,
            name: instructor.b2c_client.full_name,
          }
        : null,
  );
  const [department, setDepartment] = useState(instructor?.department ?? "");
  const [position, setPosition] = useState(instructor?.position ?? "");
  const [email, setEmail] = useState(instructor?.email ?? "");
  const [phone, setPhone] = useState(instructor?.phone ?? "");
  const [telegram, setTelegram] = useState(instructor?.telegram ?? "");
  const [degree, setDegree] = useState<AcademicDegree>(
    instructor?.academic_degree ?? "none",
  );
  const [title, setTitle] = useState<AcademicTitle>(
    instructor?.academic_title ?? "none",
  );
  const [experience, setExperience] = useState(
    instructor?.teaching_experience_years?.toString() ?? "",
  );
  const [education, setEducation] = useState(instructor?.education ?? "");
  const [competences, setCompetences] = useState<DirectionPrograms[]>(() =>
    groupByDirection(instructor?.directions ?? [], instructor?.programs ?? []),
  );
  const [lms, setLms] = useState(instructor?.lms_external_id ?? "");
  const [isActive, setIsActive] = useState(instructor?.is_active ?? true);
  const [comment, setComment] = useState(instructor?.comment ?? "");

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        academic_degree: degree,
        academic_title: title,
        b2c_client: kind === "b2c" ? (organization?.id ?? null) : null,
        comment,
        department: department.trim(),
        directions: competences.map((item) => item.direction.id),
        education,
        email: email.trim(),
        first_name: firstName.trim(),
        is_active: isActive,
        last_name: lastName.trim(),
        lms_external_id: lms.trim(),
        middle_name: middleName.trim(),
        phone: phone.trim(),
        position: position.trim(),
        programs: competences.flatMap((item) =>
          item.programs.map((program) => program.id),
        ),
        teaching_experience_years: experience ? Number(experience) : null,
        telegram: telegram.trim(),
        organization:
          kind === "organization" ? (organization?.id ?? null) : null,
      };
      return instructor
        ? updateInstructor(instructor.id, payload, csrfToken)
        : createInstructor(payload, csrfToken);
    },
    onSuccess: (saved) => {
      toast.success(instructor ? text.saved : text.created);
      queryClient.setQueryData(
        ["training", "instructors", "detail", saved.id],
        saved,
      );
      void queryClient.invalidateQueries({ queryKey: instructorsQueryKey() });
      router.push(trainingInstructorHref(saved.id));
    },
  });

  const input = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { hint?: string; required?: boolean; type?: string } = {},
  ) => (
    <Field
      hint={options.hint}
      htmlFor={id}
      label={label}
      required={options.required}
    >
      <input
        className={fieldInputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={options.required}
        type={options.type ?? "text"}
        value={value}
      />
    </Field>
  );
  const cancelHref = instructor
    ? trainingInstructorHref(instructor.id)
    : "/training/instructors";

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <FormSection title={text.person}>
        <div className="grid gap-4 sm:grid-cols-3">
          {input("instructor-last-name", text.lastName, lastName, setLastName, {
            required: true,
          })}
          {input(
            "instructor-first-name",
            text.firstName,
            firstName,
            setFirstName,
            {
              required: true,
            },
          )}
          {input(
            "instructor-middle-name",
            text.middleName,
            middleName,
            setMiddleName,
          )}
        </div>
      </FormSection>

      <FormSection hint={text.employerHint} title={text.employer}>
        <div className="flex gap-4 text-sm" role="radiogroup">
          {(["organization", "b2c"] as const).map((value) => (
            <label className="flex items-center gap-2" key={value}>
              <input
                checked={kind === value}
                name="instructor-organization-kind"
                onChange={() => {
                  setKind(value);
                  setOrganization(null);
                }}
                type="radio"
              />
              {value === "organization" ? text.organization : text.b2c}
            </label>
          ))}
        </div>
        <div className="sm:max-w-md">
          <EntitySelect
            id="instructor-organization"
            label={kind === "organization" ? text.organization : text.b2c}
            onChange={setOrganization}
            placeholder={text.organizationPlaceholder}
            queryKey={["training", "instructor-organization", kind]}
            search={
              kind === "organization" ? searchOrganizations : searchB2CClients
            }
            value={organization}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {input(
            "instructor-department",
            text.department,
            department,
            setDepartment,
          )}
          {input("instructor-position", text.position, position, setPosition)}
        </div>
      </FormSection>

      <FormSection title={text.contacts}>
        <div className="grid gap-4 sm:grid-cols-3">
          {input("instructor-email", text.email, email, setEmail, {
            type: "email",
          })}
          {input(
            "instructor-phone",
            text.phone,
            phone,
            (value) => setPhone(sanitizePhone(value)),
            { hint: phoneHint(phone, locale), type: "tel" },
          )}
          {input("instructor-telegram", text.telegram, telegram, setTelegram)}
        </div>
      </FormSection>

      <FormSection title={text.qualification}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor="instructor-degree" label={text.degree}>
            <select
              className={fieldInputClass}
              id="instructor-degree"
              onChange={(event) =>
                setDegree(event.target.value as AcademicDegree)
              }
              value={degree}
            >
              {Object.entries(academicDegreeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field htmlFor="instructor-title" label={text.titleLabel}>
            <select
              className={fieldInputClass}
              id="instructor-title"
              onChange={(event) =>
                setTitle(event.target.value as AcademicTitle)
              }
              value={title}
            >
              {Object.entries(academicTitleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {input(
            "instructor-experience",
            text.experience,
            experience,
            setExperience,
            {
              type: "number",
            },
          )}
        </div>
        <Field htmlFor="instructor-education" label={text.education}>
          <textarea
            className={`${fieldInputClass} h-20`}
            id="instructor-education"
            onChange={(event) => setEducation(event.target.value)}
            value={education}
          />
        </Field>
      </FormSection>

      <FormSection hint={text.competencesHint} title={text.competences}>
        <DirectionProgramsField
          idPrefix="instructor"
          noProgramsHint={text.noProgramsHint}
          onChange={setCompetences}
          value={competences}
        />
      </FormSection>

      <FormSection title={text.service}>
        <div className="grid gap-4 sm:grid-cols-2">
          {input("instructor-lms", text.lms, lms, setLms)}
        </div>
        <Field htmlFor="instructor-comment" label={text.comment}>
          <textarea
            className={`${fieldInputClass} h-20`}
            id="instructor-comment"
            onChange={(event) => setComment(event.target.value)}
            value={comment}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            type="checkbox"
          />
          {text.active}
        </label>
      </FormSection>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {mutation.isError ? (
          <p className="mr-auto text-sm text-[var(--atmr-brand-orange)]">
            {apiErrorMessage(mutation.error, common.unknownError)}
          </p>
        ) : null}
        <Button
          colorScheme="neutral"
          onClick={() => router.push(cancelHref)}
          size="m"
          type="button"
          variant="outline"
        >
          {common.cancel}
        </Button>
        <Button
          disabled={
            !lastName.trim() ||
            !firstName.trim() ||
            !organization ||
            !isValidPhone(phone) ||
            mutation.isPending
          }
          size="m"
          type="submit"
        >
          {mutation.isPending ? common.saving : common.save}
        </Button>
      </div>
    </form>
  );
}

/** Страница формы преподавателя: создание (`instructorId` не задан) или правка. */
export function TrainingInstructorFormPage({
  instructorId,
}: {
  instructorId?: string;
}) {
  const query = useQuery({
    queryKey: ["training", "instructors", "detail", instructorId],
    queryFn: () => getInstructor(instructorId as string),
    enabled: instructorId !== undefined,
  });

  return (
    <div className="space-y-5">
      <BackLink
        href={
          instructorId
            ? trainingInstructorHref(instructorId)
            : "/training/instructors"
        }
        label={instructorId ? text.backToInstructor : text.back}
      />
      <h1 className="text-2xl font-medium">
        {instructorId ? text.editTitle : text.createTitle}
      </h1>
      {!instructorId ? (
        <InstructorForm instructor={null} />
      ) : query.data ? (
        <InstructorForm instructor={query.data} />
      ) : (
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
      )}
    </div>
  );
}
