"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { IntegrationMappingEditor } from "@/components/integrations/integration-mapping-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  createIntegrationMapping,
  deleteIntegrationMapping,
  getIntegrationEntities,
  getIntegrationMapping,
  getIntegrationMappings,
  getIntegrationSystems,
  integrationMappingsQueryKey,
  previewIntegrationMapping,
  updateIntegrationMapping,
} from "@/lib/api/integrations/integrations";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreateIntegrationMappingDto,
  IntegrationMapping,
} from "@/types/integration";

function readableError(error: unknown) {
  if (error instanceof ApiError) {
    const fields = Object.values(error.fieldErrors).flat().join(" ");
    return fields || error.detail || "Операция отклонена сервером.";
  }
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить операцию.";
}

const tableLabels = {
  empty: "Mappings пока нет. Создайте первую конфигурацию.",
  error: "Не удалось загрузить mappings.",
  loading: "Загружаем mappings…",
  retry: "Повторить",
  sortAscending: "Сортировать по возрастанию",
  sortDescending: "Сортировать по убыванию",
  sortNone: "Сбросить сортировку",
};

export function IntegrationsWorkspace() {
  const { csrfToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const mappings = useQuery({
    queryKey: integrationMappingsQueryKey,
    queryFn: getIntegrationMappings,
  });
  const entities = useQuery({
    queryKey: ["integrations", "entities"],
    queryFn: getIntegrationEntities,
  });
  const systems = useQuery({
    queryKey: ["integrations", "systems"],
    queryFn: getIntegrationSystems,
  });
  const selected = useQuery({
    enabled: Boolean(selectedId),
    queryKey: ["integrations", "mappings", selectedId],
    queryFn: () => getIntegrationMapping(selectedId!),
  });

  async function refresh(id?: string) {
    await queryClient.invalidateQueries({
      queryKey: integrationMappingsQueryKey,
    });
    if (id)
      await queryClient.invalidateQueries({
        queryKey: ["integrations", "mappings", id],
      });
  }

  const save = useMutation({
    mutationFn: async (payload: CreateIntegrationMappingDto) =>
      selectedId
        ? updateIntegrationMapping(selectedId, payload, csrfToken)
        : createIntegrationMapping(payload, csrfToken),
    onSuccess: async (mapping) => {
      await refresh(mapping.id);
      setIsCreating(false);
      setSelectedId(mapping.id);
      toast.success("Mapping сохранён.");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteIntegrationMapping(id, csrfToken),
    onSuccess: async (_, id) => {
      if (selectedId === id) setSelectedId(null);
      await refresh(id);
      toast.success("Mapping удалён.");
    },
    onError: (error) => toast.error(readableError(error)),
  });
  const toggle = useMutation({
    mutationFn: (mapping: IntegrationMapping) =>
      updateIntegrationMapping(
        mapping.id,
        { isActive: !mapping.isActive },
        csrfToken,
      ),
    onSuccess: (mapping) => refresh(mapping.id),
    onError: (error) => toast.error(readableError(error)),
  });
  const copy = useMutation({
    mutationFn: (mapping: IntegrationMapping) =>
      createIntegrationMapping(
        {
          name: `${mapping.name} — копия`,
          system: mapping.system,
          eventType: mapping.eventType,
          direction: mapping.direction,
          entity: mapping.entity,
          isActive: false,
          rules: mapping.rules.map((rule) => ({ ...rule })),
        },
        csrfToken,
      ),
    onSuccess: async (mapping) => {
      await refresh(mapping.id);
      setSelectedId(mapping.id);
      toast.success("Копия создана.");
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const columns: DataTableColumn<IntegrationMapping>[] = [
    {
      name: "name",
      title: "Название",
      width: "22%",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-muted-foreground text-xs">{row.id}</p>
        </div>
      ),
    },
    {
      name: "system",
      title: "Система",
      render: (row) => row.system.toUpperCase(),
    },
    {
      name: "direction",
      title: "Направление",
      render: (row) =>
        row.direction === "incoming" ? "Входящее" : "Исходящее",
    },
    {
      name: "event",
      title: "event_type",
      render: (row) => <code className="text-xs">{row.eventType}</code>,
    },
    {
      name: "entity",
      title: "Сущность CRM",
      render: (row) =>
        entities.data?.find((entity) => entity.code === row.entity)?.label ??
        row.entity,
    },
    { name: "version", title: "Версия", render: (row) => `v${row.version}` },
    {
      name: "active",
      title: "Статус",
      render: (row) => (
        <Badge variant={row.isActive ? "secondary" : "neutral"}>
          {row.isActive ? "Активен" : "Черновик"}
        </Badge>
      ),
    },
    {
      name: "updated",
      title: "Изменён",
      render: (row) =>
        new Date(row.updatedAt).toLocaleString("ru-RU", {
          dateStyle: "short",
          timeStyle: "short",
        }),
    },
    {
      name: "actions",
      title: "Действия",
      align: "right",
      render: (row) => (
        <div
          className="flex justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            aria-label={`Открыть ${row.name}`}
            colorScheme="neutral"
            onClick={() => {
              setIsCreating(false);
              setSelectedId(row.id);
            }}
            size="icon"
            title="Открыть"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label={`Копировать ${row.name}`}
            colorScheme="neutral"
            onClick={() => copy.mutate(row)}
            size="icon"
            title="Копировать"
            type="button"
            variant="ghost"
          >
            <Copy className="size-4" />
          </Button>
          <Button
            aria-label={`${row.isActive ? "Выключить" : "Включить"} ${row.name}`}
            colorScheme="neutral"
            onClick={() => toggle.mutate(row)}
            size="icon"
            title={row.isActive ? "Выключить" : "Включить"}
            type="button"
            variant="ghost"
          >
            <Power className="size-4" />
          </Button>
          <Button
            aria-label={`Удалить ${row.name}`}
            colorScheme="neutral"
            onClick={() => {
              if (window.confirm(`Удалить mapping «${row.name}»?`))
                remove.mutate(row.id);
            }}
            size="icon"
            title="Удалить"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const catalogLoading = entities.isLoading || systems.isLoading;
  const catalogError = entities.isError || systems.isError;
  const editorOpen = isCreating || Boolean(selectedId);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
            Интеграции
          </h1>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Связывайте payload LMS и CMS с полями CRM, проверяйте преобразование
            и управляйте версиями.
          </p>
        </div>
        <Button
          disabled={catalogLoading || catalogError}
          onClick={() => {
            setSelectedId(null);
            setIsCreating(true);
          }}
          size="m"
          type="button"
        >
          <Plus className="size-4" />
          Создать mapping
        </Button>
      </header>

      {catalogLoading ? (
        <div
          className="bg-card animate-pulse space-y-3 rounded-xl border p-5"
          aria-label="Загрузка каталога полей"
        >
          <div className="bg-secondary h-5 w-48 rounded" />
          <div className="bg-secondary h-10 rounded" />
          <div className="bg-secondary h-10 rounded" />
        </div>
      ) : null}
      {catalogError ? (
        <div
          className="border-destructive/30 bg-destructive/5 rounded-xl border p-5"
          role="alert"
        >
          <h2 className="font-medium">
            Не удалось загрузить каталог интеграций
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Поля сериализаторов и список систем недоступны. Редактирование
            временно отключено.
          </p>
          <Button
            className="mt-3"
            colorScheme="neutral"
            onClick={() => {
              void entities.refetch();
              void systems.refetch();
            }}
            size="m"
            type="button"
            variant="outline"
          >
            Повторить
          </Button>
        </div>
      ) : null}

      {editorOpen && !catalogLoading && !catalogError ? (
        selectedId && selected.isLoading ? (
          <div className="bg-card h-64 animate-pulse rounded-xl border" />
        ) : selectedId && selected.isError ? (
          <div
            className="border-destructive/30 rounded-xl border p-5"
            role="alert"
          >
            Не удалось загрузить выбранный mapping.
          </div>
        ) : (
          <IntegrationMappingEditor
            entities={entities.data ?? []}
            isSaving={save.isPending}
            mapping={selectedId ? (selected.data ?? null) : null}
            onCancel={() => {
              setSelectedId(null);
              setIsCreating(false);
            }}
            onPreview={async (payload) => {
              try {
                return await previewIntegrationMapping(payload, csrfToken);
              } catch (error) {
                throw new Error(readableError(error));
              }
            }}
            onSave={async (payload) => {
              try {
                await save.mutateAsync(payload);
              } catch (error) {
                throw new Error(readableError(error));
              }
            }}
            systems={systems.data ?? []}
          />
        )
      ) : null}

      <DataTable
        caption="Mappings интеграций"
        columns={columns}
        getRowId={(row) => row.id}
        isError={mappings.isError}
        isLoading={mappings.isLoading}
        labels={tableLabels}
        onRetry={() => void mappings.refetch()}
        onRowClick={(row) => {
          setIsCreating(false);
          setSelectedId(row.id);
        }}
        rows={mappings.data ?? []}
        selectedRowId={selectedId}
      />
    </div>
  );
}
