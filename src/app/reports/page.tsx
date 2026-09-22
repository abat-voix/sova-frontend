import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="reports" />
    </Suspense>
  );
}
