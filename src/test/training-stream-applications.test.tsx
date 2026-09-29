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

import { TrainingStreamApplications } from "@/components/training/training-stream-applications";
import { LocaleProvider } from "@/providers/locale-provider";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const application = {
  id: "a1",
  stream: "s1",
  stream_name: "Поток",
  status: "new",
  comment: "",
  participants: [],
  created_by: null,
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-01T10:00:00+03:00",
};

type Call = { method: string; url: string };

function stubApplications() {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ method, url });
      if (method === "DELETE") return new Response(null, { status: 204 });

      const body =
        method === "POST"
          ? { ...application, status: "cancelled" }
          : { count: 1, next: null, previous: null, results: [application] };

      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }),
  );

  return calls;
}

function renderApplications() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <TrainingStreamApplications
          canCreate
          canUpdate
          csrfToken="csrf"
          streamId="s1"
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

const writes = (calls: Call[]) => calls.filter((call) => call.method !== "GET");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TrainingStreamApplications", () => {
  it("cancels an application only after the warning is confirmed", async () => {
    const calls = stubApplications();
    renderApplications();

    fireEvent.click(
      await screen.findByRole("button", { name: "Отменить заявку" }),
    );

    // Сначала — предупреждение о последствиях, запроса ещё нет
    expect(
      screen.getByText(
        "Отменить заявку? Участники перестанут считаться зачисленными. Добавлять участников и отмечать оплату по этой заявке будет нельзя.",
      ),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Не отменять" }));
    expect(writes(calls)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Отменить заявку" }));
    fireEvent.click(screen.getByRole("button", { name: "Отменить заявку" }));

    await waitFor(() =>
      expect(writes(calls)).toEqual([
        { method: "POST", url: "/api/training/applications/a1/cancel/" },
      ]),
    );
  });

  it("explains what is deleted before deleting an application", async () => {
    const calls = stubApplications();
    renderApplications();

    fireEvent.click(await screen.findByRole("button", { name: "Удалить" }));

    expect(
      screen.getByText("Заявка и её участники будут удалены безвозвратно."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

    await waitFor(() =>
      expect(writes(calls)).toEqual([
        { method: "DELETE", url: "/api/training/applications/a1/" },
      ]),
    );
  });
});

describe("TrainingStreamApplications new learner", () => {
  function stubNewLearner(onPost: (body: Record<string, unknown>) => Response) {
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body));
          posts.push({ ...body, url });
          return onPost(body);
        }
        return new Response(
          JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [application],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
    );
    return posts;
  }

  const created = () =>
    new Response(JSON.stringify({ id: "al1" }), {
      headers: { "content-type": "application/json" },
      status: 201,
    });

  async function openNewLearner() {
    fireEvent.click(
      await screen.findByRole("button", { name: "Добавить участника" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Новый обучающийся" }));
    const dialog = screen.getByRole("dialog", { name: "Новый обучающийся" });
    fireEvent.change(within(dialog).getByLabelText(/Фамилия/), {
      target: { value: "Иванов" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Имя/), {
      target: { value: "Иван" },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "ivan@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    return dialog;
  }

  it("creates a learner right inside the application", async () => {
    const posts = stubNewLearner(created);
    renderApplications();

    await openNewLearner();

    await waitFor(() =>
      expect(posts).toEqual([
        {
          application: "a1",
          is_paid: false,
          new_learner: {
            email: "ivan@example.com",
            first_name: "Иван",
            is_active: true,
            last_name: "Иванов",
            middle_name: "",
            phone: "",
          },
          url: "/api/training/application-learners/",
        },
      ]),
    );
  });

  it("adds the existing learner when the contacts are taken", async () => {
    const posts = stubNewLearner((body) =>
      body.new_learner
        ? new Response(
            JSON.stringify({
              code: "learner_exists",
              detail: "Обучающийся с такими контактами уже есть: Иванов Иван.",
              learner: "l7",
            }),
            { headers: { "content-type": "application/json" }, status: 409 },
          )
        : created(),
    );
    renderApplications();

    const dialog = await openNewLearner();
    fireEvent.click(
      await within(dialog).findByRole("button", {
        name: "Добавить найденного",
      }),
    );

    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual({
      application: "a1",
      is_paid: false,
      learner: "l7",
      url: "/api/training/application-learners/",
    });
  });

  it("shows active applications by default and cancelled ones on their tab", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              count: 2,
              next: null,
              previous: null,
              results: [
                { ...application, comment: "Действующая заявка" },
                {
                  ...application,
                  id: "a2",
                  status: "cancelled",
                  comment: "Отменённая заявка",
                },
              ],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
      ),
    );
    renderApplications();

    expect(await screen.findByText("Действующая заявка")).toBeInTheDocument();
    expect(screen.queryByText("Отменённая заявка")).toBeNull();
    expect(
      screen.getByRole("tab", { name: "Действующие · 1" }),
    ).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Отменённые · 1" }));

    expect(screen.getByText("Отменённая заявка")).toBeInTheDocument();
    expect(screen.queryByText("Действующая заявка")).toBeNull();
  });
});
