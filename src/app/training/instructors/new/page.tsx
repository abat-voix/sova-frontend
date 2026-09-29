import { SovaShell } from "@/components/sova-shell";
import { TrainingInstructorFormPage } from "@/components/training/training-instructor-form-page";

export default function TrainingInstructorCreateRoute() {
  return (
    <SovaShell section="trainingInstructors">
      <TrainingInstructorFormPage />
    </SovaShell>
  );
}
