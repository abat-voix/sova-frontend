import { IntegrationMappingPage } from "@/components/integrations/integration-mapping-page";
import { SovaShell } from "@/components/sova-shell";

export default async function IntegrationMappingEditRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SovaShell section="integrations">
      <IntegrationMappingPage mappingId={id} />
    </SovaShell>
  );
}
