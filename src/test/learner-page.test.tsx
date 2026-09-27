import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

import { LearnerPage } from "@/components/training/learner-page";
import { LocaleProvider } from "@/providers/locale-provider";
import { kamPermissions } from "@/test/fixtures/permissions";
import type { LearnerDetail } from "@/types/training";

const learner: LearnerDetail = {
  id: "l1",
  full_name: "Черепанова Светлана Васильевна",
  last_name: "Черепанова",
  first_name: "Светлана",
  middle_name: "Васильевна",
  email: "c***@test.ru",
  phone: "+7 *** ***-**-65",
  consent_at: null,
  is_active: true,
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-01T10:00:00+03:00",
  participations: [
    {
      id: "al1",
      application: "a1",
      stream: "s1",
      stream_name: "DevOps-01",
      is_paid: true,
      is_enrolled: true,
    },
  ],
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function stubApi() {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      urls.push(url);
      if (url === "/api/training/learners/l1/personal-data/")
        return json({
          snils: "123-456-789 45",
          email: "cherepanona.s@test.ru",
        });
      if (url === "/api/training/learners/l1/") return json(learner);
      return json({ count: 1, next: null, previous: null, results: [learner] });
    }),
  );
  return urls;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <LearnerPage learnerId="l1" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("learner page", () => {
  it("shows masked contacts and stream participation", async () => {
    auth.permissions = kamPermissions;
    stubApi();
    renderWorkspace();

    expect(
      await screen.findByRole("heading", {
        name: "Черепанова Светлана Васильевна",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "DevOps-01" }),
    ).toHaveAttribute("href", "/training/streams/s1");
    expect(screen.getAllByText("c***@test.ru").length).toBeGreaterThan(0);
    const row = screen.getByRole("row", { name: /DevOps-01/ });
    expect(within(row).getByText("Оплачено")).toBeInTheDocument();
    expect(within(row).getByText("Зачислен")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Персональные данные" }),
    ).toBeNull();
  });

  it("lets the platform administrator open full personal data", async () => {
    auth.permissions = [...kamPermissions, "training.personal_data.read"];
    const urls = stubApi();
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Персональные данные" }),
    );

    expect(await screen.findByText("123-456-789 45")).toBeInTheDocument();
    expect(screen.getByText(/записан в журнал/)).toBeInTheDocument();
    await waitFor(() =>
      expect(urls).toContain("/api/training/learners/l1/personal-data/"),
    );
  });
});
