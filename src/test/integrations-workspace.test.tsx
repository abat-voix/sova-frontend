import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/integrations",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CrmShell } from "@/components/crm/crm-shell";
import { LocaleProvider } from "@/providers/locale-provider";
import { kamPermissions } from "@/test/fixtures/permissions";

describe("integrations access", () => {
  it("does not expose the page to a regular user", () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <LocaleProvider>
          <CrmShell
            activeSection="integrations"
            csrfToken="token"
            logoutUrl="/logout"
            user={{
              id: 1,
              email: "user@example.test",
              firstName: "User",
              lastName: "",
              displayName: "User",
              isStaff: false,
              isSuperuser: false,
              permissions: kamPermissions,
              role: "kam",
              roleDisplay: "КАМ",
              roles: [],
            }}
          />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Доступ ограничен")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Интеграции" }),
    ).not.toBeInTheDocument();
  });
});
