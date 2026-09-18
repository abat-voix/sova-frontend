"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CircleDot, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

import {
  crmNavigation,
  crmNavigationItems,
  type CrmNavigationItem,
  type CrmSection,
} from "@/components/crm/crm-navigation";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

type CrmShellProps = {
  activeSection: CrmSection;
  csrfToken: string;
  logoutUrl: string;
  user: AuthenticatedUser;
};

type SidebarProps = CrmShellProps & {
  onNavigate?: () => void;
};

const dashboardSections = new Set<CrmSection>([
  "contracts",
  "organizations",
  "processes",
]);

function Sidebar({
  activeSection,
  csrfToken,
  logoutUrl,
  onNavigate,
  user,
}: SidebarProps) {
  const { t } = useLocale();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b pr-14 pl-5 lg:pr-5">
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
        <div className="min-w-0">
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
        className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
      >
        <div className="space-y-6">
          {crmNavigation.map((group) => {
            if (group.staffOnly && !user.isStaff) return null;

            return (
              <div key={group.labelKey}>
                <p className="text-muted-foreground mb-2 px-3 text-[0.6875rem] font-bold tracking-[0.12em] uppercase">
                  {t(group.labelKey)}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                        href={item.href}
                        key={item.id}
                        onClick={onNavigate}
                      >
                        <Icon aria-hidden="true" className="size-[1.125rem]" />
                        <span className="min-w-0 flex-1 truncate">
                          {t(item.labelKey)}
                        </span>
                        {isActive ? (
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
        <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--atmr-background-accent-soft)] text-sm font-bold text-[var(--atmr-accent-primary)]">
            {user.displayName.trim().charAt(0).toUpperCase() || "S"}
          </span>
          <div className="min-w-0 flex-1">
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
        <div className="flex items-center gap-2 px-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function DashboardHome({ user }: { user: AuthenticatedUser }) {
  const { t } = useLocale();
  const preferredName = user.firstName.trim() || user.displayName;
  const sections = crmNavigationItems.filter((item) =>
    dashboardSections.has(item.id),
  );

  return (
    <div className="space-y-6">
      <section className="bg-card relative overflow-hidden rounded-xl border p-6 shadow-sm sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,var(--atmr-accent-primary),var(--atmr-brand-orange))]"
        />
        <p className="text-sm font-medium text-[var(--atmr-accent-primary)]">
          {t("crmWorkspace")}
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {t("welcome")}, {preferredName}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-7">
          {t("homeDescription")}
        </p>
      </section>

      <section aria-labelledby="workspace-sections-title">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium" id="workspace-sections-title">
            {t("workspaceSections")}
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {sections.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="group bg-card rounded-xl border p-5 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--atmr-accent-primary)] hover:shadow-md"
                href={item.href}
                key={item.id}
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="mt-5 flex items-center justify-between gap-3">
                  <span className="font-medium">{t(item.labelKey)}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-muted-foreground mt-1 block text-sm leading-6">
                  {t(item.descriptionKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-card/50 rounded-xl border border-dashed px-6 py-10 text-center">
        <span className="bg-secondary text-muted-foreground mx-auto flex size-10 items-center justify-center rounded-full">
          <CircleDot aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 text-lg font-medium">{t("activityPlaceholder")}</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
          {t("activityPlaceholderDescription")}
        </p>
      </section>
    </div>
  );
}

function SectionPlaceholder({ section }: { section: CrmNavigationItem }) {
  const { t } = useLocale();
  const Icon = section.icon;

  return (
    <div className="space-y-6">
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

export function CrmShell(props: CrmShellProps) {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const { activeSection, user } = props;
  const { t } = useLocale();
  const currentSection =
    crmNavigationItems.find((item) => item.id === activeSection) ??
    crmNavigationItems[0];

  return (
    <div className="bg-background min-h-svh lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="bg-card hidden min-h-svh border-r lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <Sidebar {...props} />
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
        </header>

        <main className="mx-auto w-full max-w-[100rem] p-4 sm:p-6 lg:p-8">
          {activeSection === "home" ? (
            <DashboardHome user={user} />
          ) : (
            <SectionPlaceholder section={currentSection} />
          )}
        </main>
      </div>
    </div>
  );
}
