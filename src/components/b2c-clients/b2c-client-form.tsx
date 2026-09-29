"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  Field,
  fieldInputClass,
  registryCopy,
  useServerFieldErrors,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createB2CClient,
  updateB2CClient,
} from "@/lib/api/catalog/b2c-clients";
import {
  innError,
  innHint,
  isValidInn,
  isValidPhone,
  phoneError,
  phoneHint,
  sanitizeInn,
  sanitizePhone,
} from "@/lib/inn-phone";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { B2CClient } from "@/types/catalog";

const formHeadingId = "b2c-client-form-title";

// Поля, ошибки бэкенда по которым показываются под самими полями
const shownFields = [
  "full_name",
  "inn",
  "email",
  "phone",
  "address.region",
  "address.city",
];

const copy = {
  ru: {
    createTitle: "Новый B2C-клиент",
    editTitle: "Изменить B2C-клиента",
    fullName: "ФИО",
    region: "Регион",
    city: "Город",
    inn: "ИНН",
    email: "Email",
    phone: "Телефон",
    active: "Активен",
    requiredHint: "* — обязательные поля",
  },
  en: {
    createTitle: "New B2C client",
    editTitle: "Edit B2C client",
    fullName: "Full name",
    region: "Region",
    city: "City",
    inn: "Tax ID",
    email: "Email",
    phone: "Phone",
    active: "Active",
    requiredHint: "* — required fields",
  },
} as const;

/** Создание (`client` не задан) или правка B2C-клиента в модальном окне. */
export function B2CClientForm({
  client,
  onClose,
  onSaved,
}: {
  client: B2CClient | null;
  onClose: () => void;
  onSaved: (client: B2CClient) => void;
}) {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [fullName, setFullName] = useState(client?.full_name ?? "");
  const [inn, setInn] = useState(client?.inn ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [isActive, setIsActive] = useState(client?.is_active ?? true);
  // Открытая часть адреса; улица и дом — отдельно, только администратору
  const [region, setRegion] = useState(client?.address?.region ?? "");
  const [city, setCity] = useState(client?.address?.city ?? "");
  const serverErrors = useServerFieldErrors();

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        email: email.trim(),
        full_name: fullName.trim(),
        inn: inn.trim() || null,
        is_active: isActive,
        phone: phone.trim(),
        address: {
          country_code: client?.address?.country_code ?? "",
          region: region.trim(),
          city: city.trim(),
        },
      };

      return client
        ? updateB2CClient(client.id, payload, csrfToken)
        : createB2CClient(payload, csrfToken);
    },
    onMutate: () => serverErrors.capture(null),
    onError: serverErrors.capture,
    onSuccess: onSaved,
  });
  const generalError = mutation.isError
    ? serverErrors.rest(mutation.error, shownFields, common.unknownError)
    : null;

  const canSubmit =
    fullName.trim() !== "" &&
    isValidInn(inn) &&
    isValidPhone(phone) &&
    !mutation.isPending;

  const input = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: {
      /** Ключ поля в ответе бэкенда — его ошибки показываются под полем. */
      field?: string;
      /** Ошибка проверки на фронте; пока она есть, ошибки бэкенда не видны. */
      error?: string;
      hint?: string;
      inputMode?: "numeric" | "tel";
      required?: boolean;
      type?: string;
    } = {},
  ) => {
    const errors = options.error
      ? [options.error]
      : options.field
        ? (serverErrors.errors[options.field] ?? [])
        : [];

    return (
      <Field
        errors={errors}
        hint={options.hint}
        htmlFor={id}
        label={label}
        required={options.required}
      >
        <input
          aria-invalid={errors.length > 0 || undefined}
          className={fieldInputClass}
          id={id}
          inputMode={options.inputMode}
          onChange={(event) => {
            if (options.field) serverErrors.clear(options.field);
            onChange(event.target.value);
          }}
          required={options.required}
          type={options.type ?? "text"}
          value={value}
        />
      </Field>
    );
  };

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
            {client ? text.editTitle : text.createTitle}
          </h2>
          {client ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {client.full_name}
            </p>
          ) : null}
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {input("b2c-client-full-name", text.fullName, fullName, setFullName, {
            field: "full_name",
            required: true,
          })}
          <div className="grid gap-4 sm:grid-cols-2">
            {input(
              "b2c-client-inn",
              text.inn,
              inn,
              (value) => setInn(sanitizeInn(value)),
              {
                error: innError(inn, locale),
                field: "inn",
                hint: innHint(inn, locale),
                inputMode: "numeric",
              },
            )}
            {input("b2c-client-email", text.email, email, setEmail, {
              field: "email",
              type: "email",
            })}
            {input(
              "b2c-client-phone",
              text.phone,
              phone,
              (value) => setPhone(sanitizePhone(value)),
              {
                error: phoneError(phone, locale),
                field: "phone",
                hint: phoneHint(phone, locale),
                type: "tel",
              },
            )}
            {input("b2c-client-region", text.region, region, setRegion, {
              field: "address.region",
            })}
            {input("b2c-client-city", text.city, city, setCity, {
              field: "address.city",
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
          {generalError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {generalError}
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
