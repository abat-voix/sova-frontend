"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildCreationPlan,
  draftReducer,
  draftWithResponsible,
  emptyNodeKeys,
  isDraftReady,
  selectedDirectionIds,
  selectedProductIds,
  selectedProgramIds,
  type DirectionNode,
  type DraftAction,
  type InteractionDraft,
  type ProgramNode,
} from "@/components/interactions/new-interaction-plan";
import { runCreationPlan } from "@/components/interactions/new-interaction-submit";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import {
  searchB2CClients,
  searchDirections,
  searchManagers,
  searchProducts,
  searchPrograms,
  searchUniversities,
} from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: {
    active: "Активно",
    addDirection: "Добавить направление",
    addProduct: "Добавить продукт",
    addProgram: "Добавить программу",
    cancel: "Отмена",
    catalogHint:
      "Необязательно. Движок откроет отдельный этап на каждое направление, программу и продукт; добавить их можно и после запуска.",
    catalogTitle: "Направления, программы и продукты",
    clientPlaceholder: "Выберите клиента",
    comment: "Комментарий",
    commentPlaceholder: "Например: пилот на осенний семестр",
    counterparty: "Контрагент",
    created: "Взаимодействие создано.",
    direction: "Направление",
    directionPlaceholder: "Выберите направление",
    failed: "Не удалось создать взаимодействие.",
    fillRows: "Заполните добавленные строки.",
    kindB2C: "B2C-клиент",
    kindUniversity: "Вуз",
    partial:
      "Взаимодействие создано, но часть позиций не добавлена. Нажмите «Повторить» — отправится только недостающее.",
    product: "Продукт",
    productNeedsProgram: "Сначала выберите программу",
    productPlaceholder: "Выберите продукт",
    program: "Программа",
    programNeedsDirection: "Сначала выберите направление",
    programPlaceholder: "Выберите программу",
    remove: "Удалить",
    responsible: "Ответственный",
    responsibleIsYou: "Взаимодействие будет закреплено за вами.",
    responsibleNone: "Не назначен",
    responsibleOptional: "Необязательно — можно назначить позже.",
    responsiblePlaceholder: "Выберите менеджера",
    retry: "Повторить",
    submit: "Создать",
    submitting: "Создаём…",
    title: "Новое взаимодействие",
    universityPlaceholder: "Выберите вуз",
  },
  en: {
    active: "Active",
    addDirection: "Add direction",
    addProduct: "Add product",
    addProgram: "Add program",
    cancel: "Cancel",
    catalogHint:
      "Optional. The engine opens a separate stage per direction, program, and product; you can add them after the start too.",
    catalogTitle: "Directions, programs, and products",
    clientPlaceholder: "Pick a client",
    comment: "Comment",
    commentPlaceholder: "For example: pilot for the autumn term",
    counterparty: "Counterparty",
    created: "The interaction was created.",
    direction: "Direction",
    directionPlaceholder: "Pick a direction",
    failed: "The interaction could not be created.",
    fillRows: "Fill in the rows you added.",
    kindB2C: "B2C client",
    kindUniversity: "University",
    partial:
      "The interaction was created, but some entries were not added. Press “Retry” — only the missing ones are sent.",
    product: "Product",
    productNeedsProgram: "Pick a program first",
    productPlaceholder: "Pick a product",
    program: "Program",
    programNeedsDirection: "Pick a direction first",
    programPlaceholder: "Pick a program",
    remove: "Remove",
    responsible: "Responsible",
    responsibleIsYou: "The interaction will be assigned to you.",
    responsibleNone: "Unassigned",
    responsibleOptional: "Optional — you can assign it later.",
    responsiblePlaceholder: "Pick a manager",
    retry: "Retry",
    submit: "Create",
    submitting: "Creating…",
    title: "New interaction",
    universityPlaceholder: "Pick a university",
  },
} as const;

/** Ширится до `string`: у ru и en одинаковые ключи, но разные литералы. */
type Text = { [Key in keyof (typeof copy)["ru"]]: string };

function resolveErrorDetail(error: unknown) {
  return error instanceof ApiError ? error.detail : null;
}

function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      colorScheme="neutral"
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </Button>
  );
}

type RowProps = {
  dispatch: (action: DraftAction) => void;
  draft: InteractionDraft;
  text: Text;
};

