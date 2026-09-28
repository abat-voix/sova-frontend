"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  Field,
  fieldInputClass,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/address";
import {
  getB2CClientRegistrationAddress,
  updateB2CClientRegistrationAddress,
} from "@/lib/api/catalog/b2c-clients";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { WriteB2CClientRegistrationAddress } from "@/types/address";

const copy = {
  ru: {
    title: "Адрес регистрации",
    note: "Персональные данные: каждый просмотр и изменение записываются в журнал.",
    show: "Показать",
    edit: "Изменить",
    loading: "Загружаем адрес…",
    error: "Не удалось загрузить адрес.",
    empty: "Не указан",
    street: "Улица",
    house: "Дом, корпус",
    apartment: "Квартира",
    postal_code: "Индекс",
  },
  en: {
    title: "Registration address",
    note: "Personal data: every view and change is logged.",
    show: "Show",
    edit: "Edit",
    loading: "Loading the address…",
    error: "The address could not be loaded.",
    empty: "Not provided",
    street: "Street",
    house: "Building",
    apartment: "Apartment",
    postal_code: "Postal code",
  },
} as const;

const fields = ["street", "house", "apartment", "postal_code"] as const;

const emptyDraft: WriteB2CClientRegistrationAddress = {
  street: "",
  house: "",
  apartment: "",
  postal_code: "",
};

/**
 * Адрес регистрации B2C-клиента — только администратору платформы. Адрес не
 * загружается сам: каждый просмотр пишется в журнал, поэтому его открывают
 * явно кнопкой.
 */
export function B2CRegistrationAddress({ clientId }: { clientId: string }) {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const [isRevealed, setIsRevealed] = useState(false);
  const [draft, setDraft] = useState<WriteB2CClientRegistrationAddress | null>(
    null,
  );
  const canRead = user !== null && can(user, "catalog.personal_data.read");
  const canUpdate = user !== null && can(user, "catalog.personal_data.update");
  const queryKey = ["catalog", "b2c-clients", "registration-address", clientId];

  const addressQuery = useQuery({
    enabled: canRead && isRevealed,
    queryFn: () => getB2CClientRegistrationAddress(clientId),
    queryKey,
  });
  const mutation = useMutation({
    mutationFn: (payload: WriteB2CClientRegistrationAddress) =>
      updateB2CClientRegistrationAddress(clientId, payload, csrfToken),
    onSuccess: (address) => {
      queryClient.setQueryData(queryKey, address);
      setDraft(null);
    },
  });

  if (!canRead) return null;

  const address = addressQuery.data;

  return (
    <section className="mt-6 rounded-xl border p-4" aria-label={text.title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <LockKeyhole aria-hidden="true" className="size-4" />
            {text.title}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">{text.note}</p>
        </div>
        {!isRevealed ? (
          <Button
            colorScheme="neutral"
            onClick={() => setIsRevealed(true)}
            size="m"
            type="button"
            variant="outline"
          >
            {text.show}
          </Button>
        ) : address && canUpdate && draft === null ? (
          <Button
            colorScheme="neutral"
            onClick={() =>
              setDraft(
                Object.fromEntries(
                  fields.map((field) => [field, address[field] ?? ""]),
                ) as WriteB2CClientRegistrationAddress,
              )
            }
            size="m"
            type="button"
            variant="outline"
          >
            {text.edit}
          </Button>
        ) : null}
      </div>

      {!isRevealed ? null : addressQuery.isPending ? (
        <p className="text-muted-foreground mt-3 text-sm">{text.loading}</p>
      ) : addressQuery.isError ? (
        <p className="text-muted-foreground mt-3 text-sm">{text.error}</p>
      ) : draft ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(draft);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <Field
                htmlFor={`b2c-registration-${field}`}
                key={field}
                label={text[field]}
              >
                <input
                  className={fieldInputClass}
                  id={`b2c-registration-${field}`}
                  onChange={(event) =>
                    setDraft({
                      ...(draft ?? emptyDraft),
                      [field]: event.target.value,
                    })
                  }
                  value={draft[field]}
                />
              </Field>
            ))}
          </div>
          {mutation.isError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {apiErrorMessage(mutation.error, common.unknownError)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={() => setDraft(null)}
              size="m"
              type="button"
              variant="outline"
            >
              {common.cancel}
            </Button>
            <Button disabled={mutation.isPending} size="m" type="submit">
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm">{formatAddress(address) || text.empty}</p>
      )}
    </section>
  );
}
