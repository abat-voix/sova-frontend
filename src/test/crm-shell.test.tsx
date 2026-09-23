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

const user: AuthenticatedUser = {
  id: 1,
  email: "kam@example.com",
  firstName: "Иван",
  lastName: "Иванов",
  displayName: "Иван Иванов",
  isStaff: false,
  role: "kam",
  roleDisplay: "КАМ",
  roles: [],
};

function renderShell(activeSection: CrmSection = "contracts") {
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
            user={user}
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
});
