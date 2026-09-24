"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  crmNavigation,
  crmNavigationItems,
  type CrmNavigationItem,
  type CrmSection,
} from "@/components/crm/crm-navigation";
import { DashboardHome } from "@/components/crm/dashboard-home";
import { B2CClientsWorkspace } from "@/components/b2c-clients/b2c-clients-workspace";
import { ContractsWorkspace } from "@/components/contracts/contracts-workspace";
import { LicensesWorkspace } from "@/components/licenses/licenses-workspace";
import { VendorsWorkspace } from "@/components/vendors/vendors-workspace";
import { ContactsWorkspace } from "@/components/contacts/contacts-workspace";
import { ItCatalogWorkspace } from "@/components/catalog/it-catalog-workspace";
import { InteractionsWorkspace } from "@/components/interactions/interactions-workspace";
import { LanguageToggle } from "@/components/language-toggle";
import { MessengerPanel } from "@/components/messaging/messenger-panel";
import { NotificationsWorkspace } from "@/components/notifications/notifications-workspace";
import { OrganizationsWorkspace } from "@/components/organizations/organizations-workspace";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { MyTasksWorkspace } from "@/components/tasks/my-tasks-workspace";
import { WorkflowTemplatesWorkspace } from "@/components/workflows/workflow-templates-workspace";
import { ThemeToggle } from "@/components/theme-toggle";
import { BuildVersion } from "@/components/build-version";
import { Button } from "@/components/ui/button";
import { usePersistedFlag } from "@/hooks/use-persisted-flag";
import {
  getUnreadCount,
  unreadCountQueryKey,
} from "@/lib/api/messaging/messaging";
import { cn } from "@/lib/utils";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  realtimePollingInterval,
  useRealtime,
} from "@/providers/realtime-provider";

type CrmShellProps = {
  activeSection: CrmSection;
  csrfToken: string;
  logoutUrl: string;
  user: AuthenticatedUser;
};

type SidebarProps = CrmShellProps & {
  collapsed?: boolean;
  onNavigate?: () => void;
};

/**
 * Разделы-рабочие столы: занимают высоту окна целиком и скроллят содержимое
 * панелями, а не страницей. Диаграмме Ганта нужна известная высота — от
 * растущей страницы её не получить.
 */
const fullHeightSections = new Set<CrmSection>([
  "interactions",
  "itCatalog",
  "myTasks",
  "notifications",
  "reports",
]);

const sidebarStorageKey = "sova-sidebar-collapsed";
const messengerPanelWidth = "23rem";

function Sidebar({
  activeSection,
  collapsed = false,
  csrfToken,
  logoutUrl,
  onNavigate,
  user,
}: SidebarProps) {
  const { t } = useLocale();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex h-20 shrink-0 items-center border-b",
          collapsed ? "justify-center px-2" : "gap-3 pr-14 pl-5 lg:pr-5",
        )}
      >
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <Image
            alt={t("logoAlt")}
            className="size-11 object-contain"
            height={48}
            priority
            src="/sova.png"
            width={48}
          />
        </div>
        <div className={cn("min-w-0", collapsed && "sr-only")}>
          <p className="truncate text-xl font-bold tracking-[-0.03em]">
            {t("productName")}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {t("crmWorkspace")}
          </p>
        </div>
      </div>

      <nav
        aria-label={t("mainNavigation")}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto py-5",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <div className={cn(collapsed ? "space-y-4" : "space-y-6")}>
          {crmNavigation.map((group) => {
            if (
              group.staffOnly &&
              user.role !== "head" &&
              user.role !== "platform_admin"
            ) {
              return null;
            }

            return (
              <div key={group.labelKey}>
                <p
                  className={cn(
                    "text-muted-foreground mb-2 px-3 text-[0.6875rem] font-bold tracking-[0.12em] uppercase",
                    collapsed && "sr-only",
                  )}
                >
                  {t(group.labelKey)}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                      <Link
                        aria-label={collapsed ? t(item.labelKey) : undefined}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          collapsed && "justify-center px-0",
                          isActive
                            ? "bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                        href={item.href}
                        key={item.id}
                        onClick={onNavigate}
                        title={collapsed ? t(item.labelKey) : undefined}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-[1.125rem] shrink-0"
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            collapsed && "sr-only",
                          )}
                        >
                          {t(item.labelKey)}
                        </span>
                        {isActive && !collapsed ? (
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-current"
                          />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t p-3">
        <div
          className={cn(
            "mb-3 flex rounded-lg py-2",
            collapsed
              ? "flex-col items-center gap-2 px-0"
              : "items-center gap-3 px-2",
          )}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--atmr-background-accent-soft)] text-sm font-bold text-[var(--atmr-accent-primary)]"
            title={collapsed ? user.displayName : undefined}
          >
            {user.displayName.trim().charAt(0).toUpperCase() || "S"}
          </span>
          <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <p className="text-muted-foreground truncate text-xs">
              {user.email}
            </p>
          </div>
          <form action={logoutUrl} method="post">
            <input name="csrfmiddlewaretoken" type="hidden" value={csrfToken} />
            <Button
              aria-label={t("logOut")}
              colorScheme="neutral"
              size="icon"
              title={t("logOut")}
              type="submit"
              variant="ghost"
            >
              <LogOut aria-hidden="true" className="size-4" />
            </Button>
          </form>
        </div>
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed ? "flex-col px-0" : "px-2",
          )}
        >
          <LanguageToggle />
          <ThemeToggle />
          <BuildVersion />
        </div>
      </div>
    </div>
  );
}

