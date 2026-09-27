"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarClock, Handshake, ListChecks } from "lucide-react";

import { interactionTitle } from "@/components/interactions/interaction-list";
import {
  canAccessCrmSection,
  crmNavigationItems,
} from "@/components/crm/crm-navigation";
import {
  WidgetCard,
  WidgetSkeleton,
  WidgetState,
} from "@/components/crm/widget-card";
import { NotificationsWidget } from "@/components/notifications/notifications-widget";
import { StatusChip } from "@/components/ui/status-chip";
import {
  actionInstancesQueryKey,
  getActionInstances,
} from "@/lib/api/processes/action-instances";
import {
  getInteractions,
  interactionsQueryKey,
} from "@/lib/api/interactions/interactions";
import { resolveActionState } from "@/lib/workflow/board-to-gantt";
import { formatMoment } from "@/lib/workflow/format-moment";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

/** Быстрые ссылки под виджетами — разделы без собственного виджета на главной. */
const quickLinkSections = new Set([
  "contracts",
  "reports",
  "organizations",
  "itCatalog",
]);

const taskPreviewCount = 4;
const interactionPreviewCount = 4;

const copy = {
  ru: {
    allInteractions: "Все взаимодействия",
    allTasks: "Все задачи",
    interactionsEmpty: "Взаимодействий пока нет.",
    interactionsError: "Не удалось загрузить взаимодействия.",
    interactionsTitle: "Взаимодействия",
    myTasksEmpty: "Активных задач нет — можно выдохнуть.",
    myTasksError: "Не удалось загрузить задачи.",
    myTasksTitle: "Мои задачи",
    noDeadline: "без срока",
    quickLinksTitle: "Другие разделы",
    unnamed: "Без названия",
    workspaceHint: "Личная Единая Среда",
  },
  en: {
    allInteractions: "All interactions",
    allTasks: "All tasks",
    interactionsEmpty: "No interactions yet.",
    interactionsError: "The interactions could not be loaded.",
    interactionsTitle: "Interactions",
    myTasksEmpty: "No active tasks — you're all caught up.",
    myTasksError: "The tasks could not be loaded.",
    myTasksTitle: "My tasks",
    noDeadline: "no deadline",
    quickLinksTitle: "More sections",
    unnamed: "Untitled",
    workspaceHint: "Personal workspace",
  },
} as const;

type CopyText = (typeof copy)[keyof typeof copy];

function MyTasksWidget({ text }: { text: CopyText }) {
  const { locale } = useLocale();
  const params = {
    ordering: "planned_end",
    scope: "mine" as const,
    status: "in_progress" as const,
  };
  const query = useQuery({
    queryKey: actionInstancesQueryKey(params),
    queryFn: () => getActionInstances({ ...params, page: 1 }),
  });
  const tasks = query.data?.results.slice(0, taskPreviewCount) ?? [];

  return (
    <WidgetCard
      count={query.data?.count}
      href="/tasks"
      icon={ListChecks}
      linkLabel={text.allTasks}
      title={text.myTasksTitle}
    >
      {query.isPending ? (
        <WidgetSkeleton />
      ) : query.isError ? (
        <WidgetState label={text.myTasksError} />
      ) : tasks.length === 0 ? (
        <WidgetState label={text.myTasksEmpty} />
      ) : (
        tasks.map((task) => {
          const state = resolveActionState(task);
          const deadline = formatMoment(task.planned_end, locale);

          return (
            <Link
              className="hover:bg-secondary flex items-start gap-2.5 rounded-lg border border-transparent p-2 transition-colors"
              href={`/tasks?task=${task.id}`}
              key={task.id}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-5 font-medium">
                  {task.action_name_snapshot}
                </span>
                <span className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  <Building2 aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">
                    {interactionTitle(task.interaction, text.unnamed)}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {state === "overdue" ? (
                  <StatusChip
                    className="bg-[var(--atmr-brand-orange)]/12 text-[var(--atmr-brand-orange)]"
                    tone="neutral"
                  >
                    {deadline ?? text.noDeadline}
                  </StatusChip>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <CalendarClock aria-hidden="true" className="size-3" />
                    {deadline ?? text.noDeadline}
                  </span>
                )}
              </span>
            </Link>
          );
        })
      )}
    </WidgetCard>
  );
}

function InteractionsWidget({ text }: { text: CopyText }) {
  const query = useQuery({
    queryKey: interactionsQueryKey(""),
    queryFn: () => getInteractions(1, ""),
  });
  const interactions =
    query.data?.results.slice(0, interactionPreviewCount) ?? [];

  return (
    <WidgetCard
      count={query.data?.count}
      href="/interactions"
      icon={Handshake}
      linkLabel={text.allInteractions}
      title={text.interactionsTitle}
    >
      {query.isPending ? (
        <WidgetSkeleton />
      ) : query.isError ? (
        <WidgetState label={text.interactionsError} />
      ) : interactions.length === 0 ? (
        <WidgetState label={text.interactionsEmpty} />
      ) : (
        interactions.map((interaction) => (
          <Link
            className="hover:bg-secondary flex items-center gap-2.5 rounded-lg border border-transparent p-2 transition-colors"
            href="/interactions"
            key={interaction.id}
          >
            <Building2
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-sm leading-5 font-medium">
              {interactionTitle(interaction, text.unnamed)}
            </span>
          </Link>
        ))
      )}
    </WidgetCard>
  );
}

function QuickLinks({
  text,
  user,
}: {
  text: CopyText;
  user: AuthenticatedUser;
}) {
  const { t } = useLocale();
  const sections = crmNavigationItems.filter(
    (item) => quickLinkSections.has(item.id) && canAccessCrmSection(item, user),
  );
  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="quick-links-title">
      <h2 className="mb-3 text-sm font-medium" id="quick-links-title">
        {text.quickLinksTitle}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="group bg-card flex items-center gap-3 rounded-xl border p-4 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--atmr-accent-primary)] hover:shadow-md"
              href={item.href}
              key={item.id}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
                <Icon aria-hidden="true" className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardHome({ user }: { user: AuthenticatedUser }) {
  const { locale, t } = useLocale();
  const text = copy[locale];
  const preferredName = user.firstName.trim() || user.displayName;

  return (
    <div className="space-y-6">
      <section className="bg-card relative overflow-hidden rounded-xl border p-6 shadow-sm sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,var(--atmr-accent-primary),var(--atmr-brand-orange))]"
        />
        <p className="text-sm font-medium text-[var(--atmr-accent-primary)]">
          {text.workspaceHint}
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {t("welcome")}, {preferredName}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-7">
          {t("homeDescription")}
        </p>
      </section>

      {/* Виджет раздела показываем, только если раздел доступен роли: иначе его запрос получит 403 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {can(user, "processes.read") ? <MyTasksWidget text={text} /> : null}
        {can(user, "interactions.read") ? (
          <InteractionsWidget text={text} />
        ) : null}
        {can(user, "notifications.use") ? <NotificationsWidget /> : null}
      </div>

      <QuickLinks text={text} user={user} />
    </div>
  );
}