function ProgramRow({
  directionId,
  dispatch,
  draft,
  makeKey,
  program,
  text,
}: RowProps & {
  directionId: string;
  makeKey: (prefix: string) => string;
  program: ProgramNode;
}) {
  const programId = program.program?.id ?? null;

  return (
    <div className="border-border space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex items-center gap-2">
        <EntitySelect
          disabled={program.createdId !== null}
          excludeIds={selectedProgramIds(draft)}
          id={`program-${program.key}`}
          label={text.program}
          onChange={(option) =>
            dispatch({ key: program.key, option, type: "set-program" })
          }
          placeholder={text.programPlaceholder}
          queryKey={["catalog", "programs", directionId]}
          search={(term) => searchPrograms(term, directionId)}
          value={program.program}
        />
        <RemoveButton
          label={`${text.remove}: ${text.program}`}
          onClick={() => dispatch({ key: program.key, type: "remove-program" })}
        />
      </div>

      {program.products.map((product) => (
        <div className="flex items-center gap-2 pl-4" key={product.key}>
          <EntitySelect
            disabled={programId === null || product.createdId !== null}
            disabledHint={text.productNeedsProgram}
            // Пара (взаимодействие, продукт) уникальна на бэкенде, поэтому
            // прячем продукты, выбранные в любой другой ветке.
            excludeIds={selectedProductIds(draft)}
            id={`product-${product.key}`}
            label={text.product}
            onChange={(option) =>
              dispatch({ key: product.key, option, type: "set-product" })
            }
            placeholder={text.productPlaceholder}
            queryKey={["catalog", "products", programId]}
            search={(term) => searchProducts(term, programId ?? "")}
            value={product.product}
          />
          <RemoveButton
            label={`${text.remove}: ${text.product}`}
            onClick={() =>
              dispatch({ key: product.key, type: "remove-product" })
            }
          />
        </div>
      ))}

      <Button
        className="ml-4"
        colorScheme="neutral"
        disabled={programId === null}
        onClick={() =>
          dispatch({
            key: makeKey("product"),
            programKey: program.key,
            type: "add-product",
          })
        }
        size="s"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        {text.addProduct}
      </Button>
    </div>
  );
}

function DirectionRow({
  direction,
  dispatch,
  draft,
  makeKey,
  text,
}: RowProps & {
  direction: DirectionNode;
  makeKey: (prefix: string) => string;
}) {
  const directionId = direction.direction?.id ?? null;

  return (
    <div className="bg-secondary/40 space-y-3 rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <EntitySelect
          disabled={direction.createdId !== null}
          excludeIds={selectedDirectionIds(draft)}
          id={`direction-${direction.key}`}
          label={text.direction}
          onChange={(option) =>
            dispatch({ key: direction.key, option, type: "set-direction" })
          }
          placeholder={text.directionPlaceholder}
          queryKey={["catalog", "directions"]}
          search={searchDirections}
          value={direction.direction}
        />
        <RemoveButton
          label={`${text.remove}: ${text.direction}`}
          onClick={() =>
            dispatch({ key: direction.key, type: "remove-direction" })
          }
        />
      </div>

      {direction.programs.map((program) => (
        <ProgramRow
          directionId={directionId ?? ""}
          dispatch={dispatch}
          draft={draft}
          key={program.key}
          makeKey={makeKey}
          program={program}
          text={text}
        />
      ))}

      <Button
        colorScheme="neutral"
        disabled={directionId === null}
        onClick={() =>
          dispatch({
            directionKey: direction.key,
            key: makeKey("program"),
            type: "add-program",
          })
        }
        size="s"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        {directionId === null ? text.programNeedsDirection : text.addProgram}
      </Button>
    </div>
  );
}

