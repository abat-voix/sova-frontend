"use client";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiEndpoints } from "@/lib/api/endpoints";
import { getJson, patchJson, postJson } from "@/lib/api/http";
import { normalizeWorkflowTemplateList } from "@/lib/workflow/workflow-template-list";
import type {
  WorkflowDefinition,
  WorkflowStageDefinition,
  WorkflowTemplate,
  WorkflowValidation,
} from "@/types/workflow-definition";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

function StageNode({
  data,
}: {
  data: { stage: WorkflowStageDefinition; actions: string[] };
}) {
  return (
    <div className="bg-card relative min-w-64 rounded-xl border-2 border-[var(--atmr-accent-primary)] p-3 shadow-lg">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm">{data.stage.name}</strong>
        {data.stage.is_initial ? (
          <span className="text-muted-foreground text-[10px] uppercase">
            Старт
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-1.5">
        {data.actions.length ? (
          data.actions.map((action) => (
            <div
              className="bg-secondary rounded-md px-2 py-1.5 text-xs"
              key={action}
            >
              {action}
            </div>
          ))
        ) : (
          <div className="text-muted-foreground text-xs">Нет действий</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

export function WorkflowTemplatesWorkspace() {
  const { user, csrfToken } = useAuth();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
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

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["workflows"] });
  };

  const createWorkflow = useMutation({
    mutationFn: () =>
      postJson<WorkflowTemplate>(
        apiEndpoints.workflows.workflows.create,
        {
          name: name.trim(),
          code: `workflow-${Date.now()}`,
          audience: "b2b",
          description: "",
        },
        csrfToken,
      ),
    onSuccess: (workflow) => {
      setName("");
      setSelectedId(workflow.id);
      invalidate();
    },
  });

  const addStage = useMutation({
    mutationFn: async () => {
      if (!selectedId || !definitionQuery.data)
        throw new Error("Workflow не выбран");
      const stages = definitionQuery.data.stages;
      const previousFinal = stages.find((stage) => stage.is_final);
      if (previousFinal) {
        await patchJson(
          `/api/workflows/workflow-stages/${previousFinal.id}/`,
          { is_final: false },
          csrfToken,
        );
      }
      return postJson<WorkflowStageDefinition>(
        apiEndpoints.workflows.stages.create,
        {
          name: `Этап ${stages.length + 1}`,
          sort_order: stages.length + 1,
          workflow: selectedId,
          is_initial: stages.length === 0,
          is_final: true,
        },
        csrfToken,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workflows", "definition", selectedId],
      });
      invalidate();
    },
  });

  const addAction = useMutation({
    mutationFn: () => {
      if (!selectedStageId) throw new Error("Выберите этап");
      const count =
        definitionQuery.data?.actions.filter(
          (item) => item.stage.id === selectedStageId,
        ).length ?? 0;
      return postJson(
        apiEndpoints.workflows.actions.create,
        {
          name: `Действие ${count + 1}`,
          description: "",
          sort_order: count + 1,
          stage: selectedStageId,
          is_optional: false,
          is_trigger_only: false,
          is_active: true,
        },
        csrfToken,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workflows", "definition", selectedId],
      });
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
    mutationFn: () =>
      postJson<WorkflowTemplate>(
        apiEndpoints.workflows.workflows.publish(selectedId!),
        {},
        csrfToken,
      ),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({
        queryKey: ["workflows", "definition", selectedId],
      });
    },
  });

  const connectTransition = useMutation({
    mutationFn: ({ source, target }: { source: string; target: string }) =>
      postJson(
        apiEndpoints.workflows.stageTransitions.create,
        { from_stage: source, to_stage: target, is_active: true },
        csrfToken,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workflows", "definition", selectedId],
      });
    },
  });

  const selectedWorkflow = listQuery.data?.find(
    (item) => item.id === selectedId,
  );
  const canEdit = Boolean(
    selectedWorkflow &&
    (user?.role === "platform_admin" ||
      selectedWorkflow.created_by?.id === user?.id),
  );

  const onConnect = useCallback(
    ({ source, target }: { source: string | null; target: string | null }) => {
      if (!canEdit || !source || !target || source === target) return;
      connectTransition.mutate({ source, target });
    },
    [canEdit, connectTransition],
  );

  const nodes = useMemo<Node[]>(() => {
    const definition = definitionQuery.data;
    if (!definition) return [];
    return definition.stages.map((stage, index) => ({
      id: stage.id,
      position: { x: (index % 3) * 310, y: Math.floor(index / 3) * 230 },
      data: {
        stage,
        actions: definition.actions
          .filter((action) => action.stage.id === stage.id)
          .map((action) => action.name),
      },
      type: "stage",
    }));
  }, [definitionQuery.data]);

  const edges = useMemo<Edge[]>(
    () =>
      (definitionQuery.data?.stage_transitions ?? []).map((transition) => ({
        id: transition.id,
        source: transition.from_stage.id,
        target: transition.to_stage.id,
        animated: transition.is_active,
      })),
    [definitionQuery.data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {t("workflowTemplates")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          {t("workflowTemplatesDescription")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="bg-card rounded-xl border p-4">
          <div className="mb-4 flex gap-2">
            <input
              className="bg-background min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
              onChange={(event) => setName(event.target.value)}
              placeholder="Название workflow"
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
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Plus aria-hidden="true" className="size-4" />
              )}
            </Button>
          </div>
          <div className="space-y-2">
            {(listQuery.data ?? []).map((workflow) => (
              <button
                className={`hover:bg-secondary w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${selectedId === workflow.id ? "border-primary bg-secondary" : ""}`}
                key={workflow.id}
                onClick={() => {
                  setSelectedId(workflow.id);
                  setSelectedStageId("");
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

        <section className="bg-card min-h-[36rem] overflow-hidden rounded-xl border">
          {definitionQuery.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b p-4">
                <strong className="mr-auto">
                  {definitionQuery.data.workflow.name}
                </strong>
                {canEdit ? (
                  <>
                    <select
                      className="bg-background rounded-md border px-2 py-2 text-sm"
                      onChange={(event) =>
                        setSelectedStageId(event.target.value)
                      }
                      value={selectedStageId}
                    >
                      <option value="">Этап для действия</option>
                      {definitionQuery.data.stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      colorScheme="neutral"
                      disabled={addStage.isPending}
                      onClick={() => addStage.mutate()}
                      size="s"
                      type="button"
                      variant="outline"
                    >
                      {addStage.isPending ? (
                        <Loader2
                          aria-hidden="true"
                          className="size-3.5 animate-spin"
                        />
                      ) : null}
                      {addStage.isPending ? "Добавляем…" : "Добавить этап"}
                    </Button>
                    <Button
                      colorScheme="neutral"
                      disabled={!selectedStageId || addAction.isPending}
                      onClick={() => addAction.mutate()}
                      size="s"
                      type="button"
                      variant="outline"
                    >
                      {addAction.isPending ? (
                        <Loader2
                          aria-hidden="true"
                          className="size-3.5 animate-spin"
                        />
                      ) : null}
                      {addAction.isPending ? "Добавляем…" : "Добавить действие"}
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
                        <Loader2
                          aria-hidden="true"
                          className="size-3.5 animate-spin"
                        />
                      ) : null}
                      {validate.isPending ? "Проверяем…" : "Проверить"}
                    </Button>
                    <Button
                      colorScheme="accent"
                      disabled={
                        definitionQuery.data.workflow.is_active ||
                        publish.isPending
                      }
                      onClick={() => publish.mutate()}
                      size="s"
                      type="button"
                      variant="primary"
                    >
                      {publish.isPending ? (
                        <Loader2
                          aria-hidden="true"
                          className="size-3.5 animate-spin"
                        />
                      ) : null}
                      {publish.isPending ? "Публикуем…" : "Опубликовать"}
                    </Button>
                  </>
                ) : null}
              </div>
              {createWorkflow.error ||
              addStage.error ||
              addAction.error ||
              validate.error ||
              publish.error ||
              connectTransition.error ? (
                <div className="border-b bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  Не удалось выполнить операцию. Проверьте данные и повторите
                  попытку.
                </div>
              ) : null}
              {connectTransition.isPending ? (
                <div className="text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-xs">
                  <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                  Сохраняем переход…
                </div>
              ) : null}
              {validate.data && !validate.data.valid ? (
                <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-800">
                  {validate.data.errors.map((error) => (
                    <div key={error.code}>{error.message}</div>
                  ))}
                </div>
              ) : null}
              <div className="workflow-editor h-[31rem]">
                <ReactFlow
                  edges={edges}
                  fitView
                  nodes={nodes}
                  nodeTypes={nodeTypes}
                  nodesConnectable={canEdit}
                  nodesDraggable={canEdit}
                  onConnect={onConnect}
                >
                  <Background />
                  <MiniMap />
                  <Controls />
                </ReactFlow>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex h-full min-h-[36rem] items-center justify-center p-8 text-center">
              Выберите workflow или создайте новый черновик.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
