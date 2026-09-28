import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import type { CrmSection } from "@/components/crm/crm-navigation";
import { CrmShell } from "@/components/crm/crm-shell";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";

const user: AuthenticatedUser = {
  id: 1,
  email: "kam@example.com",
  firstName: "Иван",
  lastName: "Иванов",
  displayName: "Иван Иванов",
  isStaff: false,
  isSuperuser: false,
  permissions: kamPermissions,
  role: "kam",
  roleDisplay: "КАМ",
  roles: [],
};

function renderShell(
  activeSection: CrmSection = "contracts",
  currentUser: AuthenticatedUser = user,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <CrmShell
            activeSection={activeSection}
            csrfToken="token"
            logoutUrl="/api/auth/oidc/logout/"
            user={currentUser}
          />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("CrmShell", () => {
  it("keeps the sidebar collapsed after a page change", () => {
    const view = renderShell();

    fireEvent.click(
      screen.getByRole("button", { name: "Свернуть боковую панель" }),
    );

    expect(window.localStorage.getItem("sova-sidebar-collapsed")).toBe("true");

    // Переход в другой раздел — это новая загрузка страницы: оболочка
    // монтируется заново и должна поднять состояние из хранилища.
    view.unmount();
    renderShell();

    expect(
      screen.getByRole("button", { name: "Развернуть боковую панель" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["head", true],
    ["platform_admin", true],
    ["kam", false],
    [null, false],
  ] as const)("shows the team item for role %s: %s", (role, visible) => {
    renderShell("home", {
      ...user,
      permissions: visible
        ? [...kamPermissions, "teams.manage"]
        : kamPermissions,
      role,
    });

    const link = screen.queryByRole("link", { name: /Команда/ });
    expect(Boolean(link)).toBe(visible);
  });

  it("hides the team item from staff without a role", () => {
    renderShell("home", { ...user, isStaff: true, role: null });

    expect(screen.queryByRole("link", { name: /Команда/ })).toBeNull();
  });

  it("denies the team page to a kam", () => {
    renderShell("team", { ...user, role: "kam" });

    expect(screen.getByText("Доступ ограничен")).toBeInTheDocument();
  });

  it("shows catalog import in administration only with catalog.import", () => {
    const view = renderShell("home");
    expect(
      screen.queryByRole("link", { name: /Импорт справочников/ }),
    ).toBeNull();
    view.unmount();

    renderShell("home", {
      ...user,
      permissions: [...kamPermissions, "catalog.import"],
      role: "platform_admin",
    });
    expect(
      screen.getByRole("link", { name: /Импорт справочников/ }),
    ).toHaveAttribute("href", "/settings/catalog-import");
  });

  it("denies the catalog import page to a kam", () => {
    renderShell("catalogImport");

    expect(screen.getByText("Доступ ограничен")).toBeInTheDocument();
  });

  it("renders the tasks workspace for the myTasks section", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              count: 0,
              next: null,
              previous: null,
              results: [],
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          ),
      ),
    );

    renderShell("myTasks");

    expect(
      await screen.findByRole("button", { name: "Все взаимодействия" }),
    ).toBeInTheDocument();
  });

  it("opens an interaction from its preview on the home page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const url = String(input);
        const body = url.startsWith("/api/notifications/inbox/kinds/")
          ? []
          : url.startsWith("/api/interactions/interactions/")
            ? {
                count: 1,
                next: null,
                previous: null,
                results: [
                  {
                    id: "interaction-1",
                    university: {
                      id: "university-1",
                      name: "Первый университет",
                    },
                    b2c_client: null,
                    created_at: "2026-09-01T10:00:00+03:00",
                    updated_at: "2026-09-01T10:00:00+03:00",
                    current_responsibles: [],
                    directions_count: 0,
                    programs_count: 0,
                    products_count: 0,
                  },
                ],
              }
            : { count: 0, next: null, previous: null, results: [] };

        return new Response(JSON.stringify(body), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }),
    );

    renderShell("home");

    expect(
      await screen.findByRole("link", { name: "Первый университет" }),
    ).toHaveAttribute("href", "/interactions?interaction=interaction-1");
  });

  describe("observer", () => {
    const observer: AuthenticatedUser = {
      ...user,
      permissions: observerPermissions,
      role: "observer",
      roleDisplay: "Наблюдатель",
    };

    it("shows only the sections on the role policy", () => {
      renderShell("home", observer);

      const navigation = screen.getByRole("navigation", {
        name: "Основная навигация",
      });
      const links = Array.from(navigation.querySelectorAll("a")).map((link) =>
        link.getAttribute("href"),
      );
      expect(links).toEqual([
        "/",
        "/interactions",
        "/tasks",
        "/contracts",
        "/licenses",
        "/reports",
        "/organizations",
        "/b2c-clients",
        "/contacts",
        "/catalog/it",
        "/catalog/vendors",
        "/training/streams",
        "/training/learners",
        "/training/instructors",
      ]);
    });

    it("does not offer the messenger", () => {
      renderShell("home", observer);

      expect(
        screen.queryByRole("button", { name: "Открыть сообщения" }),
      ).toBeNull();
    });

    it("restricts a personal section opened by its address", () => {
      renderShell("notifications", observer);

      expect(screen.getByText("Доступ ограничен")).toBeInTheDocument();
    });
  });
});
