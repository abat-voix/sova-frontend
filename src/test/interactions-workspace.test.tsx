import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InteractionsWorkspace } from "@/components/interactions/interactions-workspace";
import { interactionsQueryKey } from "@/lib/api/interactions/interactions";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import type { BoardSelection } from "@/lib/workflow/board-to-gantt";
import type { BoardAction } from "@/types/workflow-board";
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";

// Адрес страницы: ссылка из уведомления открывает объект через параметры.
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

// Диаграмму подменяем: dhtmlx рисует в реальный DOM и к разметке рабочего
// стола отношения не имеет. Наружу от неё нужен только выбор строки.
vi.mock("@/components/interactions/workflow-gantt", () => ({
  WorkflowGantt: ({
    board,
    onSelect,
  }: {
    board: { interaction_stages: { actions: BoardAction[] }[] };
    onSelect: (selection: BoardSelection) => void;
  }) => (
    <div>
      {board.interaction_stages
        .flatMap((stage) => stage.actions)
        .map((action) => (
          <button
            key={action.id}
            onClick={() => onSelect({ action, kind: "action" })}
            type="button"
          >
            {action.name}
          </button>
        ))}
    </div>
  ),
}));

const action: BoardAction = {
  id: "action-1",
  action: { id: "definition-1", name: "Найти контакт" },
  name: "Найти контакт",
  status: "in_progress",
  is_optional: false,
  is_trigger_only: false,
  is_triggered: true,
  execution_no: 1,
  planned_start: "2026-09-01T09:00:00+03:00",
  planned_end: "2026-09-10T18:00:00+03:00",
  actual_start: null,
  actual_end: null,
  is_overdue: false,
  responsible: null,
  result: null,
  attachments_count: 0,
  available_outcomes: [],
  available_features: [{ code: "contact_person.create", settings: {} }],
  feature_executions: [],
};

const interaction = {
  id: "interaction-1",
  organization: { id: "organization-1", name: "Первый университет" },
  b2c_client: null,
  created_at: "2026-09-01T09:00:00+03:00",
  updated_at: "2026-09-01T09:00:00+03:00",
  current_responsibles: [],
  directions_count: 1,
  programs_count: 2,
  products_count: 3,
};

const instance = {
  id: "instance-1",
  status: "in_progress",
  started_at: "2026-09-01T09:00:00+03:00",
  completed_at: null,
  workflow: { id: "workflow-1", name: "Базовый процесс", code: "base" },
  interaction: { id: interaction.id, organization: null, b2c_client: null },
  created_by: null,
};

