"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Settings2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  WorkflowInspector,
  type WorkflowEditorCommand,
  type WorkflowSelection,
} from "@/components/workflows/workflow-inspector";
import { apiEndpoints } from "@/lib/api/endpoints";
import {
  ApiError,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "@/lib/api/http";
import { normalizeWorkflowTemplateList } from "@/lib/workflow/workflow-template-list";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  WorkflowActionDefinition,
  WorkflowDefinition,
  WorkflowStageDefinition,
  WorkflowTemplate,
  WorkflowValidation,
} from "@/types/workflow-definition";

type StageNodeData = {
  actions: WorkflowActionDefinition[];
  canEdit: boolean;
  onAddAction: (stageId: string) => void;
  onSelectAction: (actionId: string) => void;
  selectedActionId?: string;
  selectedStage: boolean;
  stage: WorkflowStageDefinition;
};

type StageNodeType = Node<StageNodeData, "stage">;

function StageNode({ data }: NodeProps<StageNodeType>) {
  return (
    <div
      className={`bg-card relative h-full min-w-64 rounded-xl border-2 p-3 shadow-lg transition-shadow ${
        data.selectedStage
          ? "border-[var(--atmr-accent-primary)] ring-2 ring-[var(--atmr-background-accent-soft)]"
          : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm">{data.stage.name}</strong>
        <div className="flex gap-1">
          {data.stage.is_initial ? (
            <span className="bg-secondary rounded px-1.5 py-0.5 text-[10px] uppercase">
              Старт
            </span>
          ) : null}
          {data.stage.is_final ? (
            <span className="bg-secondary rounded px-1.5 py-0.5 text-[10px] uppercase">
              Финиш
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-muted-foreground mt-1 text-[11px]">
        {data.stage.type} · порядок {data.stage.sort_order}
      </p>
      <div className="mt-3 space-y-1.5">
        {data.actions.length ? (
          data.actions.map((action) => (
            <button
              className={`nodrag hover:bg-secondary w-full cursor-pointer rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                data.selectedActionId === action.id
                  ? "border-[var(--atmr-accent-primary)] bg-[var(--atmr-background-accent-soft)]"
                  : "bg-secondary/50"
              }`}
              key={action.id}
              onClick={(event) => {
                event.stopPropagation();
                data.onSelectAction(action.id);
              }}
              type="button"
            >
              <span className="block font-medium">{action.name}</span>
              <span className="text-muted-foreground mt-0.5 block">
                {action.is_trigger_only ? "по переходу" : "автостарт"}
                {action.is_optional ? " · необязательное" : ""}
              </span>
            </button>
          ))
        ) : (
          <div className="text-muted-foreground text-xs">Нет действий</div>
        )}
        {data.canEdit ? (
          <button
            className="nodrag text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              data.onAddAction(data.stage.id);
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5" /> Добавить действие
          </button>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

function errorMessage(error: Error | null) {
  if (!error) return null;
  if (error instanceof ApiError) {
    const fieldMessage = Object.entries(error.fieldErrors)
      .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
      .join("; ");
    return fieldMessage || error.detail || "Операция отклонена сервером.";
  }
  return "Не удалось выполнить операцию. Проверьте соединение и повторите попытку.";
}

export function WorkflowTemplatesWorkspace() {
  const { user, csrfToken } = useAuth();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<WorkflowSelection>({
    kind: "workflow",
  });
  const [name, setName] = useState("");

  const listQuery = useQuery({
    queryKey: ["workflows", "templates"],
    queryFn: () =>
      getJson<WorkflowTemplate[] | { results?: WorkflowTemplate[] }>(
        apiEndpoints.workflows.workflows.list,
      ).then(normalizeWorkflowTemplateList),
  });

  const definitionQuery = useQuery({
    enabled: Boolean(selectedId),
    queryKey: ["workflows", "definition", selectedId],
    queryFn: () =>
      getJson<WorkflowDefinition>(
        apiEndpoints.workflows.workflows.definition(selectedId!),
      ),
  });

  const refreshDefinition = () => {
    void queryClient.invalidateQueries({
      queryKey: ["workflows", "definition", selectedId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["workflows", "templates"],
    });
  };

  const createWorkflow = useMutation({
    mutationFn: () =>
      postJson<WorkflowTemplate>(
        apiEndpoints.workflows.workflows.create,
        {
          audience: "b2b",
          code: `workflow-${Date.now()}`,
          description: "",
          name: name.trim(),
        },
        csrfToken,
      ),
    onSuccess: (workflow) => {
      setName("");
      setSelectedId(workflow.id);
      setSelection({ kind: "workflow" });
      refreshDefinition();
    },
  });

  const command = useMutation({
    mutationFn: ({ body, method, url }: WorkflowEditorCommand) => {
      if (method === "delete") return deleteJson(url, csrfToken);
      if (method === "patch") return patchJson(url, body ?? {}, csrfToken);
      return postJson(url, body ?? {}, csrfToken);
    },
    onSuccess: refreshDefinition,
  });

  const addStage = useMutation({
    mutationFn: async () => {
      if (!selectedId || !definitionQuery.data) {
        throw new Error("Workflow не выбран");
      }
      const stages = definitionQuery.data.stages;
      const previousFinal = stages.find((stage) => stage.is_final);
      const stage = await postJson<WorkflowStageDefinition>(
        apiEndpoints.workflows.stages.create,
        {
          description: "",
          is_active: true,
          is_final: true,
          is_initial: stages.length === 0,
          is_optional: false,
          name: `Этап ${stages.length + 1}`,
          sort_order: Math.max(0, ...stages.map((item) => item.sort_order)) + 1,
          type: "interaction",
          workflow: selectedId,
        },
        csrfToken,
      );
      if (previousFinal) {
        await patchJson(
          apiEndpoints.workflows.stages.detail(previousFinal.id),
          { is_final: false },
          csrfToken,
        );
      }
      return stage;
    },
    onSuccess: (stage) => {
      setSelection({ id: stage.id, kind: "stage" });
      refreshDefinition();
    },
  });

  const addAction = useMutation({
    mutationFn: (stageId: string) => {
      const stageActions =
        definitionQuery.data?.actions.filter(
          (item) => item.stage.id === stageId,
        ) ?? [];
      return postJson<WorkflowActionDefinition>(
        apiEndpoints.workflows.actions.create,
        {
          description: "",
          is_active: true,
          is_optional: false,
          is_trigger_only: false,
          name: `Действие ${stageActions.length + 1}`,
          sort_order:
            Math.max(0, ...stageActions.map((item) => item.sort_order)) + 1,
          stage: stageId,
        },
        csrfToken,
      );
    },
    onSuccess: (action) => {
      setSelection({ id: action.id, kind: "action" });
      refreshDefinition();
    },
  });

  const validate = useMutation({
    mutationFn: () =>
      postJson<WorkflowValidation>(
        apiEndpoints.workflows.workflows.validate(selectedId!),
        {},
        csrfToken,
      ),
  });
  const publish = useMutation({
    mutationFn: (active: boolean) =>
      postJson<WorkflowTemplate>(
        active
          ? apiEndpoints.workflows.workflows.unpublish(selectedId!)
          : apiEndpoints.workflows.workflows.publish(selectedId!),
        {},
        csrfToken,
      ),
    onSuccess: refreshDefinition,
  });
  const connectTransition = useMutation({
    mutationFn: ({ source, target }: { source: string; target: string }) =>
      postJson(
        apiEndpoints.workflows.stageTransitions.create,
        { from_stage: source, is_active: true, to_stage: target },
        csrfToken,
      ),
    onSuccess: refreshDefinition,
  });
  const updateStageLayout = useMutation({
    mutationFn: ({
      patch,
      stageId,
    }: {
      stageId: string;
      patch: Partial<
        Pick<WorkflowStageDefinition, "position_x" | "position_y">
      >;
    }) =>
      patchJson(
        apiEndpoints.workflows.stages.detail(stageId),
        patch,
        csrfToken,
      ),
    onSuccess: refreshDefinition,
  });

  const selectedWorkflow = listQuery.data?.find(
    (item) => item.id === selectedId,
  );
  const canEdit = Boolean(
    selectedWorkflow &&
    (user?.role === "platform_admin" ||
      selectedWorkflow.created_by?.id === user?.id),
  );
  const selectedStageId =
    selection.kind === "stage"
      ? selection.id
      : selection.kind === "action"
        ? definitionQuery.data?.actions.find((item) => item.id === selection.id)
            ?.stage.id
        : undefined;
  const selectedActionId =
    selection.kind === "action" ? selection.id : undefined;

  const onConnect = useCallback(
    ({ source, target }: { source: string | null; target: string | null }) => {
      if (!canEdit || !source || !target || source === target) return;
      connectTransition.mutate({ source, target });
    },
    [canEdit, connectTransition],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: StageNodeType) => {
      if (!canEdit) return;
      updateStageLayout.mutate({
        patch: { position_x: node.position.x, position_y: node.position.y },
        stageId: node.id,
      });
    },
    [canEdit, updateStageLayout],
  );

  const nodes = useMemo<StageNodeType[]>(() => {
    const definition = definitionQuery.data;
    if (!definition) return [];
    return [...definition.stages]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((stage, index) => ({
        data: {
          actions: definition.actions
            .filter((action) => action.stage.id === stage.id)
            .sort((a, b) => a.sort_order - b.sort_order),
          canEdit,
          onAddAction: (stageId: string) => addAction.mutate(stageId),
          onSelectAction: (id: string) => setSelection({ id, kind: "action" }),
          selectedActionId,
          selectedStage: selectedStageId === stage.id,
          stage,
        },
        id: stage.id,
        position: {
          x: stage.position_x ?? (index % 3) * 310,
          y: stage.position_y ?? Math.floor(index / 3) * 280,
        },
        style:
          stage.width != null || stage.height != null
            ? {
                height: stage.height ?? undefined,
                width: stage.width ?? undefined,
              }
            : undefined,
        type: "stage",
      }));
  }, [
    addAction,
    canEdit,
    definitionQuery.data,
    selectedActionId,
    selectedStageId,
  ]);

  const edges = useMemo<Edge[]>(
    () =>
      (definitionQuery.data?.stage_transitions ?? []).map((transition) => ({
        animated: transition.is_active,
        id: transition.id,
        label: transition.is_active ? undefined : "Выключен",
        source: transition.from_stage.id,
        style: transition.is_active
          ? undefined
          : { opacity: 0.45, strokeDasharray: "5 5" },
        target: transition.to_stage.id,
      })),
    [definitionQuery.data],
  );

  const operationError =
    createWorkflow.error ??
    addStage.error ??
    addAction.error ??
    validate.error ??
    publish.error ??
    connectTransition.error ??
    command.error;
  const pending =
    addStage.isPending ||
    addAction.isPending ||
    connectTransition.isPending ||
    command.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {t("workflowTemplates")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-base leading-7">
          Соберите полный workflow: настройте этапы и действия, исходы,
          зависимости, переходы и доступные возможности.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="bg-card rounded-xl border p-4">
          <div className="mb-4 flex gap-2">
            <input
              aria-label="Название нового workflow"
              className="bg-background min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
              onChange={(event) => setName(event.target.value)}
              placeholder="Новый workflow"
              value={name}
            />
            <Button
              aria-label="Создать workflow"
              colorScheme="accent"
              disabled={!name.trim() || createWorkflow.isPending}
              onClick={() => createWorkflow.mutate()}
              size="icon"
              type="button"
              variant="primary"
            >
              {createWorkflow.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
          </div>
          {listQuery.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" /> Загружаем…
            </div>
          ) : null}
          <div className="space-y-2">
            {(listQuery.data ?? []).map((workflow) => (
              <button
                className={`hover:bg-secondary w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${selectedId === workflow.id ? "bg-secondary border-[var(--atmr-accent-primary)]" : ""}`}
                key={workflow.id}
                onClick={() => {
                  setSelectedId(workflow.id);
                  setSelection({ kind: "workflow" });
                  validate.reset();
                }}
                type="button"
              >
                <span className="block truncate text-sm font-medium">
                  {workflow.name}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  {workflow.is_active ? "Опубликован" : "Черновик"} ·{" "}
                  {workflow.stages_count} этапов
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="bg-card min-h-[42rem] overflow-hidden rounded-xl border">
          {selectedId && definitionQuery.isPending ? (
            <div className="text-muted-foreground flex min-h-[42rem] items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin" /> Загружаем workflow…
            </div>
          ) : definitionQuery.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b p-4">
                <button
                  className="mr-auto flex cursor-pointer items-center gap-2 text-left"
                  onClick={() => setSelection({ kind: "workflow" })}
                  type="button"
                >
                  <strong>{definitionQuery.data.workflow.name}</strong>
                  <Settings2 className="text-muted-foreground size-4" />
                </button>
                {canEdit ? (
                  <>
                    <Button
                      colorScheme="neutral"
                      disabled={pending}
                      onClick={() => addStage.mutate()}
                      size="s"
                      type="button"
                      variant="outline"
                    >
                      {addStage.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Этап
                    </Button>
                    <Button
                      colorScheme="neutral"
                      disabled={validate.isPending}
                      onClick={() => validate.mutate()}
                      size="s"
                      type="button"
                      variant="outline"
                    >
                      {validate.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      {validate.isPending ? "Проверяем…" : "Проверить"}
                    </Button>
                    <Button
                      colorScheme={
                        definitionQuery.data.workflow.is_active
                          ? "neutral"
                          : "accent"
                      }
                      disabled={publish.isPending}
                      onClick={() =>
                        publish.mutate(definitionQuery.data!.workflow.is_active)
                      }
                      size="s"
                      type="button"
                      variant={
                        definitionQuery.data.workflow.is_active
                          ? "outline"
                          : "primary"
                      }
                    >
                      {publish.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      {publish.isPending
                        ? "Сохраняем…"
                        : definitionQuery.data.workflow.is_active
                          ? "Вернуть в черновик"
                          : "Опубликовать"}
                    </Button>
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Только просмотр
                  </span>
                )}
              </div>
              {operationError ? (
                <div className="border-b bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {errorMessage(operationError)}
                </div>
              ) : null}
              {pending ? (
                <div className="text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-xs">
                  <Loader2 className="size-3 animate-spin" /> Сохраняем
                  изменения…
                </div>
              ) : null}
              {validate.data ? (
                <div
                  className={`border-b px-4 py-3 text-sm ${validate.data.valid ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "bg-red-500/10 text-red-800 dark:text-red-300"}`}
                >
                  {validate.data.valid
                    ? "Workflow готов к публикации."
                    : validate.data.errors.map((error) => (
                        <div key={error.code}>{error.message}</div>
                      ))}
                </div>
              ) : null}
              <div
                className="grid min-h-[36rem] xl:h-[36rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
                data-testid="workflow-editor-frame"
              >
                <div className="workflow-editor h-[36rem] min-w-0 xl:h-auto">
                  <ReactFlow
                    edges={edges}
                    fitView
                    nodes={nodes}
                    nodeTypes={nodeTypes}
                    nodesConnectable={canEdit && !pending}
                    nodesDraggable={canEdit && !pending}
                    onConnect={onConnect}
                    onEdgeClick={(_, edge) =>
                      setSelection({
                        id: edge.id,
                        kind: "stage-transition",
                      })
                    }
                    onNodeClick={(_, node) =>
                      setSelection({ id: node.id, kind: "stage" })
                    }
                    onNodeDragStop={onNodeDragStop}
                  >
                    <Background />
                    <Controls />
                  </ReactFlow>
                </div>
                <WorkflowInspector
                  canEdit={canEdit}
                  definition={definitionQuery.data}
                  isPending={command.isPending}
                  onCommand={(nextCommand) => command.mutateAsync(nextCommand)}
                  onSelectionChange={setSelection}
                  selection={selection}
                />
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex h-full min-h-[42rem] items-center justify-center p-8 text-center">
              Выберите workflow или создайте новый черновик.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
