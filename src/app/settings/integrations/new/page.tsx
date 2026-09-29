import { IntegrationMappingPage } from "@/components/integrations/integration-mapping-page";
import { SovaShell } from "@/components/sova-shell";

export default function IntegrationMappingCreateRoute() {
  return (
    <SovaShell section="integrations">
      <IntegrationMappingPage />
    </SovaShell>
  );
}
