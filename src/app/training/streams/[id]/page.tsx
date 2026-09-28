import { SovaShell } from "@/components/sova-shell";
import { TrainingStreamPage } from "@/components/training/training-stream-page";

export default async function TrainingStreamRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SovaShell section="trainingStreams">
      <TrainingStreamPage streamId={id} />
    </SovaShell>
  );
}
