"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildCreationPlan,
  draftReducer,
  emptyDraft,
  emptyNodeKeys,
  isDraftReady,
  selectedDirectionIds,
  selectedProductIds,
  selectedProgramIds,
  type DirectionNode,
  type CounterpartyKind,
  type DraftAction,
  type InteractionDraft,
  type ProgramNode,
} from "@/components/interactions/new-interaction-plan";
import { runCreationPlan } from "@/components/interactions/new-interaction-submit";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import {
  searchB2CClients,
  searchDirections,
  searchManagers,
  searchProducts,
  searchPrograms,
  searchOrganizations,
  searchRegistryContracts,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import { listUsers, usersQueryKey, usersRootKey } from "@/lib/api/users/team";
import {
  assignResponsible,
  unassignResponsible,
} from "@/lib/api/interactions/interactions";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Interaction } from "@/types/workflow-board";

export type PreselectedCounterparty = {
  id: string;
  kind: CounterpartyKind;
  name: string;
};

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
    catalogFromContract:
      "Перейдут из выбранного договора — добавить свои можно после создания.",
    clientPlaceholder: "Выберите клиента",
    contract: "Договор из реестра",
    contractHint:
      "Необязательно. Только договоры, по которым ещё нет взаимодействия; организация подставится из договора.",
    contractPlaceholder: "Выберите договор",
    comment: "Комментарий",
    commentPlaceholder: "Например: пилот на осенний семестр",
    counterparty: "Контрагент",
    created: "Взаимодействие создано.",
    editTitle: "Редактировать взаимодействие",
    edited: "Ответственные обновлены.",
    direction: "Направление",
    directionPlaceholder: "Выберите направление",
    failed: "Не удалось создать взаимодействие.",
    fillRows: "Заполните добавленные строки.",
    kindB2C: "B2C-клиент",
    kindOrganization: "Организация",
    partial:
      "Взаимодействие создано, но часть позиций не добавлена. Нажмите «Повторить» — отправится только недостающее.",
    product: "Продукт",
    productNeedsProgram: "Сначала выберите программу",
    productPlaceholder: "Выберите продукт",
    program: "Программа",
    programNeedsDirection: "Сначала выберите направление",
    programPlaceholder: "Выберите программу",
    remove: "Удалить",
    assignSelf: "Назначить себя",
    joinsYourTeam: "войдёт в вашу команду",
    kamHasHead: "Этого КАМа уже забрал другой руководитель.",
    responsible: "Ответственные",
    responsibleIsYou: "Взаимодействие будет закреплено за вами.",
    responsibleLocked: "Снять может руководитель этого КАМа или администратор.",
    responsibleNone: "Не назначены",
    responsibleOptional:
      "Необязательно — можно назначить позже. КАМов может быть несколько.",
    responsiblePlaceholder: "Выберите менеджеров",
    retry: "Повторить",
    submit: "Создать",
    save: "Сохранить",
    submitting: "Создаём…",
    title: "Новое взаимодействие",
    organizationPlaceholder: "Выберите организацию",
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
    catalogFromContract:
      "They carry over from the selected contract — you can add more after creation.",
    clientPlaceholder: "Pick a client",
    contract: "Registry contract",
    contractHint:
      "Optional. Only contracts that have no interaction yet; the organization is taken from the contract.",
    contractPlaceholder: "Pick a contract",
    comment: "Comment",
    commentPlaceholder: "For example: pilot for the autumn term",
    counterparty: "Counterparty",
    created: "The interaction was created.",
    editTitle: "Edit interaction",
    edited: "Responsibles updated.",
    direction: "Direction",
    directionPlaceholder: "Pick a direction",
    failed: "The interaction could not be created.",
    fillRows: "Fill in the rows you added.",
    kindB2C: "B2C client",
    kindOrganization: "Organization",
    partial:
      "The interaction was created, but some entries were not added. Press “Retry” — only the missing ones are sent.",
    product: "Product",
    productNeedsProgram: "Pick a program first",
    productPlaceholder: "Pick a product",
    program: "Program",
    programNeedsDirection: "Pick a direction first",
    programPlaceholder: "Pick a program",
    remove: "Remove",
    assignSelf: "Assign myself",
    joinsYourTeam: "will join your team",
    kamHasHead: "Another head has already taken this KAM.",
    responsible: "Responsibles",
    responsibleIsYou: "The interaction will be assigned to you.",
    responsibleLocked:
      "Only this KAM's head or an administrator can remove them.",
    responsibleNone: "Unassigned",
    responsibleOptional:
      "Optional — you can assign them later. There can be several KAMs.",
    responsiblePlaceholder: "Pick managers",
    retry: "Retry",
    submit: "Create",
    save: "Save",
    submitting: "Creating…",
    title: "New interaction",
    organizationPlaceholder: "Pick a organization",
  },
} as const;

