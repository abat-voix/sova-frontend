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
  createB2CClient,
  updateB2CClient,
} from "@/lib/api/catalog/b2c-clients";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { B2CClient, B2CClientKind } from "@/types/catalog";

const formHeadingId = "b2c-client-form-title";

const copy = {
  ru: {
    createTitle: "Новый B2C-клиент",
    editTitle: "Изменить B2C-клиента",
    fullName: "ФИО / наименование",
    kind: "Тип клиента",
    kindPlaceholder: "Выберите тип",
    individual: "Физлицо",
    legalEntity: "Юрлицо",
    inn: "ИНН",
    email: "Email",
    phone: "Телефон",
    active: "Активен",
    requiredHint: "* — обязательные поля",
  },
  en: {
    createTitle: "New B2C client",
    editTitle: "Edit B2C client",
    fullName: "Full name / company name",
    kind: "Client type",
    kindPlaceholder: "Select a type",
    individual: "Individual",
    legalEntity: "Company",
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
  // Тип не угадываем: у нового клиента его выбирают явно
  const [kind, setKind] = useState<B2CClientKind | "">(client?.kind ?? "");
  const [inn, setInn] = useState(client?.inn ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [isActive, setIsActive] = useState(client?.is_active ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        email: email.trim(),
        full_name: fullName.trim(),
        inn: inn.trim() || null,
        is_active: isActive,
        kind: kind as B2CClientKind,
        phone: phone.trim(),
      };

      return client
        ? updateB2CClient(client.id, payload, csrfToken)
        : createB2CClient(payload, csrfToken);
    },
    onSuccess: onSaved,
  });

  const canSubmit =
    fullName.trim() !== "" && kind !== "" && !mutation.isPending;

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
            required: true,
          })}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="b2c-client-kind" label={text.kind} required>
              <select
                className={fieldInputClass}
                id="b2c-client-kind"
                onChange={(event) =>
                  setKind(event.target.value as B2CClientKind | "")
                }
                required
                value={kind}
              >
                <option disabled value="">
                  {text.kindPlaceholder}
                </option>
                <option value="individual">{text.individual}</option>
                <option value="legal_entity">{text.legalEntity}</option>
              </select>
            </Field>
            {input("b2c-client-inn", text.inn, inn, setInn)}
            {input("b2c-client-email", text.email, email, setEmail, {
              type: "email",
            })}
            {input("b2c-client-phone", text.phone, phone, setPhone, {
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
