"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createUniversity,
  updateUniversity,
} from "@/lib/api/catalog/universities";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { University } from "@/types/university";

const formHeadingId = "university-form-title";

const copy = {
  ru: {
    createTitle: "Новый вуз",
    editTitle: "Изменить вуз",
    name: "Название",
    inn: "ИНН",
    externalCode: "Внешний код",
    email: "Email",
    phone: "Телефон",
    active: "Активен",
    requiredHint: "* — обязательные поля",
  },
  en: {
    createTitle: "New university",
    editTitle: "Edit university",
    name: "Name",
    inn: "Tax ID",
    externalCode: "External code",
    email: "Email",
    phone: "Phone",
    active: "Active",
    requiredHint: "* — required fields",
  },
} as const;

/** Создание (`university` не задан) или правка вуза в модальном окне. */
export function UniversityForm({
  onClose,
  onSaved,
  university,
}: {
  onClose: () => void;
  onSaved: (university: University) => void;
  university: University | null;
}) {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [name, setName] = useState(university?.name ?? "");
  const [inn, setInn] = useState(university?.inn ?? "");
  const [externalCode, setExternalCode] = useState(
    university?.external_code ?? "",
  );
  const [email, setEmail] = useState(university?.email ?? "");
  const [phone, setPhone] = useState(university?.phone ?? "");
  const [isActive, setIsActive] = useState(university?.is_active ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      // Пустые ИНН и код уходят null: они уникальны, пустая строка столкнулась бы
      const payload = {
        email: email.trim(),
        external_code: externalCode.trim() || null,
        inn: inn.trim() || null,
        is_active: isActive,
        name: name.trim(),
        phone: phone.trim(),
      };

      return university
        ? updateUniversity(university.id, payload, csrfToken)
        : createUniversity(payload, csrfToken);
    },
    onSuccess: onSaved,
  });

  const canSubmit = name.trim() !== "" && !mutation.isPending;

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

  return (
    <Modal
      closeLabel={common.cancel}
      labelledBy={formHeadingId}
      onClose={onClose}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id={formHeadingId}>
            {university ? text.editTitle : text.createTitle}
          </h2>
          {university ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {university.name}
            </p>
          ) : null}
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {input("university-name", text.name, name, setName, {
            required: true,
          })}
          <div className="grid gap-4 sm:grid-cols-2">
            {input("university-inn", text.inn, inn, setInn)}
            {input(
              "university-external-code",
              text.externalCode,
              externalCode,
              setExternalCode,
            )}
            {input("university-email", text.email, email, setEmail, {
              type: "email",
            })}
            {input("university-phone", text.phone, phone, setPhone, {
              type: "tel",
            })}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              type="checkbox"
            />
            {text.active}
          </label>
          <p className="text-muted-foreground text-xs">{text.requiredHint}</p>
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
            <Button disabled={!canSubmit} size="m" type="submit">
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