/** Ширится до `string`: у ru и en одинаковые ключи, но разные литералы. */
type Text = { [Key in keyof (typeof copy)["ru"]]: string };

function responsibleNames(options: { name: string }[]) {
  return options.map((option) => option.name).join(", ");
}

/** Ошибка назначения ответственного: КАМа забрали или менеджер недопустим. */
function isResponsibleError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === "kam_has_head" || Boolean(error.fieldErrors.manager))
  );
}

function resolveErrorDetail(error: unknown, kamHasHead: string) {
  if (!(error instanceof ApiError)) return null;
  if (error.code === "kam_has_head") return kamHasHead;
  // Недопустимый ответственный: бэк объясняет причину в ошибке поля `manager`
  return error.detail ?? error.fieldErrors.manager?.[0] ?? null;
}

function initialDraft({
  editInteraction,
  preselectedCounterparty,
  responsible,
}: {
  editInteraction?: Interaction;
  preselectedCounterparty?: PreselectedCounterparty;
  responsible: { id: string; name: string } | null;
}): InteractionDraft {
  if (editInteraction) {
    return {
      comment: editInteraction.comment ?? "",
      contract: null,
      counterparty: editInteraction.organization
        ? {
            id: editInteraction.organization.id,
            name: editInteraction.organization.name,
          }
        : editInteraction.b2c_client
          ? {
              id: editInteraction.b2c_client.id,
              name: editInteraction.b2c_client.full_name,
            }
          : null,
      counterpartyKind: editInteraction.b2c_client
        ? "b2c_client"
        : "organization",
      createdInteractionId: null,
      directions: [],
      isActive: editInteraction.is_active ?? true,
      responsibles: editInteraction.current_responsibles.map((responsible) => ({
        id: String(responsible.manager.id),
        name: responsible.manager.full_name,
      })),
      assignedResponsibleIds: [],
    };
  }

  // КАМа-автора бэк назначает сам при создании — план не должен слать assign-responsible
  return {
    ...emptyDraft,
    assignedResponsibleIds: responsible ? [responsible.id] : [],
    counterparty: preselectedCounterparty
      ? { id: preselectedCounterparty.id, name: preselectedCounterparty.name }
      : null,
    counterpartyKind: preselectedCounterparty?.kind ?? "organization",
    responsibles: responsible ? [responsible] : [],
  };
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
  editInteraction,
  onClose,
  onCreated,
  onCreatedAction,
  onUpdated,
  preselectedCounterparty,
}: {
  csrfToken: string;
  currentUser: AuthenticatedUser;
  editInteraction?: Interaction;
  onClose: () => void;
  onCreated: (interactionId: string) => void;
  onCreatedAction?: {
    label: string;
    onClick: (interactionId: string) => void;
  };
  onUpdated?: () => void;
  preselectedCounterparty?: PreselectedCounterparty;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  // КАМ ведёт взаимодействие сам: выбирать ему некого и незачем — эндпоинт
  // `/api/users/` ему отвечает 403.
  const isKam = currentUser.role === "kam";
  const canChooseResponsible =
    currentUser.isSuperuser ||
    currentUser.role === "head" ||
    currentUser.role === "platform_admin";
  const isEditing = Boolean(editInteraction);
  const [draft, dispatch] = useReducer(
    draftReducer,
    {
      editInteraction,
      preselectedCounterparty,
      responsible: isKam
        ? { id: String(currentUser.id), name: currentUser.displayName }
        : null,
    },
    initialDraft,
  );
  const isHead = currentUser.role === "head";
  // Руководитель снимает только себя и свою команду: остальных блокируем в форме
  const teamQuery = useQuery({
    enabled: isHead && isEditing,
    queryFn: () => listUsers({ pageSize: 200, team: "mine" }),
    queryKey: usersQueryKey("team", { pageSize: 200, team: "mine" }),
  });
  const teamIds = new Set(
    (teamQuery.data?.results ?? []).map((user) => String(user.id)),
  );
  const lockedIds =
    isHead && teamQuery.isSuccess
      ? (editInteraction?.current_responsibles ?? [])
          .map((responsible) => String(responsible.manager.id))
          .filter((id) => id !== String(currentUser.id) && !teamIds.has(id))
      : [];
  const hasSelf = draft.responsibles.some(
    (option) => option.id === String(currentUser.id),
  );
  const canKamAssignSelf =
    isKam &&
    isEditing &&
    editInteraction?.current_responsibles.length === 0 &&
    !hasSelf;
  const [error, setError] = useState<string | null>(null);
  const keyCounter = useRef(0);
  // Организации договоров из последних результатов поиска: выпадушка отдаёт
  // только `{ id, name }`, а в черновик договор ложится вместе с контрагентом.
  const contractOrganizations = useRef(new Map<string, LookupOption>());
  const contractOrganizationId = draft.contract
    ? null
    : (draft.counterparty?.id ?? null);

  async function searchContracts(term: string) {
    const options = await searchRegistryContracts(term, contractOrganizationId);
    for (const option of options) {
      contractOrganizations.current.set(option.id, option.organization);
    }

    return options;
  }

  function assignSelf() {
    dispatch({
      options: [
        ...draft.responsibles,
        {
          id: String(currentUser.id),
          name: currentUser.displayName,
        },
      ],
      type: "set-responsibles",
    });
  }

  function makeKey(prefix: string) {
    keyCounter.current += 1;

    return `${prefix}-${keyCounter.current}`;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!editInteraction) {
        return {
          kind: "create" as const,
          outcome: await runCreationPlan(buildCreationPlan(draft), csrfToken),
        };
      }

      const previousIds = editInteraction.current_responsibles.map(
        (responsible) => responsible.manager.id,
      );
      const nextIds = draft.responsibles.map((option) => Number(option.id));
      const removed = previousIds.filter((id) => !nextIds.includes(id));
      const added = nextIds.filter((id) => !previousIds.includes(id));
      // Сначала добавляем, потом снимаем: взаимодействие не остаётся без КАМа
      // между запросами и не становится на это время видно всем.
      for (const managerId of added) {
        await assignResponsible(editInteraction.id, managerId, csrfToken);
      }
      for (const managerId of removed) {
        await unassignResponsible(editInteraction.id, managerId, csrfToken);
      }
      return {
        kind: "edit" as const,
        changed: added.length > 0 || removed.length > 0,
      };
    },
    onSuccess: (outcome) => {
      if (outcome.kind === "edit") {
        void queryClient.invalidateQueries({
          queryKey: ["interactions", "list"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["processes", "action-instances"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["processes", "workflow-board"],
        });
        if (isHead) {
          void queryClient.invalidateQueries({ queryKey: usersRootKey });
        }
        toast.success(text.edited);
        onUpdated?.();
        return;
      }
      const creationOutcome = outcome.outcome;
      if (creationOutcome.interactionId === null) {
        setError(
          resolveErrorDetail(creationOutcome.error, text.kamHasHead) ??
            text.failed,
        );

        return;
      }

      // Принятые узлы помечаем сразу: повтор отправит только недостающее.
      dispatch({
        createdIds: creationOutcome.createdIds,
        interactionId: creationOutcome.interactionId,
        assignedResponsibleIds: creationOutcome.assignedResponsibleIds,
        type: "mark-created",
      });
      void queryClient.invalidateQueries({
        queryKey: ["interactions", "list"],
      });

      if (creationOutcome.error) {
        if (isResponsibleError(creationOutcome.error)) {
          // Кандидаты устарели: КАМа забрали или он больше не доступен
          void queryClient.invalidateQueries({ queryKey: usersRootKey });
          setError(
            resolveErrorDetail(creationOutcome.error, text.kamHasHead) ??
              text.partial,
          );
          return;
        }
        setError(text.partial);

        return;
      }

      setError(null);
      if (isHead) {
        // Назначенный свободный КАМ вступил в команду — списки пользователей устарели
        void queryClient.invalidateQueries({ queryKey: usersRootKey });
      }
      toast.success(text.created, {
        action: onCreatedAction
          ? {
              label: onCreatedAction.label,
              onClick: () =>
                onCreatedAction.onClick(creationOutcome.interactionId!),
            }
          : undefined,
      });
      onCreated(creationOutcome.interactionId);
    },
    onError: (mutationError) => {
      setError(
        resolveErrorDetail(mutationError, text.kamHasHead) ?? text.failed,
      );
      if (
        mutationError instanceof ApiError &&
        mutationError.code === "kam_has_head"
      ) {
        void queryClient.invalidateQueries({ queryKey: usersRootKey });
      }
    },
  });

  const isRetry = !isEditing && draft.createdInteractionId !== null;
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
            {isEditing ? text.editTitle : text.title}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <fieldset className="space-y-2">
            <legend className="text-muted-foreground text-xs">
              {text.counterparty}
            </legend>
            <div className="flex gap-4 text-sm">
              {(["organization", "b2c_client"] as const).map((kind) => (
                <label className="flex items-center gap-2" key={kind}>
                  <input
                    checked={draft.counterpartyKind === kind}
                    disabled={isEditing || isRetry}
                    name="counterparty-kind"
                    onChange={() =>
                      dispatch({ kind, type: "set-counterparty-kind" })
                    }
                    type="radio"
                  />
                  {kind === "organization"
                    ? text.kindOrganization
                    : text.kindB2C}
                </label>
              ))}
            </div>
            <EntitySelect
              disabled={isEditing || isRetry || draft.contract !== null}
              id="new-interaction-counterparty"
              label={text.counterparty}
              onChange={(option) =>
                dispatch({ option, type: "set-counterparty" })
              }
              placeholder={
                draft.counterpartyKind === "organization"
                  ? text.organizationPlaceholder
                  : text.clientPlaceholder
              }
              queryKey={["catalog", "counterparty", draft.counterpartyKind]}
              search={
                draft.counterpartyKind === "organization"
                  ? searchOrganizations
                  : searchB2CClients
              }
              value={draft.counterparty}
            />
            {/* Реестр загружает только договоры организаций. */}
            {!isEditing && draft.counterpartyKind === "organization" ? (
              <div className="pt-2">
                <p className="text-muted-foreground mb-1 text-xs">
                  {text.contract}
                </p>
                <EntitySelect
                  disabled={isRetry}
                  id="new-interaction-contract"
                  label={text.contract}
                  onChange={(option) =>
                    dispatch({
                      counterparty: option
                        ? (contractOrganizations.current.get(option.id) ?? null)
                        : null,
                      option,
                      type: "set-contract",
                    })
                  }
                  placeholder={text.contractPlaceholder}
                  queryKey={[
                    "interactions",
                    "contracts",
                    "registry",
                    contractOrganizationId,
                  ]}
                  search={searchContracts}
                  value={draft.contract}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {text.contractHint}
                </p>
              </div>
            ) : null}
          </fieldset>

          <div>
            <p className="text-muted-foreground text-xs">{text.responsible}</p>
            {/* При повторе уже назначенных не снять — состав правится редактированием. */}
            {canChooseResponsible ? (
              <div className="mt-1">
                <MultiEntitySelect
                  id="new-interaction-responsible"
                  label={text.responsible}
                  onChange={(options) =>
                    dispatch({ options, type: "set-responsibles" })
                  }
                  placeholder={text.responsiblePlaceholder}
                  queryKey={["users", "managers", currentUser.id]}
                  lockedIds={isRetry ? draft.assignedResponsibleIds : lockedIds}
                  search={searchManagers(
                    currentUser.isSuperuser
                      ? "platform_admin"
                      : currentUser.role,
                    text.joinsYourTeam,
                  )}
                  value={draft.responsibles}
                />
                {isHead && !hasSelf ? (
                  <Button
                    className="mt-1"
                    onClick={assignSelf}
                    size="s"
                    type="button"
                    variant="ghost"
                  >
                    {text.assignSelf}
                  </Button>
                ) : null}
                {draft.responsibles.length > 0 ? (
                  <p className="mt-1 text-sm">
                    {responsibleNames(draft.responsibles)}
                  </p>
                ) : null}
                {lockedIds.length > 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {text.responsibleLocked}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                  {text.responsibleOptional}
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-sm">
                  {responsibleNames(draft.responsibles) || text.responsibleNone}
                </p>
                {canKamAssignSelf ? (
                  <Button
                    className="mt-1"
                    onClick={assignSelf}
                    size="s"
                    type="button"
                    variant="ghost"
                  >
                    {text.assignSelf}
                  </Button>
                ) : null}
                {isKam && hasSelf ? (
                  <span className="text-muted-foreground block text-xs">
                    {text.responsibleIsYou}
                  </span>
                ) : null}
              </div>
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
              disabled={isEditing || isRetry}
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
              disabled={isEditing || isRetry}
              onChange={(event) =>
                dispatch({ isActive: event.target.checked, type: "set-active" })
              }
              type="checkbox"
            />
            {text.active}
          </label>

          <fieldset
            className="space-y-3 border-t pt-4"
            disabled={isEditing || isRetry}
          >
            <div>
              <h3 className="text-sm font-medium">{text.catalogTitle}</h3>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {draft.contract ? text.catalogFromContract : text.catalogHint}
              </p>
            </div>

            {draft.contract ? null : (
              <>
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
                    dispatch({
                      key: makeKey("direction"),
                      type: "add-direction",
                    })
                  }
                  size="m"
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  {text.addDirection}
                </Button>
              </>
            )}
          </fieldset>
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
                : isEditing
                  ? text.save
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
