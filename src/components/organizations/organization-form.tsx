"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  AddressFields,
  addressDraft,
  addressPayload,
  hasInvalidCoordinates,
  type AddressField,
  type AddressFieldsLabels,
} from "@/components/catalog/address-fields";
import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createOrganization,
  updateOrganization,
} from "@/lib/api/catalog/organizations";
import { organizationTypeLabels } from "@/lib/organization-type";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Organization, OrganizationType } from "@/types/organization";

const formHeadingId = "organization-form-title";

const addressFields: AddressField[] = [
  "postal_code",
  "region",
  "city",
  "street",
  "house",
  "office",
  "coordinates",
];

const addressLabels: Record<"ru" | "en", AddressFieldsLabels> = {
  ru: {
    country_code: "Страна",
    postal_code: "Индекс",
    region: "Регион",
    city: "Город",
    street: "Улица",
    house: "Дом, корпус",
    office: "Офис",
    coordinates: "Координаты",
    coordinatesHint:
      "Широта и долгота через запятую — так их копируют Яндекс Карты и Google Maps. Нужны для карты.",
    coordinatesError:
      "Не удалось разобрать: укажите широту (от −90 до 90) и долготу (от −180 до 180) через запятую.",
  },
  en: {
    country_code: "Country",
    postal_code: "Postal code",
    region: "Region",
    city: "City",
    street: "Street",
    house: "Building",
    office: "Office",
    coordinates: "Coordinates",
    coordinatesHint:
      "Latitude and longitude separated by a comma, as Yandex Maps and Google Maps copy them. Used for the map.",
    coordinatesError:
      "Could not parse: enter latitude (−90 to 90) and longitude (−180 to 180) separated by a comma.",
  },
};

const copy = {
  ru: {
    createTitle: "Новая организация",
    editTitle: "Изменить организацию",
    name: "Название",
    type: "Вид организации",
    legalAddress: "Юридический адрес",
    actualAddress: "Фактический адрес",
    sameAsLegal: "Фактический адрес совпадает с юридическим",
    inn: "ИНН",
    externalCode: "Внешний код",
    email: "Email",
    phone: "Телефон",
    active: "Активен",
    requiredHint: "* — обязательные поля",
  },
  en: {
    createTitle: "New organization",
    editTitle: "Edit organization",
    name: "Name",
    type: "Organization type",
    legalAddress: "Legal address",
    actualAddress: "Actual address",
    sameAsLegal: "Actual address is the same as legal",
    inn: "Tax ID",
    externalCode: "External code",
    email: "Email",
    phone: "Phone",
    active: "Active",
    requiredHint: "* — required fields",
  },
} as const;

/** Создание (`organization` не задан) или правка организации в модальном окне. */
export function OrganizationForm({
  onClose,
  onSaved,
  organization,
}: {
  onClose: () => void;
  onSaved: (organization: Organization) => void;
  organization: Organization | null;
}) {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
  const text = copy[locale];
  const common = registryCopy[locale];
  const [name, setName] = useState(organization?.name ?? "");
  const [inn, setInn] = useState(organization?.inn ?? "");
  const [externalCode, setExternalCode] = useState(
    organization?.external_code ?? "",
  );
  const [email, setEmail] = useState(organization?.email ?? "");
  const [phone, setPhone] = useState(organization?.phone ?? "");
  const [isActive, setIsActive] = useState(organization?.is_active ?? true);
  const [organizationType, setOrganizationType] = useState<OrganizationType>(
    organization?.organization_type ?? "education",
  );
  const [legal, setLegal] = useState(() =>
    addressDraft(organization?.legal_address),
  );
  const [sameAsLegal, setSameAsLegal] = useState(
    organization?.actual_same_as_legal ?? false,
  );
  // При «совпадает» бэкенд отдаёт в actual_address юридический — в черновик его не берём
  const [actual, setActual] = useState(() =>
    addressDraft(
      organization?.actual_same_as_legal ? null : organization?.actual_address,
    ),
  );

  const mutation = useMutation({
    mutationFn: () => {
      // Пустые ИНН и код уходят null: они уникальны, пустая строка столкнулась бы
      const payload = {
        email: email.trim(),
        external_code: externalCode.trim() || null,
        inn: inn.trim() || null,
        is_active: isActive,
        name: name.trim(),
        organization_type: organizationType,
        phone: phone.trim(),
        legal_address: addressPayload(legal),
        actual_same_as_legal: sameAsLegal,
        ...(sameAsLegal ? {} : { actual_address: addressPayload(actual) }),
      };

      return organization
        ? updateOrganization(organization.id, payload, csrfToken)
        : createOrganization(payload, csrfToken);
    },
    onSuccess: onSaved,
  });

  const canSubmit =
    name.trim() !== "" &&
    !hasInvalidCoordinates(legal) &&
    (sameAsLegal || !hasInvalidCoordinates(actual)) &&
    !mutation.isPending;
  const addressText = addressLabels[locale];

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
            {organization ? text.editTitle : text.createTitle}
          </h2>
          {organization ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {organization.name}
            </p>
          ) : null}
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {input("organization-name", text.name, name, setName, {
            required: true,
          })}
          <Field htmlFor="organization-type" label={text.type}>
            <select
              className={fieldInputClass}
              id="organization-type"
              onChange={(event) =>
                setOrganizationType(event.target.value as OrganizationType)
              }
              value={organizationType}
            >
              {Object.entries(organizationTypeLabels[locale]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("organization-inn", text.inn, inn, setInn)}
            {input(
              "organization-external-code",
              text.externalCode,
              externalCode,
              setExternalCode,
            )}
            {input("organization-email", text.email, email, setEmail, {
              type: "email",
            })}
            {input("organization-phone", text.phone, phone, setPhone, {
              type: "tel",
            })}
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{text.legalAddress}</legend>
            <AddressFields
              draft={legal}
              fields={addressFields}
              idPrefix="organization-legal"
              labels={addressText}
              onChange={setLegal}
            />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              {text.actualAddress}
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={sameAsLegal}
                onChange={(event) => setSameAsLegal(event.target.checked)}
                type="checkbox"
              />
              {text.sameAsLegal}
            </label>
            {sameAsLegal ? null : (
              <AddressFields
                draft={actual}
                fields={addressFields}
                idPrefix="organization-actual"
                labels={addressText}
                onChange={setActual}
              />
            )}
          </fieldset>
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