export function NewInteractionDialog({
  csrfToken,
  currentUser,
  onClose,
  onCreated,
}: {
  csrfToken: string;
  currentUser: AuthenticatedUser;
  onClose: () => void;
  onCreated: (interactionId: string) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  // КАМ ведёт взаимодействие сам: выбирать ему некого и незачем — эндпоинт
  // `/api/users/` ему отвечает 403.
  const isKam = currentUser.role === "kam";
  const canChooseResponsible =
    currentUser.role === "head" || currentUser.role === "platform_admin";
  const [draft, dispatch] = useReducer(
    draftReducer,
    isKam
      ? { id: String(currentUser.id), name: currentUser.displayName }
      : null,
    draftWithResponsible,
  );
  const [error, setError] = useState<string | null>(null);
  const keyCounter = useRef(0);

  function makeKey(prefix: string) {
    keyCounter.current += 1;

    return `${prefix}-${keyCounter.current}`;
  }

  const mutation = useMutation({
    mutationFn: () => runCreationPlan(buildCreationPlan(draft), csrfToken),
    onSuccess: (outcome) => {
      if (outcome.interactionId === null) {
        setError(resolveErrorDetail(outcome.error) ?? text.failed);

        return;
      }

      // Принятые узлы помечаем сразу: повтор отправит только недостающее.
      dispatch({
        createdIds: outcome.createdIds,
        interactionId: outcome.interactionId,
        responsibleAssigned: outcome.responsibleAssigned,
        type: "mark-created",
      });
      void queryClient.invalidateQueries({
        queryKey: ["interactions", "list"],
      });

      if (outcome.error) {
        setError(text.partial);

        return;
      }

      setError(null);
      toast.success(text.created);
      onCreated(outcome.interactionId);
    },
    onError: (mutationError) => {
      setError(resolveErrorDetail(mutationError) ?? text.failed);
    },
  });

  const isRetry = draft.createdInteractionId !== null;
  const hasEmptyRows = emptyNodeKeys(draft).length > 0;

  return (
    <Modal
      closeLabel={text.cancel}
      labelledBy="new-interaction-title"
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
          <h2 className="text-lg font-medium" id="new-interaction-title">
            {text.title}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <fieldset className="space-y-2">
            <legend className="text-muted-foreground text-xs">
              {text.counterparty}
            </legend>
            <div className="flex gap-4 text-sm">
              {(["university", "b2c_client"] as const).map((kind) => (
                <label className="flex items-center gap-2" key={kind}>
                  <input
                    checked={draft.counterpartyKind === kind}
                    disabled={isRetry}
                    name="counterparty-kind"
                    onChange={() =>
                      dispatch({ kind, type: "set-counterparty-kind" })
                    }
                    type="radio"
                  />
                  {kind === "university" ? text.kindUniversity : text.kindB2C}
                </label>
              ))}
            </div>
            <EntitySelect
              disabled={isRetry}
              id="new-interaction-counterparty"
              label={text.counterparty}
              onChange={(option) =>
                dispatch({ option, type: "set-counterparty" })
              }
              placeholder={
                draft.counterpartyKind === "university"
                  ? text.universityPlaceholder
                  : text.clientPlaceholder
              }
              queryKey={["catalog", "counterparty", draft.counterpartyKind]}
              search={
                draft.counterpartyKind === "university"
                  ? searchUniversities
                  : searchB2CClients
              }
              value={draft.counterparty}
            />
          </fieldset>

          <div>
            <p className="text-muted-foreground text-xs">{text.responsible}</p>
            {canChooseResponsible ? (
              <div className="mt-1">
                <EntitySelect
                  disabled={draft.responsibleAssigned}
                  id="new-interaction-responsible"
                  label={text.responsible}
                  onChange={(option) =>
                    dispatch({ option, type: "set-responsible" })
                  }
                  placeholder={text.responsiblePlaceholder}
                  queryKey={["users", "managers", currentUser.id]}
                  search={searchManagers}
                  value={draft.responsible}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {text.responsibleOptional}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm">
                {draft.responsible?.name ?? text.responsibleNone}
                {isKam ? (
                  <span className="text-muted-foreground block text-xs">
                    {text.responsibleIsYou}
                  </span>
                ) : null}
              </p>
            )}
          </div>

          <div>
            <label
              className="text-muted-foreground text-xs"
              htmlFor="new-interaction-comment"
            >
              {text.comment}
            </label>
            <textarea
              className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              disabled={isRetry}
              id="new-interaction-comment"
              onChange={(event) =>
                dispatch({ comment: event.target.value, type: "set-comment" })
              }
              rows={2}
              placeholder={text.commentPlaceholder}
              value={draft.comment}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              checked={draft.isActive}
              disabled={isRetry}
              onChange={(event) =>
                dispatch({ isActive: event.target.checked, type: "set-active" })
              }
              type="checkbox"
            />
            {text.active}
          </label>

          <section className="space-y-3 border-t pt-4">
            <div>
              <h3 className="text-sm font-medium">{text.catalogTitle}</h3>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {text.catalogHint}
              </p>
            </div>

            {draft.directions.map((direction) => (
              <DirectionRow
                direction={direction}
                dispatch={dispatch}
                draft={draft}
                key={direction.key}
                makeKey={makeKey}
                text={text}
              />
            ))}

            <Button
              colorScheme="neutral"
              onClick={() =>
                dispatch({ key: makeKey("direction"), type: "add-direction" })
              }
              size="m"
              type="button"
              variant="outline"
            >
              <Plus aria-hidden="true" className="size-4" />
              {text.addDirection}
            </Button>
          </section>
        </div>

        <div className="space-y-3 border-t px-5 py-4">
          {error ? (
            <p className="text-sm text-[var(--atmr-accent-primary)]">{error}</p>
          ) : hasEmptyRows ? (
            <p className="text-muted-foreground text-sm">{text.fillRows}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={onClose}
              size="m"
              type="button"
              variant="outline"
            >
              {text.cancel}
            </Button>
            <Button
              disabled={!isDraftReady(draft) || mutation.isPending}
              size="m"
              type="submit"
            >
              {mutation.isPending
                ? text.submitting
                : isRetry
                  ? text.retry
                  : text.submit}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