const board = {
  id: instance.id,
  status: "in_progress",
  started_at: instance.started_at,
  completed_at: null,
  workflow: instance.workflow,
  interaction: instance.interaction,
  interaction_stages: [
    {
      id: "stage-1",
      stage: { id: "stage-definition-1", name: "Переговоры" },
      status: "in_progress",
      started_at: instance.started_at,
      completed_at: null,
      return_options: [],
      actions: [action],
    },
  ],
  context_groups: [],
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

const kamSession = {
  id: 1,
  email: "kam@example.com",
  firstName: "Иван",
  lastName: "Иванов",
  displayName: "Иван Иванов",
  isStaff: false,
  isSuperuser: false,
  permissions: kamPermissions,
  role: "kam",
  roleDisplay: "КАМ",
  roles: [],
};

const observerSession = {
  ...kamSession,
  permissions: observerPermissions,
  role: "observer",
  roleDisplay: "Наблюдатель",
};

function stubApi({
  forbidInteractions = false,
  sessionUser = kamSession,
  workflowStatus = "running",
}: {
  forbidInteractions?: boolean;
  sessionUser?: typeof kamSession;
  workflowStatus?: "running" | "completed";
} = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);

    if (url.includes("/features/contact_person.create/execute/")) {
      return json({
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
      });
    }

    if (url.startsWith("/api/auth/me/")) {
      return json({
        authenticated: true,
        csrfToken: "token",
        user: sessionUser,
      });
    }

    if (forbidInteractions && url.startsWith("/api/interactions/")) {
      return new Response(
        JSON.stringify({
          detail: "Недостаточно прав для этой операции.",
          code: "permission_denied",
        }),
        { headers: { "content-type": "application/json" }, status: 403 },
      );
    }

    if (url.endsWith("/contacts/")) return json([]);

    if (url.startsWith("/api/interactions/interactions/")) {
      return json({
        count: 1,
        next: null,
        previous: null,
        results: [interaction],
      });
    }

    if (url.includes("/board/")) return json(board);

    if (url.startsWith("/api/processes/workflow-instances/")) {
      return json({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            ...instance,
            completed_at:
              workflowStatus === "completed"
                ? "2026-09-02T09:00:00+03:00"
                : null,
            status: workflowStatus,
          },
        ],
      });
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderWorkspace({
  session,
  withDashboardCache = false,
}: {
  /** Сессия сразу в кэше: права известны с первого рендера. */
  session?: typeof kamSession;
  withDashboardCache?: boolean;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (session) {
    queryClient.setQueryData(["auth", "session"], {
      authenticated: true,
      csrfToken: "token",
      user: session,
    });
  }
  if (withDashboardCache) {
    queryClient.setQueryData(interactionsQueryKey(""), {
      count: 1,
      next: null,
      previous: null,
      results: [interaction],
    });
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <InteractionsWorkspace onOpenConversation={vi.fn()} />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("InteractionsWorkspace", () => {
  it("opens after the dashboard has cached its interaction preview", async () => {
    stubApi();
    renderWorkspace({ withDashboardCache: true });

    expect(await screen.findByText("Первый университет")).toBeInTheDocument();
  });

  it("marks completed interactions and filters them by process status", async () => {
    stubApi({ workflowStatus: "completed" });
    renderWorkspace();

    expect(await screen.findByText("Завершено")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Завершённые" }));
    expect(screen.getByText("Первый университет")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "В работе" }));
    expect(
      await screen.findByText("По вашему запросу ничего не найдено."),
    ).toBeInTheDocument();
  });

  it("creates a contact from the action panel without asking for its counterparty", async () => {
    const fetchMock = stubApi();
    renderWorkspace();

    fireEvent.click(await screen.findByText("Первый университет"));
    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "Найти контакт" },
        { timeout: 5_000 },
      ),
    );
    fireEvent.change(screen.getByLabelText("ФИО *"), {
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

  it("opens the details drawer for the selected row and closes it on Escape", async () => {
    stubApi();
    renderWorkspace();

    fireEvent.click(await screen.findByText("Первый университет"));

    const row = await screen.findByRole(
      "button",
      {
        name: "Найти контакт",
      },
      { timeout: 5_000 },
    );
    fireEvent.click(row);

    const drawer = await screen.findByRole("complementary", {
      name: "Действие",
    });
    expect(drawer).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Найти контакт" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() =>
      expect(
        screen.queryByRole("complementary", { name: "Действие" }),
      ).toBeNull(),
    );
  });

  it("opens the linked action from the page address", async () => {
    searchParams = new URLSearchParams(
      "interaction=interaction-1&process=instance-1&action=action-1",
    );
    stubApi();
    renderWorkspace();

    expect(
      await screen.findByRole("complementary", { name: "Действие" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Найти контакт" }),
    ).toBeInTheDocument();
    searchParams = new URLSearchParams();
  });

  it("restores the collapsed list from local storage", async () => {
    stubApi();
    const view = renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Свернуть список" }),
    );

    expect(
      window.localStorage.getItem("sova-interactions-list-collapsed"),
    ).toBe("true");

    view.unmount();
    renderWorkspace();

    expect(
      await screen.findByRole("button", { name: "Развернуть список" }),
    ).toBeInTheDocument();
  });

  it("shows an observer the interaction and processes read-only", async () => {
    const fetchMock = stubApi({ sessionUser: observerSession });
    renderWorkspace({ session: observerSession });

    fireEvent.click(await screen.findByText("Первый университет"));

    expect(await screen.findByText("Найти контакт")).toBeInTheDocument();
    expect(
      await screen.findByText("Контакты пока не привязаны."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Карточка" })).toBeVisible();
    for (const name of ["Новое", "Запустить процесс", "Привязать контакт"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/processes/"),
      ),
    ).toBe(true);
    expect(
      screen.queryByRole("button", { name: "Запустить процесс" }),
    ).toBeNull();
  });

  it("offers a kam to create interactions and start processes", async () => {
    stubApi();
    renderWorkspace();

    fireEvent.click(await screen.findByText("Первый университет"));

    expect(
      await screen.findByRole("button", { name: "Запустить процесс" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Новое" })).toBeVisible();
    expect(
      await screen.findByRole("button", { name: "Привязать контакт" }),
    ).toBeVisible();
  });

  it("shows access restricted when the backend forbids the list", async () => {
    stubApi({ forbidInteractions: true });
    renderWorkspace();

    expect(
      await screen.findByText(
        "Доступ ограничен: список недоступен для вашей роли.",
      ),
    ).toBeInTheDocument();
  });
});
