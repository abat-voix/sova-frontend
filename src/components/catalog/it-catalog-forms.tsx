"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

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
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import {
  createDirection,
  createProduct,
  createProgram,
  updateDirection,
  updateProduct,
  updateProgram,
} from "@/lib/api/catalog/it-catalog";
import {
  type LookupOption,
  searchDirections,
  searchVendors,
} from "@/lib/api/catalog/lookups";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Direction, Product, Program } from "@/types/catalog";

const headingId = "it-catalog-form-title";

export type CatalogKind = "directions" | "programs" | "products";

/** Что редактируется: вкладка каталога и запись (`null` — создание). */
export type CatalogFormTarget =
  | { kind: "directions"; item: Direction | null }
  | { kind: "programs"; item: Program | null }
  | { kind: "products"; item: Product | null };

const copy = {
  ru: {
    create: {
      directions: "Новое направление",
      programs: "Новая программа",
      products: "Новый продукт",
    },
    edit: {
      directions: "Изменить направление",
      programs: "Изменить программу",
      products: "Изменить продукт",
    },
    name: "Название",
    code: "Внешний код",
    direction: "Направление",
    directionPlaceholder: "Выберите направление",
    vendor: "Вендор",
    vendorPlaceholder: "Без вендора",
    programs: "Программы",
    productNoPrograms: "Направление без программ не сохранится.",
    active: "Активно",
    activeHint:
      "Неактивная запись остаётся в истории, но не предлагается при выборе.",
    requiredHint: "* — обязательные поля",
  },
  en: {
    create: {
      directions: "New direction",
      programs: "New program",
      products: "New product",
    },
    edit: {
      directions: "Edit direction",
      programs: "Edit program",
      products: "Edit product",
    },
    name: "Name",
    code: "External code",
    direction: "Direction",
    directionPlaceholder: "Choose a direction",
    vendor: "Vendor",
    vendorPlaceholder: "No vendor",
    programs: "Programs",
    productNoPrograms: "A direction without programs is not saved.",
    active: "Active",
    activeHint:
      "An inactive record stays in history but is not offered for selection.",
    requiredHint: "* — required fields",
  },
} as const;

/**
 * Создание и правка записи ИТ-каталога. Удаления нет: запись выключают
 * («Активно»), чтобы не терять историю взаимодействий и обучения.
 */
export function CatalogItemForm({
  onClose,
  onSaved,
  target,
}: {
  onClose: () => void;
  onSaved: (saved: { id: string; kind: CatalogKind }) => void;
  target: CatalogFormTarget;
}) {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
  const text = copy[locale];
  const common = registryCopy[locale];
  const { kind, item } = target;
  const [name, setName] = useState(item?.name ?? "");
  const [code, setCode] = useState(
    item && "external_code" in item ? (item.external_code ?? "") : "",
  );
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [direction, setDirection] = useState<LookupOption | null>(
    target.kind === "programs" && target.item ? target.item.direction : null,
  );
  const [vendor, setVendor] = useState<LookupOption | null>(
    target.kind === "products" ? (target.item?.vendor ?? null) : null,
  );
  const [programs, setPrograms] = useState<DirectionPrograms[]>(() =>
    target.kind === "products" && target.item
      ? groupByDirection([], target.item.programs)
      : [],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const externalCode = code.trim() || null;
      if (kind === "directions") {
        const payload = {
          external_code: externalCode,
          is_active: isActive,
          name: name.trim(),
        };
        return item
          ? updateDirection(item.id, payload, csrfToken)
          : createDirection(payload, csrfToken);
      }
      if (kind === "programs") {
        const payload = {
          direction: direction!.id,
          is_active: isActive,
          name: name.trim(),
        };
        return item
          ? updateProgram(item.id, payload, csrfToken)
          : createProgram(payload, csrfToken);
      }
      const payload = {
        external_code: externalCode,
        is_active: isActive,
        name: name.trim(),
        programs: programs.flatMap((group) =>
          group.programs.map((program) => program.id),
        ),
        vendor: vendor?.id ?? null,
      };
      return item
        ? updateProduct(item.id, payload, csrfToken)
        : createProduct(payload, csrfToken);
    },
    onSuccess: (saved) => onSaved({ id: saved.id, kind }),
  });

  const canSubmit =
    name.trim() !== "" &&
    (kind !== "programs" || direction !== null) &&
    !mutation.isPending;

  return (
    <Modal
      allowContentOverflow
      closeLabel={common.cancel}
      labelledBy={headingId}
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
          <h2 className="text-lg font-medium" id={headingId}>
            {item ? text.edit[kind] : text.create[kind]}
          </h2>
          {item ? (
            <p className="text-muted-foreground mt-1 text-sm">{item.name}</p>
          ) : null}
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <Field htmlFor="it-catalog-name" label={text.name} required>
            <input
              className={fieldInputClass}
              id="it-catalog-name"
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </Field>
          {kind !== "programs" ? (
            <Field htmlFor="it-catalog-code" label={text.code}>
              <input
                className={fieldInputClass}
                id="it-catalog-code"
                maxLength={255}
                onChange={(event) => setCode(event.target.value)}
                value={code}
              />
            </Field>
          ) : null}
          {kind === "programs" ? (
            <Field
              htmlFor="it-catalog-direction"
              label={text.direction}
              required
            >
              <EntitySelect
                id="it-catalog-direction"
                label={text.direction}
                onChange={setDirection}
                placeholder={text.directionPlaceholder}
                queryKey={["it-catalog", "form-directions"]}
                search={searchDirections}
                value={direction}
              />
            </Field>
          ) : null}
          {kind === "products" ? (
            <>
              <Field htmlFor="it-catalog-vendor" label={text.vendor}>
                <EntitySelect
                  id="it-catalog-vendor"
                  label={text.vendor}
                  onChange={setVendor}
                  placeholder={text.vendorPlaceholder}
                  queryKey={["it-catalog", "form-vendors"]}
                  search={searchVendors}
                  value={vendor}
                />
              </Field>
              <fieldset className="space-y-2">
                <legend className="text-muted-foreground text-xs">
                  {text.programs}
                </legend>
                <DirectionProgramsField
                  idPrefix="it-catalog-product"
                  noProgramsHint={text.productNoPrograms}
                  onChange={setPrograms}
                  value={programs}
                />
              </fieldset>
            </>
          ) : null}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                type="checkbox"
              />
              {text.active}
            </label>
            <p className="text-muted-foreground mt-1 text-xs">
              {text.activeHint}
            </p>
          </div>
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
