import { SovaShell } from "@/components/sova-shell";
import { LearnerPage } from "@/components/training/learner-page";

export default async function LearnerRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SovaShell section="learners">
      <LearnerPage learnerId={id} />
    </SovaShell>
  );
}
