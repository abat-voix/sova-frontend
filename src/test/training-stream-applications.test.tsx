import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
