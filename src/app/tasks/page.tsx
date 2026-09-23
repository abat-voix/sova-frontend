import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="myTasks" />
    </Suspense>
  );
}
