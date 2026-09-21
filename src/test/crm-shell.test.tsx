import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CrmShell } from "@/components/crm/crm-shell";
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

function renderShell() {
  return render(
    <LocaleProvider>
      <CrmShell
        activeSection="contracts"
        csrfToken="token"
        logoutUrl="/api/auth/oidc/logout/"
        user={user}
      />
    </LocaleProvider>,
  );
}

afterEach(() => {
  cleanup();
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
});
