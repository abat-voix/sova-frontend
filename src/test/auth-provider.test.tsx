import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { kamPermissions } from "@/test/fixtures/permissions";

afterEach(() => {
  vi.unstubAllGlobals();
});

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.isLoading ? "loading" : "ready"}</span>
      <span>{auth.user?.displayName ?? "anonymous"}</span>
      <span>{auth.csrfToken}</span>
    </div>
  );
}

function renderProbe() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("AuthProvider", () => {
  it("exposes an authenticated Django session", async () => {
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
              isSuperuser: false,
              permissions: kamPermissions,
              roles: [],
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      ),
    );

    renderProbe();

    expect(await screen.findByText("Сова")).toBeInTheDocument();
    expect(screen.getByText("csrf-token")).toBeInTheDocument();
  });

  it("falls back to an anonymous state when the backend is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    renderProbe();

    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });
});
