import { SovaShell } from "@/components/sova-shell";
import { TrainingInstructorPage } from "@/components/training/training-instructor-page";

export default async function TrainingInstructorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SovaShell section="trainingInstructors">
      <TrainingInstructorPage instructorId={id} />
    </SovaShell>
  );
}
