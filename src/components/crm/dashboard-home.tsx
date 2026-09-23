"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  Handshake,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { interactionTitle } from "@/components/interactions/interaction-list";
import { crmNavigationItems } from "@/components/crm/crm-navigation";
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
    notificationsBody:
      "Здесь появятся напоминания о сроках, назначениях и системные сообщения.",
    notificationsTitle: "Уведомления",
    notificationsSoon: "Скоро",
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
    notificationsBody:
      "Deadline reminders, assignments, and system messages will show up here.",
    notificationsTitle: "Notifications",
    notificationsSoon: "Coming soon",
    quickLinksTitle: "More sections",
    unnamed: "Untitled",
    workspaceHint: "Personal workspace",
  },
} as const;

type CopyText = (typeof copy)[keyof typeof copy];

function WidgetCard({
  children,
  count,
  href,
  icon: Icon,
  linkLabel,
  title,
}: {
  children: ReactNode;
  count?: number;
  href: string;
  icon: LucideIcon;
  linkLabel: string;
  title: string;
}) {
  return (
    <section className="bg-card flex min-h-0 flex-col rounded-xl border p-5 shadow-sm">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
          <h2 className="text-base font-medium">{title}</h2>
          {count !== undefined ? (
            <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {count}
            </span>
          ) : null}
        </div>
        <Link
          className="text-muted-foreground hover:text-foreground group flex shrink-0 items-center gap-1 text-xs font-medium transition-colors"
          href={href}
        >
          {linkLabel}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </header>
      <div className="min-h-0 flex-1 space-y-1.5">{children}</div>
    </section>
  );
}

function WidgetState({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground px-1 py-6 text-center text-sm">
      {label}
    </p>
  );
}

function WidgetSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          aria-hidden="true"
          className="bg-secondary/60 h-14 animate-pulse rounded-lg"
          key={index}
        />
      ))}
    </div>
  );
}

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
              href="/tasks"
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

/**
 * Заглушка: у уведомлений пока нет ни бэкенда, ни модели данных. Карточка
 * зарезервирована в макете, чтобы виджет встал на своё место без переверстки,
 * когда канал появится.
 */
function NotificationsWidget({ text }: { text: CopyText }) {
  return (
    <section className="bg-card/60 flex min-h-0 flex-col rounded-xl border border-dashed p-5">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Bell aria-hidden="true" className="size-4.5" />
          </span>
          <h2 className="text-base font-medium">{text.notificationsTitle}</h2>
        </div>
        <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
          {text.notificationsSoon}
        </span>
      </header>
      <p className="text-muted-foreground flex-1 text-sm leading-6">
        {text.notificationsBody}
      </p>
    </section>
  );
}

function QuickLinks({ text }: { text: CopyText }) {
  const { t } = useLocale();
  const sections = crmNavigationItems.filter((item) =>
    quickLinkSections.has(item.id),
  );

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

      <div className="grid gap-4 lg:grid-cols-3">
        <MyTasksWidget text={text} />
        <InteractionsWidget text={text} />
        <NotificationsWidget text={text} />
      </div>

      <QuickLinks text={text} />
    </div>
  );
}
