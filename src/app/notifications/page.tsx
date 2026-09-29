import { Suspense } from "react";

import { SovaShell } from "@/components/sova-shell";

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <SovaShell section="notifications" />
    </Suspense>
  );
}
