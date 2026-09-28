"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

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
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import {
  type LookupOption,
  searchB2CClients,
  searchDirections,
  searchPrograms,
  searchUniversities,
} from "@/lib/api/catalog/lookups";
import {
  createInstructor,
  getInstructor,
  instructorsQueryKey,
  trainingInstructorHref,
  updateInstructor,
} from "@/lib/api/training/instructors";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  AcademicDegree,
  AcademicTitle,
  TrainingInstructor,
} from "@/types/training";

type OrganizationKind = "university" | "b2c";

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
  organization: "Организация",
  organizationHint:
    "На поток назначаются только преподаватели организации-контрагента взаимодействия.",
  university: "Вуз",
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
    "Какие направления и программы каталога преподаватель может вести.",
  directions: "Направления",
  directionsPlaceholder: "Выберите направления",
  programs: "Программы",
  programsPlaceholder: "Выберите программы",
  programsFiltered: "Показаны программы выбранных направлений.",
  noneSelected: "Ничего не выбрано.",
  removeSelected: "Убрать",
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
function CatalogMultiField({
  hint,
  id,
  label,
  onChange,
  placeholder,
  queryKey,
  search,
  value,
}: {
  hint?: string;
  id: string;
  label: string;
  onChange: (value: LookupOption[]) => void;
  placeholder: string;
  queryKey: readonly unknown[];
  search: (term: string) => Promise<LookupOption[]>;
  value: LookupOption[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs" id={`${id}-label`}>
        {label}
      </p>
      <MultiEntitySelect
        id={id}
        label={label}
        onChange={onChange}
        placeholder={placeholder}
        queryKey={queryKey}
        search={search}
        value={value}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {value.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.noneSelected}</p>
      ) : (
        <ul aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
          {value.map((item) => (
            <li
              className="bg-secondary inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm"
              key={item.id}
            >
              {item.name}
              <button
                aria-label={`${text.removeSelected}: ${item.name}`}
                className="hover:bg-muted rounded-full p-1"
                onClick={() =>
                  onChange(value.filter((option) => option.id !== item.id))
                }
                type="button"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  const [kind, setKind] = useState<OrganizationKind>(
    instructor?.b2c_client ? "b2c" : "university",
  );
  const [organization, setOrganization] = useState<LookupOption | null>(
    instructor?.university
      ? { id: instructor.university.id, name: instructor.university.name }
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
  const [directions, setDirections] = useState<LookupOption[]>(
    instructor?.directions ?? [],
  );
  const [programs, setPrograms] = useState<LookupOption[]>(
    instructor?.programs ?? [],
  );
  const [lms, setLms] = useState(instructor?.lms_external_id ?? "");
  const [isActive, setIsActive] = useState(instructor?.is_active ?? true);
  const [comment, setComment] = useState(instructor?.comment ?? "");
  const directionIds = directions.map((item) => item.id).join(",");

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        academic_degree: degree,
        academic_title: title,
        b2c_client: kind === "b2c" ? (organization?.id ?? null) : null,
        comment,
        department: department.trim(),
        directions: directions.map((item) => item.id),
        education,
        email: email.trim(),
        first_name: firstName.trim(),
        is_active: isActive,
        last_name: lastName.trim(),
        lms_external_id: lms.trim(),
        middle_name: middleName.trim(),
        phone: phone.trim(),
        position: position.trim(),
        programs: programs.map((item) => item.id),
        teaching_experience_years: experience ? Number(experience) : null,
        telegram: telegram.trim(),
        university: kind === "university" ? (organization?.id ?? null) : null,
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
    options: { required?: boolean; type?: string } = {},
  ) => (
    <Field htmlFor={id} label={label} required={options.required}>
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

      <FormSection hint={text.organizationHint} title={text.organization}>
        <div className="flex gap-4 text-sm" role="radiogroup">
          {(["university", "b2c"] as const).map((value) => (
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
              {value === "university" ? text.university : text.b2c}
            </label>
          ))}
        </div>
        <div className="sm:max-w-md">
          <EntitySelect
            id="instructor-organization"
            label={kind === "university" ? text.university : text.b2c}
            onChange={setOrganization}
            placeholder={text.organizationPlaceholder}
            queryKey={["training", "instructor-organization", kind]}
            search={
              kind === "university" ? searchUniversities : searchB2CClients
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
          {input("instructor-phone", text.phone, phone, setPhone)}
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
        <div className="grid gap-5 lg:grid-cols-2">
          <CatalogMultiField
            id="instructor-directions"
            label={text.directions}
            onChange={setDirections}
            placeholder={text.directionsPlaceholder}
            queryKey={["training", "instructor-directions"]}
            search={searchDirections}
            value={directions}
          />
          <CatalogMultiField
            hint={directions.length > 0 ? text.programsFiltered : undefined}
            id="instructor-programs"
            label={text.programs}
            onChange={setPrograms}
            placeholder={text.programsPlaceholder}
            // Программы фильтруются по выбранным направлениям — ключ кэша вместе с ними
            queryKey={["training", "instructor-programs", directionIds]}
            search={(term) => searchPrograms(term, directionIds)}
            value={programs}
          />
        </div>
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
