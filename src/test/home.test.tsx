import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { AppProviders } from "@/providers/app-providers";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("renders the branded SOVA shell and unauthenticated action", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ authenticated: false, csrfToken: "csrf-token" }),
            { headers: { "content-type": "application/json" }, status: 200 },
          ),
        ),
    );

    render(
      <AppProviders>
        <Home />
      </AppProviders>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "СОВА" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Система организации взаимодействия с академической средой",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Войти/ })).toHaveAttribute(
      "href",
      "/api/auth/oidc/authenticate/?next=/",
    );
    expect(
      screen.getByRole("contentinfo", {
        name: "Разработано с любовью командой 1uup",
      }),
    ).toBeInTheDocument();
  });

  it("switches the interface to English and saves the locale", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ authenticated: false, csrfToken: "csrf-token" }),
            { headers: { "content-type": "application/json" }, status: 200 },
          ),
        ),
    );

    render(
      <AppProviders>
        <Home />
      </AppProviders>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Переключить язык на английский",
      }),
    );

    expect(
      screen.getByText(
        "System for organizing collaboration with the academic community",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /Sign in/ }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(window.localStorage.getItem("sova-locale")).toBe("en");
  });

  it("shows the CRM workspace for an authenticated user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            authenticated: true,
            csrfToken: "csrf-token",
            user: {
              id: 1,
              email: "owl@example.com",
              firstName: "Сова",
              lastName: "",
              displayName: "Сова",
              isStaff: false,
              roles: [],
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      ),
    );

    render(
      <AppProviders>
        <Home />
      </AppProviders>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Добро пожаловать, Сова",
      }),
    ).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", {
      name: "Основная навигация",
    });
    expect(
      within(navigation).getByRole("link", { name: "Главная" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByAltText("Логотип СОВА")).toHaveAttribute(
      "src",
      expect.stringContaining("sova.png"),
    );
    expect(screen.getByRole("button", { name: "Выйти" })).toBeInTheDocument();
    expect(screen.getByLabelText("Версия сборки dev")).toHaveTextContent("dev");

    const collapseSidebar = screen.getByRole("button", {
      name: "Свернуть боковую панель",
    });
    expect(collapseSidebar).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapseSidebar);

    expect(
      screen.getByRole("button", { name: "Развернуть боковую панель" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      within(navigation).getByRole("link", { name: "Главная" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
