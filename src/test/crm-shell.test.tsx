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
    renderShell("home", { ...user, role });

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
      expect(links).toEqual(["/", "/interactions"]);
    });

    it("does not offer the messenger", () => {
      renderShell("home", observer);

      expect(
        screen.queryByRole("button", { name: "Открыть сообщения" }),
      ).toBeNull();
    });

    it("restricts a section opened by its address", () => {
      renderShell("contracts", observer);

      expect(screen.getByText("Доступ ограничен")).toBeInTheDocument();
    });
  });
});
