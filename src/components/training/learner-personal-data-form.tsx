"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { updateLearnerPersonalData } from "@/lib/api/training/learners";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  LearnerPersonalData,
  LearnerPersonalDataPayload,
} from "@/types/training";

const headingId = "learner-personal-data-form-title";

type EditableField = keyof LearnerPersonalDataPayload;

/** Подписи полей персональных данных — как колонки файла «Пользователи». */
export const personalDataLabels: [keyof LearnerPersonalData, string][] = [
  ["email", "Email"],
  ["phone", "Телефон"],
  ["gender", "Пол"],
  ["birth_date", "Дата рождения"],
  ["last_name_dative", "Фамилия (дательный падеж)"],
  ["first_name_dative", "Имя (дательный падеж)"],
  ["middle_name_dative", "Отчество (дательный падеж)"],
  ["snils", "СНИЛС"],
  ["passport_series", "Серия паспорта"],
  ["passport_number", "Номер паспорта"],
  ["passport_issued_by", "Кем выдан паспорт"],
  ["passport_issued_at", "Дата выдачи паспорта"],
  ["passport_division_code", "Код подразделения"],
  ["registration_region", "Регион регистрации"],
  ["registration_locality", "Населённый пункт регистрации"],
  ["registration_street", "Улица регистрации"],
  ["registration_house", "Дом регистрации"],
  ["registration_apartment", "Квартира регистрации"],
  ["registration_postcode", "Индекс регистрации"],
  ["education_level", "Образование"],
  ["diploma_qualification", "Профессия по диплому"],
  ["diploma_institution", "Учебное заведение по диплому"],
  ["diploma_last_name", "Фамилия, указанная в дипломе"],
  ["diploma_series", "Серия диплома"],
  ["diploma_number", "Номер диплома"],
  ["diploma_registration_number", "Регистрационный номер диплома"],
  ["diploma_issued_at", "Дата выдачи диплома"],
];

const labelOf = Object.fromEntries(personalDataLabels) as Record<
  keyof LearnerPersonalData,
  string
>;

/** Разделы формы: контакты правятся в карточке, здесь — остальные ПД. */
const sections: { title: string; fields: EditableField[] }[] = [
  {
    title: "Основное",
    fields: [
      "gender",
      "birth_date",
      "last_name_dative",
      "first_name_dative",
      "middle_name_dative",
    ],
  },
  {
    title: "Документы",
    fields: [
      "snils",
      "passport_series",
      "passport_number",
      "passport_issued_by",
      "passport_issued_at",
      "passport_division_code",
    ],
  },
  {
    title: "Адрес регистрации",
    fields: [
      "registration_region",
      "registration_locality",
      "registration_street",
      "registration_house",
      "registration_apartment",
      "registration_postcode",
    ],
  },
  {
    title: "Образование",
    fields: [
      "education_level",
      "diploma_qualification",
      "diploma_institution",
      "diploma_last_name",
      "diploma_series",
      "diploma_number",
      "diploma_registration_number",
      "diploma_issued_at",
    ],
  },
];

const dateFields = new Set<EditableField>([
  "birth_date",
  "passport_issued_at",
  "diploma_issued_at",
]);

/** Значения и подписи — как `sova.training.enum`. */
const choices: Partial<Record<EditableField, [string, string][]>> = {
  gender: [
    ["", "—"],
    ["male", "Мужской"],
    ["female", "Женский"],
  ],
  education_level: [
    ["", "—"],
    ["none", "Без образования"],
    ["basic_general", "Основное общее образование - 9 классов"],
    ["secondary_general", "Среднее общее образование - 11 классов"],
    ["secondary_vocational", "Среднее профессиональное образование"],
    ["bachelor", "Высшее образование – бакалавриат"],
    ["specialist_master", "Высшее образование – специалитет, магистратура"],
    [
      "higher_qualification",
      "Высшее образование – подготовка кадров высшей квалификации",
    ],
  ],
};

const copy = {
  ru: {
    title: "Изменить персональные данные",
    note: "Изменённые поля записываются в журнал доступа к персональным данным.",
    saved: "Персональные данные сохранены.",
  },
  en: {
    title: "Edit personal data",
    note: "Changed fields are recorded in the personal data access log.",
    saved: "Personal data saved.",
  },
} as const;

function toFormValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

/** Правка ПД по разделам; на бэкенд уходят только изменённые поля. */
export function LearnerPersonalDataForm({
  data,
  learnerId,
  onClose,
}: {
  data: LearnerPersonalData;
  learnerId: string;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const initial = Object.fromEntries(
    sections
      .flatMap((section) => section.fields)
      .map((field) => [field, toFormValue(data[field])]),
  ) as Record<EditableField, string>;
  const [values, setValues] = useState(initial);
  const changed = (Object.keys(values) as EditableField[]).filter(
    (field) => values[field] !== initial[field],
  );

  const mutation = useMutation({
    mutationFn: () =>
      updateLearnerPersonalData(
        learnerId,
        Object.fromEntries(
          changed.map((field) => [
            field,
            // Пустая дата — `null`: у бэкенда это «не указана»
            dateFields.has(field) && values[field] === ""
              ? null
              : values[field].trim(),
          ]),
        ),
        csrfToken,
      ),
    onSuccess: () => {
      toast.success(text.saved);
      void queryClient.invalidateQueries({
        queryKey: ["training", "learners", "personal-data", learnerId],
      });
      onClose();
    },
  });

  const control = (field: EditableField) => {
    const id = `personal-data-${field}`;
    const options = choices[field];
    const onChange = (value: string) =>
      setValues((previous) => ({ ...previous, [field]: value }));

    return (
      <Field htmlFor={id} key={field} label={labelOf[field]}>
        {options ? (
          <select
            className={fieldInputClass}
            id={id}
            onChange={(event) => onChange(event.target.value)}
            value={values[field]}
          >
            {options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={fieldInputClass}
            id={id}
            onChange={(event) => onChange(event.target.value)}
            type={dateFields.has(field) ? "date" : "text"}
            value={values[field]}
          />
        )}
      </Field>
    );
  };

  return (
    <Modal closeLabel={common.cancel} labelledBy={headingId} onClose={onClose}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id={headingId}>
            {text.title}
          </h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <ShieldAlert aria-hidden="true" className="size-4" />
            {text.note}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {sections.map((section) => (
            <fieldset className="space-y-3" key={section.title}>
              <legend className="text-sm font-medium">{section.title}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map(control)}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="space-y-3 border-t px-5 py-4">
          {mutation.isError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {apiErrorMessage(mutation.error, common.unknownError)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={onClose}
              size="m"
              type="button"
              variant="outline"
            >
              {common.cancel}
            </Button>
            <Button
              disabled={changed.length === 0 || mutation.isPending}
              size="m"
              type="submit"
            >
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
