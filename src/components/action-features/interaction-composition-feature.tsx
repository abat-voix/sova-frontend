"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import {
  searchCatalogProducts,
  searchDirections,
  searchProducts,
  searchPrograms,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import {
  interactionDirectionsQueryKey,
  interactionProductsQueryKey,
  interactionProgramsQueryKey,
} from "@/lib/api/interactions/interactions";
import {
  actionFeatureInitialQueryKey,
  boardQueryKey,
  executeActionFeature,
  getActionFeatureInitial,
} from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  ActionFeatureExecution,
  ExecuteActionFeatureResult,
  InteractionCompositionFeatureInitial,
} from "@/types/action-feature";
import type { InteractionShort } from "@/types/workflow-board";

type CompositionFeatureCode =
  | "interaction_direction.add"
  | "interaction_direction.remove"
  | "interaction_program.add"
  | "interaction_program.remove"
  | "interaction_product.add"
  | "interaction_product.remove";

const copy = {
  ru: {
    titles: {
      "interaction_direction.add": "Добавить направление",
      "interaction_direction.remove": "Убрать направление",
      "interaction_program.add": "Добавить программу",
      "interaction_program.remove": "Убрать программу",
      "interaction_product.add": "Добавить продукт",
      "interaction_product.remove": "Убрать продукт",
    },
    direction: "Направление",
    program: "Программа",
    product: "Продукт",
    chooseDirection: "Выберите направление",
    chooseProgram: "Выберите программу",
    chooseProduct: "Выберите продукт",
    programDirectionFirst: "Сначала выберите направление",
    productProgram: "Программа продукта (необязательно)",
    withoutProgram: "Без программы",
    loading: "Загружаем состав взаимодействия…",
    error: "Не удалось изменить состав взаимодействия.",
    add: "Добавить",
    remove: "Убрать",
    confirm: "Подтвердить",
    cancel: "Отмена",
    saving: "Сохраняем…",
    successAdd: "Элемент добавлен во взаимодействие.",
    successRemove: "Элемент убран из взаимодействия.",
    added: "Добавлено",
    removed: "Убрано",
    noDirections: "Сначала добавьте направление во взаимодействие.",
    noPrograms: "Во взаимодействии нет активных программ.",
    noItems: "Нет активных элементов для удаления.",
    directionWarning:
      "Направление станет неактивным. Связанные программы и продукты останутся в составе взаимодействия.",
    programWarning:
      "Программа станет неактивной. Связанные продукты останутся в составе взаимодействия.",
    productWarning:
      "Продукт станет неактивным и перестанет участвовать в текущем процессе.",
    relatedPrograms: "связанных программ",
    relatedProducts: "связанных продуктов",
  },
  en: {
    titles: {
      "interaction_direction.add": "Add direction",
      "interaction_direction.remove": "Remove direction",
      "interaction_program.add": "Add program",
      "interaction_program.remove": "Remove program",
      "interaction_product.add": "Add product",
      "interaction_product.remove": "Remove product",
    },
    direction: "Direction",
    program: "Program",
    product: "Product",
    chooseDirection: "Choose a direction",
    chooseProgram: "Choose a program",
    chooseProduct: "Choose a product",
    programDirectionFirst: "Choose a direction first",
    productProgram: "Product program (optional)",
    withoutProgram: "Without a program",
    loading: "Loading interaction scope…",
    error: "Could not change the interaction scope.",
    add: "Add",
    remove: "Remove",
    confirm: "Confirm",
    cancel: "Cancel",
    saving: "Saving…",
    successAdd: "Item added to the interaction.",
    successRemove: "Item removed from the interaction.",
    added: "Added",
    removed: "Removed",
    noDirections: "Add a direction to the interaction first.",
    noPrograms: "The interaction has no active programs.",
    noItems: "There are no active items to remove.",
    directionWarning:
      "The direction will become inactive. Its programs and products will remain in the interaction.",
    programWarning:
      "The program will become inactive. Its products will remain in the interaction.",
    productWarning:
      "The product will become inactive and stop participating in the current process.",
    relatedPrograms: "related programs",
    relatedProducts: "related products",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

type Props = {
  actionInstanceId: string;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
  featureCode?: ActionFeatureCode;
  executions?: ActionFeatureExecution[];
  executionNo?: number;
};

function normalizeCode(
  featureCode?: ActionFeatureCode,
): CompositionFeatureCode {
  switch (featureCode) {
    case "interaction_direction.add":
    case "interaction_direction.remove":
    case "interaction_program.add":
    case "interaction_program.remove":
    case "interaction_product.add":
    case "interaction_product.remove":
      return featureCode;
    default:
      return "interaction_direction.add";
  }
}

function itemType(code: CompositionFeatureCode) {
  if (code.startsWith("interaction_direction")) return "direction" as const;
  if (code.startsWith("interaction_program")) return "program" as const;
  return "product" as const;
}

function removeOptions(
  code: CompositionFeatureCode,
  initial: InteractionCompositionFeatureInitial,
  text: Text,
): LookupOption[] {
  if (code === "interaction_direction.remove") {
    return initial.directions.map((item) => ({
      id: item.id,
      name: item.name,
      hint: item.related_programs_count
        ? `${item.related_programs_count} ${text.relatedPrograms}`
        : undefined,
    }));
  }
  if (code === "interaction_program.remove") {
    return initial.programs.map((item) => ({
      id: item.id,
      name: item.name,
      hint: [
        item.direction.name,
        item.related_products_count
          ? `${item.related_products_count} ${text.relatedProducts}`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  }
  return initial.products.map((item) => {
    const program = initial.programs.find(
      (candidate) => candidate.id === item.interaction_program,
    );
    return { id: item.id, name: item.name, hint: program?.name };
  });
}

export function InteractionCompositionFeature({
  actionInstanceId,
  csrfToken,
  featureCode,
  interaction,
  workflowInstanceId,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const code = normalizeCode(featureCode);
  const type = itemType(code);
  const isRemove = code.endsWith(".remove");
  const [parent, setParent] = useState<LookupOption | null>(null);
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ExecuteActionFeatureResult | null>(null);

  const initialQuery = useQuery({
    queryKey: actionFeatureInitialQueryKey(actionInstanceId, code),
    queryFn: () => getActionFeatureInitial(actionInstanceId, code),
    gcTime: 0,
  });
  const initial = initialQuery.data;
  const existingCatalogIds = initial
    ? type === "direction"
      ? initial.directions.map((item) => item.catalog_id)
      : type === "program"
        ? initial.programs.map((item) => item.catalog_id)
        : initial.products.map((item) => item.catalog_id)
    : [];
  const staticOptions =
    isRemove && initial ? removeOptions(code, initial, text) : undefined;
  const directionOptions =
    initial?.directions.map((item) => ({
      id: item.catalog_id,
      name: item.name,
    })) ?? [];
  const programOptions =
    initial?.programs.map((item) => ({
      id: item.id,
      name: item.name,
      hint: item.direction.name,
    })) ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No composition item selected");
      switch (code) {
        case "interaction_direction.add":
          return executeActionFeature(
            actionInstanceId,
            code,
            { direction: selected.id },
            csrfToken,
          );
        case "interaction_direction.remove":
          return executeActionFeature(
            actionInstanceId,
            code,
            { interaction_direction: selected.id },
            csrfToken,
          );
        case "interaction_program.add":
          return executeActionFeature(
            actionInstanceId,
            code,
            { program: selected.id },
            csrfToken,
          );
        case "interaction_program.remove":
          return executeActionFeature(
            actionInstanceId,
            code,
            { interaction_program: selected.id },
            csrfToken,
          );
        case "interaction_product.add":
          return executeActionFeature(
            actionInstanceId,
            code,
            { product: selected.id, interaction_program: parent?.id ?? null },
            csrfToken,
          );
        case "interaction_product.remove":
          return executeActionFeature(
            actionInstanceId,
            code,
            { interaction_product: selected.id },
            csrfToken,
          );
      }
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError
          ? (mutationError.detail ?? text.error)
          : text.error,
      ),
    onSuccess: (result) => {
      setSaved(result);
      setSelected(null);
      setParent(null);
      setNeedsConfirmation(false);
      setError(null);
      toast.success(isRemove ? text.successRemove : text.successAdd);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-feature-initial", actionInstanceId],
      });
      if (interaction) {
        void queryClient.invalidateQueries({
          queryKey: interactionDirectionsQueryKey(interaction.id),
        });
        void queryClient.invalidateQueries({
          queryKey: interactionProgramsQueryKey(interaction.id),
        });
        void queryClient.invalidateQueries({
          queryKey: interactionProductsQueryKey(interaction.id),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["interactions", "list"],
      });
    },
  });

  if (!interaction) {
    return (
      <p className="text-muted-foreground border-t pt-3 text-sm">
        {text.error}
      </p>
    );
  }

  const label =
    type === "direction"
      ? text.direction
      : type === "program"
        ? text.program
        : text.product;
  const placeholder =
    type === "direction"
      ? text.chooseDirection
      : type === "program"
        ? text.chooseProgram
        : text.chooseProduct;
  const search = isRemove
    ? undefined
    : type === "direction"
      ? searchDirections
      : type === "program"
        ? parent
          ? (term: string) => searchPrograms(term, parent.id)
          : undefined
        : parent
          ? (term: string) => {
              const program = initial?.programs.find(
                (item) => item.id === parent.id,
              );
              return program
                ? searchProducts(term, program.catalog_id)
                : Promise.resolve([]);
            }
          : searchCatalogProducts;
  const removeWarning =
    type === "direction"
      ? text.directionWarning
      : type === "program"
        ? text.programWarning
        : text.productWarning;
  const noItems =
    code === "interaction_program.add" && directionOptions.length === 0
      ? text.noDirections
      : code === "interaction_product.add" && programOptions.length === 0
        ? null
        : isRemove && staticOptions?.length === 0
          ? text.noItems
          : null;

  return (
    <section aria-label={text.titles[code]} className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-medium">{text.titles[code]}</h4>
      {initialQuery.isPending ? (
        <p className="text-muted-foreground text-sm">{text.loading}</p>
      ) : initialQuery.isError ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{text.error}</p>
      ) : noItems ? (
        <p className="text-muted-foreground text-sm">{noItems}</p>
      ) : (
        <>
          {code === "interaction_program.add" ? (
            <EntitySelect
              id={`${actionInstanceId}-${code}-direction`}
              label={text.direction}
              onChange={(option) => {
                setParent(option);
                setSelected(null);
              }}
              options={directionOptions}
              placeholder={text.chooseDirection}
              queryKey={["processes", "composition-feature", code, "direction"]}
              value={parent}
            />
          ) : null}
          {code === "interaction_product.add" ? (
            <EntitySelect
              id={`${actionInstanceId}-${code}-program`}
              label={text.productProgram}
              onChange={(option) => {
                setParent(option);
                setSelected(null);
              }}
              options={programOptions}
              placeholder={text.withoutProgram}
              queryKey={["processes", "composition-feature", code, "program"]}
              value={parent}
            />
          ) : null}
          <EntitySelect
            disabled={code === "interaction_program.add" && !parent}
            disabledHint={text.programDirectionFirst}
            excludeIds={isRemove ? [] : existingCatalogIds}
            id={`${actionInstanceId}-${code}-item`}
            label={label}
            onChange={(option) => {
              setSelected(option);
              setNeedsConfirmation(false);
              setError(null);
              setSaved(null);
            }}
            options={staticOptions}
            placeholder={placeholder}
            queryKey={[
              "processes",
              "composition-feature",
              code,
              "item",
              parent?.id,
            ]}
            search={search}
            value={selected}
          />
        </>
      )}

      {selected && isRemove && needsConfirmation ? (
        <div className="bg-secondary space-y-3 rounded-lg p-3 text-sm">
          <p>{removeWarning}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              size="m"
              type="button"
            >
              {mutation.isPending ? text.saving : text.confirm}
            </Button>
            <Button
              colorScheme="neutral"
              disabled={mutation.isPending}
              onClick={() => setNeedsConfirmation(false)}
              size="m"
              type="button"
              variant="outline"
            >
              {text.cancel}
            </Button>
          </div>
        </div>
      ) : selected ? (
        <Button
          disabled={mutation.isPending}
          onClick={() => {
            if (isRemove) setNeedsConfirmation(true);
            else mutation.mutate();
          }}
          size="m"
          type="button"
        >
          {mutation.isPending ? text.saving : isRemove ? text.remove : text.add}
        </Button>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--atmr-brand-orange)]">{error}</p>
      ) : null}
      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {isRemove ? text.removed : text.added}:{" "}
          {String(saved.target.data.name ?? "")}
        </p>
      ) : null}
    </section>
  );
}
