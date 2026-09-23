import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="reports" />
    </Suspense>
  );
}
