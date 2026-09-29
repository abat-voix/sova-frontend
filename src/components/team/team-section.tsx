"use client";

import { AdminTeamsWorkspace } from "@/components/team/admin-teams-workspace";
import { HeadTeamWorkspace } from "@/components/team/head-team-workspace";
import type { AuthenticatedUser } from "@/providers/auth-provider";

/**
 * Раздел «Команда»: руководитель ведёт свою команду, администратор — команды
 * всех руководителей. Доступ проверяет `crm-shell.tsx`, КАМ сюда не попадает.
 */
export function TeamSection({
  csrfToken,
  user,
}: {
  csrfToken: string;
  user: AuthenticatedUser;
}) {
  if (user.isSuperuser || user.role === "platform_admin")
    return <AdminTeamsWorkspace csrfToken={csrfToken} />;
  return <HeadTeamWorkspace csrfToken={csrfToken} />;
}
