"use client";

import { Field, fieldInputClass } from "@/components/registry/registry-shared";
import { formatCoordinates, parseCoordinates } from "@/lib/address";
import type { OrganizationAddress } from "@/types/address";

/** Черновик адреса в форме: координаты вводятся одной строкой. */
export type AddressDraft = Omit<OrganizationAddress, "lat" | "lon"> & {
  coordinates: string;
};

export type AddressField = keyof AddressDraft;

const emptyDraft: AddressDraft = {
  country_code: "",
  region: "",
  city: "",
  street: "",
  house: "",
  office: "",
  postal_code: "",
  coordinates: "",
};

export function addressDraft(
  address: Partial<OrganizationAddress> | null | undefined,
): AddressDraft {
  return {
    ...emptyDraft,
    ...Object.fromEntries(
      Object.entries(address ?? {}).filter(
        ([key, value]) => key in emptyDraft && typeof value === "string",
      ),
    ),
    coordinates: formatCoordinates(
      address ? { lat: address.lat ?? null, lon: address.lon ?? null } : null,
    ),
  };
}

/** Координаты черновика не разбираются — форму нельзя сохранить. */
export function hasInvalidCoordinates(draft: AddressDraft) {
  return parseCoordinates(draft.coordinates) === undefined;
}

/**
 * Адрес для бэкенда: пустой черновик — `null` (адрес удаляется), иначе части
 * адреса и координаты из строки `широта, долгота`.
 */
export function addressPayload(
  draft: AddressDraft,
): Partial<OrganizationAddress> | null {
  const { coordinates, ...parts } = draft;
  const trimmed = Object.fromEntries(
    Object.entries(parts).map(([key, value]) => [key, value.trim()]),
  ) as Omit<AddressDraft, "coordinates">;
  const point = parseCoordinates(coordinates);
  if (!Object.values(trimmed).some(Boolean) && !point) return null;

  return { ...trimmed, lat: point?.lat ?? null, lon: point?.lon ?? null };
}

export type AddressFieldsLabels = Record<AddressField, string> & {
  coordinatesHint: string;
  coordinatesError: string;
};

/**
 * Поля адреса: набор частей задаёт раздел. Одинаковые у организации и
 * B2C-клиента, отличаются только составом.
 */
export function AddressFields({
  draft,
  fields,
  idPrefix,
  labels,
  onChange,
}: {
  draft: AddressDraft;
  fields: AddressField[];
  idPrefix: string;
  labels: AddressFieldsLabels;
  onChange: (draft: AddressDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.replaceAll("_", "-")}`;
        const isCoordinates = field === "coordinates";
        const invalid = isCoordinates && hasInvalidCoordinates(draft);

        return (
          <Field
            hint={
              isCoordinates
                ? invalid
                  ? labels.coordinatesError
                  : labels.coordinatesHint
                : undefined
            }
            htmlFor={id}
            key={field}
            label={labels[field]}
          >
            <input
              aria-invalid={invalid || undefined}
              className={fieldInputClass}
              id={id}
              inputMode={isCoordinates ? "decimal" : undefined}
              onChange={(event) =>
                onChange({ ...draft, [field]: event.target.value })
              }
              placeholder={isCoordinates ? "55.752040, 37.617810" : undefined}
              value={draft[field]}
            />
          </Field>
        );
      })}
    </div>
  );
}
