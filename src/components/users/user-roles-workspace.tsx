"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/http";
import { listUsers, usersQueryKey, usersRootKey } from "@/lib/api/users/team";
import { getSystemRoles, setUserRole } from "@/lib/api/users/users";
import { useAuth, type SystemRole } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { SovaUser, SovaUserShort } from "@/types/user";

type UserRole = SystemRole | null;

const pageSize = 20;

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const fields = Object.values(error.fieldErrors).flat().join(" ");
    return fields || error.detail || fallback;
  }
  return fallback;
}

export function UserRolesWorkspace() {
  const { csrfToken, user } = useAuth();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DataTableSort | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<number, UserRole>>({});
  const [confirmation, setConfirmation] = useState<{
    user: SovaUser;
    role: UserRole;
  } | null>(null);
  // Команда руководителя, распущенная сменой его роли: её нужно переназначить
  const [orphans, setOrphans] = useState<SovaUserShort[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  const ordering = sort
    ? `${sort.direction === "desc" ? "-" : ""}${sort.field}`
    : undefined;
  const usersQuery = useQuery({
    queryKey: usersQueryKey("roles", { ordering, page, search }),
    queryFn: () => listUsers({ ordering, page, pageSize, search }),
  });

  const rolesQuery = useQuery({
    queryKey: usersQueryKey("roleChoices"),
    queryFn: getSystemRoles,
  });

  const saveMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      setUserRole(userId, role, csrfToken),
    onSuccess: async ({ orphaned_kams, user }) => {
      setDraftRoles((current) => ({ ...current, [user.id]: user.role }));
      setOrphans(orphaned_kams);
      await queryClient.invalidateQueries({ queryKey: usersRootKey });
      setConfirmation(null);
      toast.success(t("userRolesSaved"));
    },
    onError: (error) => toast.error(errorMessage(error, t("userRolesError"))),
  });

  const roleOptions = useMemo(
    () => [
      { value: "", label: t("userRolesNoRole") },
      ...(rolesQuery.data ?? []).map((role) => ({
        value: role.value,
        label: role.label,
      })),
    ],
    [rolesQuery.data, t],
  );

  // Бэк не даёт администратору снять с себя роль администратора
  function isSelf(row: SovaUser) {
    return row.id === user?.id;
  }

  function save(user: SovaUser, role: UserRole) {
    if (role === "platform_admin" || role === null || user.role === "head") {
      setConfirmation({ user, role });
      return;
    }
    saveMutation.mutate({ userId: user.id, role });
  }

  const columns: DataTableColumn<SovaUser>[] = [
    {
      name: "user",
      title: "Пользователь",
      sortField: "last_name",
      width: "28%",
      render: (user) => (
        <div>
          <p className="font-medium">{user.full_name}</p>
          <p className="text-muted-foreground text-xs">{user.email || "—"}</p>
        </div>
      ),
    },
    {
      name: "currentRole",
      title: "Текущая роль",
      render: (user) => (
        <Badge>{user.role_display ?? t("userRolesNoRole")}</Badge>
      ),
    },
    {
      name: "newRole",
      title: "Новая роль",
      render: (user) => (
        <Select
          aria-label={`Новая роль: ${user.full_name}`}
          disabled={
            isSelf(user) ||
            (saveMutation.isPending &&
              saveMutation.variables?.userId === user.id)
          }
          title={isSelf(user) ? t("userRolesSelf") : undefined}
          onChange={(event) =>
            setDraftRoles((current) => ({
              ...current,
              [user.id]: (event.target.value || null) as UserRole,
            }))
          }
          value={draftRoles[user.id] ?? user.role ?? ""}
        >
          {roleOptions.map((role) => (
            <option key={role.value || "none"} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
      ),
    },
    {
      name: "action",
      title: "",
      align: "right",
      render: (user) => {
        const role = draftRoles[user.id] ?? user.role;
        const changed = role !== user.role;
        const saving =
          saveMutation.isPending && saveMutation.variables?.userId === user.id;
        return (
          <Button
            colorScheme="accent"
            disabled={
              isSelf(user) || !changed || saving || rolesQuery.isLoading
            }
            onClick={() => save(user, role)}
            size="m"
            type="button"
          >
            {saving ? "…" : t("userRolesSave")}
          </Button>
        );
      },
    },
  ];

  const users = usersQuery.data?.results ?? [];
  const pages = Math.max(
    1,
    Math.ceil((usersQuery.data?.count ?? 0) / pageSize),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {t("userRoles")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          {t("userRolesDescription")}
        </p>
      </div>

      <TableToolbar
        search={{
          label: t("userRolesSearch"),
          placeholder: t("userRolesSearchPlaceholder"),
          clearLabel: t("userRolesSearch"),
          value: searchDraft,
          onChange: setSearchDraft,
        }}
      />

      {orphans.length > 0 ? (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">{t("userRolesOrphaned")}</p>
              <p className="text-muted-foreground">
                {t("userRolesOrphanedHint")}
              </p>
              <p>{orphans.map((kam) => kam.full_name).join(", ")}</p>
              <Link className="text-primary font-medium underline" href="/team">
                {t("userRolesOrphanedAction")}
              </Link>
            </div>
            <Button
              aria-label={t("userRolesClose")}
              colorScheme="neutral"
              onClick={() => setOrphans([])}
              size="s"
              type="button"
              variant="ghost"
            >
              ×
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        caption={t("userRolesTable")}
        columns={columns}
        getRowId={(user) => String(user.id)}
        isError={usersQuery.isError}
        isLoading={usersQuery.isLoading}
        labels={{
          empty: t("userRolesEmpty"),
          error: t("userRolesError"),
          loading: t("userRolesLoading"),
          retry: t("userRolesRetry"),
          sortAscending: "Сортировать по возрастанию",
          sortDescending: "Сортировать по убыванию",
          sortNone: "Сбросить сортировку",
        }}
        onRetry={() => void usersQuery.refetch()}
        onSortChange={(nextSort) => {
          setSort(nextSort);
          setPage(1);
        }}
        rows={users}
        sort={sort}
      />

      <TablePagination
        count={usersQuery.data?.count ?? 0}
        labels={{
          next: "Следующая страница",
          previous: "Предыдущая страница",
          pageOf: (currentPage, totalPages) =>
            `${t("userRolesPage")} ${currentPage} из ${totalPages}`,
          range: (from, to, count) =>
            `${t("userRolesRange")} ${from}–${to} из ${count}`,
        }}
        onPageChange={setPage}
        page={Math.min(page, pages)}
        pageSize={pageSize}
      />

      {confirmation ? (
        <Modal
          closeLabel={t("userRolesClose")}
          labelledBy="user-role-confirm-title"
          onClose={() => setConfirmation(null)}
        >
          <div className="space-y-5 p-6 sm:p-8">
            <div>
              <h2 className="text-xl font-medium" id="user-role-confirm-title">
                {t("userRolesConfirmTitle")}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t("userRolesConfirmDescription")} «
                {confirmation.user.full_name}»?
              </p>
              {confirmation.user.role === "head" ? (
                <p className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-400">
                  {t("userRolesConfirmTeam")}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                colorScheme="neutral"
                onClick={() => setConfirmation(null)}
                type="button"
                variant="outline"
              >
                {t("userRolesCancel")}
              </Button>
              <Button
                disabled={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    userId: confirmation.user.id,
                    role: confirmation.role,
                  })
                }
                type="button"
              >
                {confirmation.role === null
                  ? t("userRolesConfirmRemove")
                  : t("userRolesConfirmAssign")}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
