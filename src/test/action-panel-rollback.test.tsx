import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BoardDetails } from "@/components/interactions/board-details";
import { actionInstanceToBoardAction } from "@/lib/workflow/action-instance-to-board";
import { LocaleProvider } from "@/providers/locale-provider";
import { actionInstanceFixture as base } from "@/test/fixtures/action-instance";
import type { ActionInstance } from "@/types/action-instance";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const completed = {
  ...base,
  available_outcomes: [],
  status: "completed",
  result: {
    outcome_name: "Выполнено",
    comment: "",
    created_at: "2026-09-20T10:00:00+03:00",
    created_by: null,
  },
} satisfies ActionInstance;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel(instance: ActionInstance) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <BoardDetails
          csrfToken="csrf"
          selection={{
            kind: "action",
            action: actionInstanceToBoardAction(instance),
          }}
          workflowInstanceId="wf-1"
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("ActionPanel rollback", () => {
  it("offers a rollback only for a completed action", () => {
    renderPanel(base);

    expect(
      screen.queryByRole("button", { name: "Откатить действие" }),
    ).toBeNull();
  });

  it("requires a reason before sending", () => {
    renderPanel(completed);

    fireEvent.click(screen.getByRole("button", { name: "Откатить действие" }));

    expect(
      screen.getByRole("button", { name: "Подтвердить откат" }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Причина/), {
      target: { value: "Ошиблись исходом" },
    });

    expect(
      screen.getByRole("button", { name: "Подтвердить откат" }),
    ).toBeEnabled();
  });

  it("sends the reason to the cancel endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderPanel(completed);

    fireEvent.click(screen.getByRole("button", { name: "Откатить действие" }));
    fireEvent.change(screen.getByLabelText(/Причина/), {
      target: { value: "Ошиблись исходом" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить откат" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/processes/action-instances/act-1/cancel/",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      reason: "Ошиблись исходом",
    });
  });

  it("shows why the backend refused", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify({ code: "has_completed_dependent" }), {
            headers: { "content-type": "application/json" },
            status: 400,
          }),
      ),
    );
    renderPanel(completed);

    fireEvent.click(screen.getByRole("button", { name: "Откатить действие" }));
    fireEvent.change(screen.getByLabelText(/Причина/), {
      target: { value: "Ошиблись исходом" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить откат" }));

    expect(
      await screen.findByText(
        "От этого действия зависит уже выполненное действие — сначала откатите его.",
      ),
    ).toBeInTheDocument();
  });
});
