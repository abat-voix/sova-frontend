import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { AppProviders } from "@/providers/app-providers";

afterEach(() => {
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
    expect(screen.getByText("ИТ Школа Ростелекома")).toBeInTheDocument();
    expect(
      screen.getByText("Базовая платформа готова к развитию"),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Войти/ })).toHaveAttribute(
      "href",
      "/api/auth/oidc/authenticate/?next=/",
    );
  });
});
