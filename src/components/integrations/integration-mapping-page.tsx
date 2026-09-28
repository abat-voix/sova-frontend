"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { IntegrationMappingEditor } from "@/components/integrations/integration-mapping-editor";
import { readableError } from "@/components/integrations/readable-error";
import { BackLink } from "@/components/training/back-link";
import {
  createIntegrationMapping,
  getIntegrationEntities,
  getIntegrationMapping,
  getIntegrationSystems,
  integrationMappingsQueryKey,
  integrationsHref,
  previewIntegrationMapping,
  updateIntegrationMapping,
} from "@/lib/api/integrations/integrations";
import { useAuth } from "@/providers/auth-provider";
import type { CreateIntegrationMappingDto } from "@/types/integration";

/** Страница создания (без mappingId) или редактирования mapping; после сохранения — возврат к списку. */
export function IntegrationMappingPage({ mappingId }: { mappingId?: string }) {
  const { csrfToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const entities = useQuery({
    queryKey: ["integrations", "entities"],
    queryFn: getIntegrationEntities,
  });
  const systems = useQuery({
    queryKey: ["integrations", "systems"],
    queryFn: getIntegrationSystems,
  });
  const mapping = useQuery({
    enabled: mappingId !== undefined,
    queryKey: ["integrations", "mappings", mappingId],
    queryFn: () => getIntegrationMapping(mappingId as string),
  });

  const save = useMutation({
    mutationFn: (payload: CreateIntegrationMappingDto) =>
      mappingId
        ? updateIntegrationMapping(mappingId, payload, csrfToken)
        : createIntegrationMapping(payload, csrfToken),
    onSuccess: async (saved) => {
      queryClient.setQueryData(["integrations", "mappings", saved.id], saved);
      await queryClient.invalidateQueries({
        queryKey: integrationMappingsQueryKey,
        exact: true,
      });
      toast.success(mappingId ? "Mapping сохранён." : "Mapping создан.");
      router.push(integrationsHref);
    },
  });

  const isLoading =
    entities.isLoading ||
    systems.isLoading ||
    (mappingId !== undefined && mapping.isLoading);
  const isError =
    entities.isError ||
    systems.isError ||
    (mappingId !== undefined && mapping.isError);

  return (
    <div className="space-y-4">
      <BackLink href={integrationsHref} label="Все mappings" />
      {isError ? (
        <div
          className="border-destructive/30 bg-destructive/5 rounded-xl border p-5"
          role="alert"
        >
          {mappingId
            ? "Не удалось загрузить mapping."
            : "Не удалось загрузить каталог интеграций."}
        </div>
      ) : isLoading ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Загружаем mapping…
        </p>
      ) : (
        <IntegrationMappingEditor
          entities={entities.data ?? []}
          isSaving={save.isPending}
          mapping={mapping.data ?? null}
          onCancel={() => router.push(integrationsHref)}
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
      )}
    </div>
  );
}
