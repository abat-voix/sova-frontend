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

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
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
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";
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

const patches: { body: unknown; url: string }[] = [];

function stubApi() {
  const urls: string[] = [];
  patches.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      urls.push(url);
      if (init?.method === "PATCH") {
        patches.push({ body: JSON.parse(String(init.body)), url });
        return json(learner);
      }
      if (url === "/api/training/learners/l1/personal-data/")
        return json({
          snils: "123-456-789 45",
          email: "cherepanona.s@test.ru",
          phone: "79990234365",
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
  });

  it("hides personal data and editing from an observer", async () => {
    auth.permissions = observerPermissions;
    stubApi();
    renderWorkspace();

    await screen.findByRole("heading", {
      name: "Черепанова Светлана Васильевна",
    });
    expect(
      screen.queryByRole("button", { name: "Персональные данные" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Изменить" })).toBeNull();
  });

  it("lets a KAM open full personal data", async () => {
    auth.permissions = kamPermissions;
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

  it("edits the card with full contacts and sends only changed fields", async () => {
    auth.permissions = kamPermissions;
    const urls = stubApi();
    renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }));
    // Полные контакты — из personal-data: открытие формы пишется в журнал.
    // Пока они грузятся, на месте формы — окно загрузки
    expect(
      await screen.findByDisplayValue("cherepanona.s@test.ru"),
    ).toBeInTheDocument();
    const dialog = screen.getByRole("dialog", {
      name: "Изменить обучающегося",
    });
    expect(urls).toContain("/api/training/learners/l1/personal-data/");

    fireEvent.change(within(dialog).getByLabelText(/Отчество/), {
      target: { value: "Викторовна" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(patches).toEqual([
        {
          body: { middle_name: "Викторовна" },
          url: "/api/training/learners/l1/",
        },
      ]),
    );
  });

  it("edits personal data and sends only changed fields", async () => {
    auth.permissions = kamPermissions;
    stubApi();
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Персональные данные" }),
    );
    const view = await screen.findByRole("dialog", {
      name: "Персональные данные",
    });
    await within(view).findByText("123-456-789 45");
    fireEvent.click(within(view).getByRole("button", { name: "Изменить" }));

    const form = await screen.findByRole("dialog", {
      name: "Изменить персональные данные",
    });
    fireEvent.change(within(form).getByLabelText("СНИЛС"), {
      target: { value: "987-654-321 00" },
    });
    fireEvent.change(within(form).getByLabelText("Дата рождения"), {
      target: { value: "1990-05-01" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(patches).toEqual([
        {
          body: { birth_date: "1990-05-01", snils: "987-654-321 00" },
          url: "/api/training/learners/l1/personal-data/",
        },
      ]),
    );
  });

  it("offers no personal data editing without the update permission", async () => {
    auth.permissions = kamPermissions.filter(
      (action) => action !== "training.personal_data.update",
    );
    stubApi();
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Персональные данные" }),
    );
    const view = await screen.findByRole("dialog", {
      name: "Персональные данные",
    });
    await within(view).findByText("123-456-789 45");

    expect(within(view).queryByRole("button", { name: "Изменить" })).toBeNull();
  });

  it("opens the edit window at once and reports a failed contacts load", async () => {
    auth.permissions = kamPermissions;
    stubApi();
    let failLoad: (response: Response) => void = () => undefined;
    const fetchMock = vi.mocked(fetch);
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) =>
      String(input) === "/api/training/learners/l1/personal-data/"
        ? new Promise<Response>((resolve) => {
            failLoad = resolve;
          })
        : base(input, init),
    );
    renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }));

    // Окно видно сразу, пока грузятся полные контакты
    const dialog = await screen.findByRole("dialog", {
      name: "Изменить обучающегося",
    });
    expect(
      within(dialog).getByText("Загружаем контакты для правки…"),
    ).toBeInTheDocument();

    failLoad(
      new Response(JSON.stringify({ detail: "Сбой" }), {
        headers: { "content-type": "application/json" },
        status: 500,
      }),
    );

    expect(
      await within(dialog).findByText(
        "Не удалось загрузить контакты для правки.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Повторить" }));
  });
});
