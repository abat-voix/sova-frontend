import { Suspense } from "react";

import { ReportsPage } from "@/components/reports/reports-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportsPage />
    </Suspense>
  );
}