function SectionPlaceholder({ section }: { section: CrmNavigationItem }) {
  const { t } = useLocale();
  const Icon = section.icon;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {t(section.labelKey)}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          {t(section.descriptionKey)}
        </p>
      </div>
      <section className="bg-card/60 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <h2 className="mt-5 text-lg font-medium">{t("sectionReady")}</h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
          {t("sectionReadyDescription")}
        </p>
      </section>
    </div>
  );
}

function WorkflowAccessDenied() {
  return (
    <div className="bg-card rounded-xl border border-dashed p-12 text-center">
      <h1 className="text-2xl font-medium">Доступ ограничен</h1>
      <p className="text-muted-foreground mt-2">
        Управление workflow доступно только руководителю и администратору
        платформы.
      </p>
    </div>
  );
}

export function CrmShell(props: CrmShellProps) {
  // Каждый раздел — отдельная страница, поэтому состояние сайдбара живёт в
  // хранилище: иначе переход разворачивал бы его заново.
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    usePersistedFlag(sidebarStorageKey);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const { activeSection, csrfToken, user } = props;
  const { t } = useLocale();
  const { status: realtimeStatus } = useRealtime();
  const currentSection =
    crmNavigationItems.find((item) => item.id === activeSection) ??
    crmNavigationItems[0];
  const isFullHeight = fullHeightSections.has(activeSection);
  const canManageWorkflows =
    user.role === "head" || user.role === "platform_admin";

  const unreadCountQuery = useQuery({
    queryKey: unreadCountQueryKey(),
    queryFn: getUnreadCount,
    refetchInterval: realtimePollingInterval(realtimeStatus, 30000),
  });
  const unreadCount = unreadCountQuery.data?.unread_count ?? 0;

  return (
    <div
      className={cn(
        "bg-background min-h-svh lg:grid lg:transition-[grid-template-columns] lg:duration-200",
      )}
      style={{
        gridTemplateColumns: `${isDesktopSidebarCollapsed ? "5rem" : "17.5rem"} minmax(0,1fr) ${isMessengerOpen ? messengerPanelWidth : "0px"}`,
      }}
    >
      <aside
        className="bg-card relative z-40 hidden min-h-svh border-r lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col"
        id="desktop-sidebar-navigation"
      >
        <Button
          aria-controls="desktop-sidebar-navigation"
          aria-expanded={!isDesktopSidebarCollapsed}
          aria-label={
            isDesktopSidebarCollapsed
              ? t("expandSidebar")
              : t("collapseSidebar")
          }
          className="bg-card absolute top-6 right-0 z-10 translate-x-1/2 rounded-full shadow-sm"
          colorScheme="neutral"
          onClick={() =>
            setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)
          }
          size="icon"
          title={
            isDesktopSidebarCollapsed
              ? t("expandSidebar")
              : t("collapseSidebar")
          }
          type="button"
          variant="outline"
        >
          {isDesktopSidebarCollapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-4" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-4" />
          )}
        </Button>
        <Sidebar {...props} collapsed={isDesktopSidebarCollapsed} />
      </aside>

      {isMobileNavigationOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label={t("closeNavigation")}
            className="absolute inset-0 bg-[var(--atmr-overlay)]"
            onClick={() => setIsMobileNavigationOpen(false)}
            type="button"
          />
          <aside className="bg-card relative h-full w-[min(18rem,calc(100vw-3rem))] shadow-2xl">
            <Button
              aria-label={t("closeNavigation")}
              className="absolute top-5 right-3 z-10"
              colorScheme="neutral"
              onClick={() => setIsMobileNavigationOpen(false)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
            <Sidebar
              {...props}
              onNavigate={() => setIsMobileNavigationOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="bg-background/90 sticky top-0 z-30 flex h-16 items-center border-b px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Button
            aria-label={t("openNavigation")}
            className="mr-3 lg:hidden"
            colorScheme="neutral"
            onClick={() => setIsMobileNavigationOpen(true)}
            size="icon"
            type="button"
            variant="outline"
          >
            <Menu aria-hidden="true" className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-xs font-medium">
              {t("crmWorkspace")}
            </p>
            <p className="truncate text-sm font-medium">
              {t(currentSection.labelKey)}
            </p>
          </div>
          <div className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex lg:hidden">
            <span className="max-w-44 truncate">{user.displayName}</span>
          </div>
          <Button
            aria-label={
              isMessengerOpen ? t("closeMessenger") : t("openMessenger")
            }
            className="relative ml-2"
            colorScheme="neutral"
            onClick={() => setIsMessengerOpen((open) => !open)}
            size="icon"
            title={isMessengerOpen ? t("closeMessenger") : t("openMessenger")}
            type="button"
            variant={isMessengerOpen ? "secondary" : "outline"}
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            {unreadCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-[var(--atmr-accent-primary)] px-0.5 text-[0.625rem] font-bold text-[var(--atmr-text-on-accent)]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-[100rem]",
            isFullHeight
              ? "flex h-[calc(100svh-4rem)] flex-col overflow-hidden p-4 sm:p-6 lg:px-4 lg:py-4"
              : "p-3 sm:p-4 lg:p-4",
          )}
        >
          {activeSection === "workflowTemplates" && !canManageWorkflows ? (
            <WorkflowAccessDenied />
          ) : activeSection === "workflowTemplates" ? (
            <WorkflowTemplatesWorkspace />
          ) : activeSection === "home" ? (
            <DashboardHome user={user} />
          ) : activeSection === "contacts" ? (
            <ContactsWorkspace />
          ) : activeSection === "itCatalog" ? (
            <ItCatalogWorkspace />
          ) : activeSection === "interactions" ? (
            <InteractionsWorkspace />
          ) : activeSection === "myTasks" ? (
            <MyTasksWorkspace />
          ) : activeSection === "notifications" ? (
            <NotificationsWorkspace />
          ) : activeSection === "organizations" ? (
            <OrganizationsWorkspace />
          ) : activeSection === "reports" ? (
            <ReportsWorkspace />
          ) : activeSection === "b2cClients" ? (
            <B2CClientsWorkspace />
          ) : activeSection === "contracts" ? (
            <ContractsWorkspace />
          ) : activeSection === "licenses" ? (
            <LicensesWorkspace />
          ) : activeSection === "vendors" ? (
            <VendorsWorkspace />
          ) : (
            <SectionPlaceholder section={currentSection} />
          )}
        </main>
      </div>

      <aside
        className="bg-card sticky top-0 z-40 hidden h-svh border-l lg:block"
        id="desktop-messenger-panel"
      >
        {isMessengerOpen ? (
          <div className="h-full" style={{ width: messengerPanelWidth }}>
            <MessengerPanel
              csrfToken={csrfToken}
              currentUser={user}
              onClose={() => setIsMessengerOpen(false)}
            />
          </div>
        ) : null}
      </aside>

      {isMessengerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label={t("closeMessenger")}
            className="absolute inset-0 bg-[var(--atmr-overlay)]"
            onClick={() => setIsMessengerOpen(false)}
            type="button"
          />
          <aside className="bg-card absolute inset-y-0 right-0 flex h-full w-[min(23rem,calc(100vw-3rem))] flex-col shadow-2xl">
            <MessengerPanel
              csrfToken={csrfToken}
              currentUser={user}
              onClose={() => setIsMessengerOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
