import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskColumn } from "@/components/tasks/task-column";
import { LocaleProvider } from "@/providers/locale-provider";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(count = 0) {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({ count, next: null, previous: null, results: [] }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderColumn(props: Partial<Parameters<typeof TaskColumn>[0]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <TaskColumn
          interactionId={null}
          onOpen={vi.fn()}
          onOutcome={vi.fn()}
          ordering="planned_end"
          scope="mine"
          status="in_progress"
          title="В работе"
          {...props}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("TaskColumn", () => {
  it("requests its own status, ordering and scope", async () => {
    const fetchMock = stubFetch();
    renderColumn();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("status=in_progress");
    expect(url).toContain("ordering=planned_end");
    expect(url).toContain("scope=mine");
  });

  it("shows the server-side count in the header", async () => {
    stubFetch(42);
    renderColumn();

    expect(await screen.findByText("42")).toBeInTheDocument();
  });

  it("passes the completion window through", async () => {
    const fetchMock = stubFetch();
    renderColumn({
      actualEndGte: "2026-08-22",
      ordering: "-actual_end",
      status: "completed",
      title: "Завершено",
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "actual_end__gte=2026-08-22",
    );
  });

  it("explains an empty column when an interaction is selected", async () => {
    stubFetch();
    renderColumn({ interactionId: "in-1" });

    expect(
      await screen.findByText("Нет задач по выбранному взаимодействию"),
    ).toBeInTheDocument();
  });
});
