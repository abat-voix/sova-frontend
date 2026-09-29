import { SovaShell } from "@/components/sova-shell";
import { TrainingInstructorFormPage } from "@/components/training/training-instructor-form-page";

export default async function TrainingInstructorEditRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SovaShell section="trainingInstructors">
      <TrainingInstructorFormPage instructorId={id} />
    </SovaShell>
  );
}
