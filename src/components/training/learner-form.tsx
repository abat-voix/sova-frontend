"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { isValidPhone, phoneHint, sanitizePhone } from "@/lib/inn-phone";
import { existingLearnerId, learnerHref } from "@/lib/api/training/learners";
import { useLocale } from "@/providers/locale-provider";
import type { LearnerPayload } from "@/types/training";

const headingId = "learner-form-title";

const copy = {
  ru: {
    lastName: "Фамилия",
    firstName: "Имя",
    middleName: "Отчество",
    email: "Email",
    phone: "Телефон",
    contactsHint: "Нужен email или телефон.",
    active: "Активен",
    openExisting: "Открыть найденного",
    requiredHint: "* — обязательные поля",
  },
  en: {
    lastName: "Last name",
    firstName: "First name",
    middleName: "Middle name",
    email: "Email",
    phone: "Phone",
    contactsHint: "An email or a phone is required.",
    active: "Active",
    openExisting: "Open the existing learner",
    requiredHint: "* — required fields",
  },
} as const;

const emptyLearner: LearnerPayload = {
  email: "",
  first_name: "",
  is_active: true,
  last_name: "",
  middle_name: "",
  phone: "",
};

/**
 * Карточка обучающегося: создание (`initial` не задан) и правка. Контакты —
 * полные: при правке их берут из `personal-data/`, и это пишется в журнал.
 * Дубль по контактам (409 `learner_exists`) показывается ссылкой на
 * найденного или действием `renderExisting` (например, «Добавить найденного»).
 */
export function LearnerFormDialog({
  initial,
  note,
  onClose,
  onSaved,
  onSubmit,
  renderExisting,
  title,
}: {
  initial: LearnerPayload | null;
  /** Пояснение под заголовком — например, что открытие формы записано в журнал. */
  note?: string;
  onClose: () => void;
  onSaved: (result: unknown) => void;
  onSubmit: (payload: LearnerPayload) => Promise<unknown>;
  renderExisting?: (learnerId: string) => ReactNode;
  title: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [values, setValues] = useState<LearnerPayload>(initial ?? emptyLearner);
  const mutation = useMutation({
    mutationFn: () =>
      onSubmit({
        ...values,
        email: values.email.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        middle_name: values.middle_name.trim(),
        phone: values.phone.trim(),
      }),
    onSuccess: onSaved,
  });
  const existingId = existingLearnerId(mutation.error);
  const hasContact = values.email.trim() !== "" || values.phone.trim() !== "";
  const canSubmit =
    values.last_name.trim() !== "" &&
    values.first_name.trim() !== "" &&
    hasContact &&
    isValidPhone(values.phone) &&
    !mutation.isPending;

  const input = (
    name: "last_name" | "first_name" | "middle_name" | "email",
    label: string,
    required = false,
  ) => (
    <Field htmlFor={`learner-${name}`} label={label} required={required}>
      <input
        className={fieldInputClass}
        id={`learner-${name}`}
        maxLength={255}
        onChange={(event) =>
          setValues({ ...values, [name]: event.target.value })
        }
        type={name === "email" ? "email" : "text"}
        value={values[name]}
      />
    </Field>
  );

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
            {title}
          </h2>
          {note ? (
            <p className="text-muted-foreground mt-1 text-sm">{note}</p>
          ) : null}
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {input("last_name", text.lastName, true)}
            {input("first_name", text.firstName, true)}
            {input("middle_name", text.middleName)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("email", text.email)}
            <Field
              hint={phoneHint(values.phone, locale)}
              htmlFor="learner-phone"
              label={text.phone}
            >
              <input
                className={fieldInputClass}
                id="learner-phone"
                onChange={(event) =>
                  setValues({
                    ...values,
                    phone: sanitizePhone(event.target.value),
                  })
                }
                type="tel"
                value={values.phone}
              />
            </Field>
          </div>
          <p className="text-muted-foreground text-xs">{text.contactsHint}</p>
          {initial ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={values.is_active}
                onChange={(event) =>
                  setValues({ ...values, is_active: event.target.checked })
                }
                type="checkbox"
              />
              {text.active}
            </label>
          ) : null}
          <p className="text-muted-foreground text-xs">{text.requiredHint}</p>
        </div>
        <div className="space-y-3 border-t px-5 py-4">
          {mutation.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--atmr-brand-orange)]">
                {apiErrorMessage(mutation.error, common.unknownError)}
              </p>
              {existingId ? (
                renderExisting ? (
                  renderExisting(existingId)
                ) : (
                  <Link
                    className="text-sm underline underline-offset-2"
                    href={learnerHref(existingId)}
                  >
                    {text.openExisting}
                  </Link>
                )
              ) : null}
            </div>
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
            <Button disabled={!canSubmit} size="m" type="submit">
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
