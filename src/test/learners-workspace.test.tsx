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
const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
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

  function stubCreate(response: () => Response) {
    const posts: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        if (init?.method === "POST") {
          posts.push(JSON.parse(String(init.body)));
          return response();
        }
        return new Response(
          JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
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
    return posts;
  }

  function fillLearner(dialog: HTMLElement) {
    fireEvent.change(within(dialog).getByLabelText(/Фамилия/), {
      target: { value: "Иванов" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Имя/), {
      target: { value: "Иван" },
    });
    fireEvent.change(within(dialog).getByLabelText("Телефон"), {
      target: { value: "+7 999 123-45-67" },
    });
  }

  it("creates a learner and opens the card", async () => {
    auth.permissions = ["training.read", "training.update"];
    navigation.push.mockReset();
    const posts = stubCreate(
      () =>
        new Response(JSON.stringify({ id: "l9" }), {
          headers: { "content-type": "application/json" },
          status: 201,
        }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Создать обучающегося" }),
    );
    const dialog = screen.getByRole("dialog");
    const save = within(dialog).getByRole("button", { name: "Сохранить" });
    fireEvent.change(within(dialog).getByLabelText(/Фамилия/), {
      target: { value: "Иванов" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Имя/), {
      target: { value: "Иван" },
    });
    // Без контакта сохранить нельзя
    expect(save).toBeDisabled();
    fillLearner(dialog);
    fireEvent.click(save);

    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/training/learners/l9"),
    );
    expect(posts).toEqual([
      {
        email: "",
        first_name: "Иван",
        is_active: true,
        last_name: "Иванов",
        middle_name: "",
        phone: "+7 999 123-45-67",
      },
    ]);
  });

  it("links to the existing learner when the contacts are taken", async () => {
    auth.permissions = ["training.read", "training.update"];
    stubCreate(
      () =>
        new Response(
          JSON.stringify({
            code: "learner_exists",
            detail: "Обучающийся с такими контактами уже есть: Иванов Иван.",
            learner: "l7",
          }),
          { headers: { "content-type": "application/json" }, status: 409 },
        ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Создать обучающегося" }),
    );
    const dialog = screen.getByRole("dialog");
    fillLearner(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(
      await within(dialog).findByText(
        "Обучающийся с такими контактами уже есть: Иванов Иван.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Открыть найденного" }),
    ).toHaveAttribute("href", "/training/learners/l7");
  });

  it("hides creation without the training update permission", () => {
    auth.permissions = ["training.read"];
    renderWorkspace();

    expect(
      screen.queryByRole("button", { name: "Создать обучающегося" }),
    ).toBeNull();
  });
});
