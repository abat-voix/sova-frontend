import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: auth.permissions,
      role: "kam",
    },
  }),
}));

import { LearnersWorkspace } from "@/components/training/learners-workspace";
import { LocaleProvider } from "@/providers/locale-provider";

function renderWorkspace() {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
    ),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <LearnersWorkspace />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("learners workspace", () => {
  it("links to the learners upload with the import permission", () => {
    auth.permissions = ["training.read", "catalog.import"];
    renderWorkspace();

    expect(
      screen.getByRole("link", { name: "Загрузка обучающихся" }),
    ).toHaveAttribute("href", "/training/learners/import");
  });

  it("hides the upload without the import permission", () => {
    auth.permissions = ["training.read"];
    renderWorkspace();

    expect(
      screen.queryByRole("link", { name: "Загрузка обучающихся" }),
    ).not.toBeInTheDocument();
  });
});
