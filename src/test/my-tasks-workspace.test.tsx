import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { MyTasksWorkspace } from "@/components/tasks/my-tasks-workspace";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import { actionInstanceFixture } from "@/test/fixtures/action-instance";
import { kamPermissions } from "@/test/fixtures/permissions";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function stubApi(role: "kam" | "head") {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const body = url.startsWith("/api/auth/me/")
      ? {
          authenticated: true,
          csrfToken: "csrf",
          user: {
            id: 1,
            email: "u@example.com",
            firstName: "Иван",
            lastName: "Иванов",
            displayName: "Иван Иванов",
            isStaff: false,
            isSuperuser: false,
            permissions:
              role === "head"
                ? [...kamPermissions, "teams.manage"]
                : kamPermissions,
            role,
            roleDisplay: "",
            roles: [],
          },
        }
      : url.startsWith("/api/interactions/interactions/")
        ? {
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: "in-1",
                university: { id: "u-1", name: "МГУ" },
                b2c_client: null,
                created_at: "2026-09-01T09:00:00+03:00",
                updated_at: "2026-09-01T09:00:00+03:00",
                current_responsibles: [],
                directions_count: 0,
                programs_count: 0,
                products_count: 0,
              },
            ],
          }
        : { count: 0, next: null, previous: null, results: [] };

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function stubApiWithTask(role: "kam" | "head") {
  const task = {
    ...actionInstanceFixture,
    action_name_snapshot: "Найти контакт",
    available_outcomes: [],
    available_features: [{ code: "contact_person.create", settings: {} }],
    status: "in_progress",
  };

  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes("/features/contact_person.create/execute/")) {
      return new Response(
        JSON.stringify({
          execution: {
            id: "execution-1",
            feature_code: "contact_person.create",
            performed_at: "2026-09-22T10:00:00Z",
            performed_by: { id: 1, full_name: "Иван Иванов" },
          },
          target: {
            type: "contact_person",
            id: "contact-1",
            data: { full_name: "Анна Иванова" },
          },
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    }
    // У задачи один статус — в остальных колонках отдаём пустой список,
    // иначе одна и та же карточка всплывёт сразу в трёх колонках.
    const body = url.startsWith("/api/processes/action-instances/")
      ? url.includes(`status=${task.status}`)
        ? { count: 1, next: null, previous: null, results: [task] }
        : { count: 0, next: null, previous: null, results: [] }
      : url.startsWith("/api/auth/me/")
        ? {
            authenticated: true,
            csrfToken: "csrf",
            user: {
              id: 1,
              email: "u@example.com",
              firstName: "Иван",
              lastName: "Иванов",
              displayName: "Иван Иванов",
              isStaff: false,
              isSuperuser: false,
              permissions: kamPermissions,
              role,
              roleDisplay: "",
              roles: [],
            },
          }
        : { count: 0, next: null, previous: null, results: [] };

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function stubApiWithCompletableTask(role: "kam" | "head") {
  const task = {
    ...actionInstanceFixture,
    action_name_snapshot: "Найти контакт",
    available_outcomes: [
      {
        id: "out-1",
        code: "done",
        name: "Выполнено",
        is_comment_required: false,
        is_attachment_required: false,
      },
    ],
    status: "in_progress",
  };

  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);

    // Завершение действия: отвечаем успехом без движения по колонкам —
    // тест проверяет только закрытие панели, а не рефетч карточек.
    if (url.includes("/complete/")) {
      return new Response(JSON.stringify({ workflow_completed: false }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }

    // У задачи один статус — в остальных колонках отдаём пустой список,
    // иначе одна и та же карточка всплывёт сразу в трёх колонках.
    const body = url.startsWith("/api/processes/action-instances/")
      ? url.includes(`status=${task.status}`)
        ? { count: 1, next: null, previous: null, results: [task] }
        : { count: 0, next: null, previous: null, results: [] }
      : url.startsWith("/api/auth/me/")
        ? {
            authenticated: true,
            csrfToken: "csrf",
            user: {
              id: 1,
              email: "u@example.com",
              firstName: "Иван",
              lastName: "Иванов",
              displayName: "Иван Иванов",
              isStaff: false,
              isSuperuser: false,
              permissions: kamPermissions,
              role,
              roleDisplay: "",
              roles: [],
            },
          }
        : { count: 0, next: null, previous: null, results: [] };

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <MyTasksWorkspace />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function taskUrls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.startsWith("/api/processes/action-instances/"));
}

describe("MyTasksWorkspace", () => {
  it("opens three columns scoped to the current user", async () => {
    const fetchMock = stubApi("head");
    renderWorkspace();

    await waitFor(() => expect(taskUrls(fetchMock).length).toBe(3));
    const urls = taskUrls(fetchMock);
    expect(urls.some((url) => url.includes("status=pending"))).toBe(true);
    expect(urls.some((url) => url.includes("status=in_progress"))).toBe(true);
    expect(urls.some((url) => url.includes("status=completed"))).toBe(true);
    expect(urls.every((url) => url.includes("scope=mine"))).toBe(true);
    expect(urls.filter((url) => url.includes("actual_end__gte=")).length).toBe(
      1,
    );
  });

  it("switches the scope for a head", async () => {
    const fetchMock = stubApi("head");
    renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "Все" }));

    await waitFor(() =>
      expect(taskUrls(fetchMock).some((url) => url.includes("scope=all"))).toBe(
        true,
      ),
    );
  });

  it("hides the scope switch from a KAM", async () => {
    stubApi("kam");
    renderWorkspace();

    expect(await screen.findByText("МГУ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Все" })).toBeNull();
  });

  it("filters the columns by the picked interaction and back", async () => {
    const fetchMock = stubApi("head");
    renderWorkspace();

    fireEvent.click(await screen.findByText("МГУ"));

    await waitFor(() =>
      expect(
        taskUrls(fetchMock).some((url) =>
          url.includes("interaction__ids=in-1"),
        ),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: "Все взаимодействия" }));

    await waitFor(() =>
      expect(
        taskUrls(fetchMock).filter((url) => !url.includes("interaction__ids"))
          .length,
      ).toBeGreaterThan(3),
    );
  });

  it("opens the details drawer for the clicked card", async () => {
    stubApiWithTask("head");
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Найти контакт" }),
    );

    expect(
      await screen.findByRole("complementary", { name: "Действие" }),
    ).toBeInTheDocument();
  });

  it("executes contact creation from the same task details panel", async () => {
    const fetchMock = stubApiWithTask("head");
    renderWorkspace();
    fireEvent.click(
      await screen.findByRole("button", { name: "Найти контакт" }),
    );
    fireEvent.change(await screen.findByLabelText("ФИО *"), {
      target: { value: "Анна Иванова" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить контакт" }));

    expect(
      await screen.findByText("Создан контакт: Анна Иванова"),
    ).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/features/contact_person.create/execute/"),
    );
    expect(call?.[1]?.body).toBe(
      JSON.stringify({
        full_name: "Анна Иванова",
        position: "",
        email: "",
        phone: "",
        telegram: "",
      }),
    );
  });

  // Панель хранит снимок открытого действия и не перечитывает его сама —
  // после завершения через кнопку исхода на карточке она должна закрыться,
  // иначе показывала бы форму завершения для уже завершённого действия.
  it("closes the drawer when the opened action is completed via the card's outcome button", async () => {
    stubApiWithCompletableTask("head");
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Найти контакт" }),
    );

    expect(
      await screen.findByRole("complementary", { name: "Действие" }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Выполнено" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("complementary", { name: "Действие" }),
      ).toBeNull(),
    );
  });
});
