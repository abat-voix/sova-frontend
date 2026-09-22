import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionRollbackHistory } from "@/components/interactions/rollback-history";
import { LocaleProvider } from "@/providers/locale-provider";
import { actionInstanceFixture as base } from "@/test/fixtures/action-instance";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function record(id: string, actionDefinitionId: string, reason: string) {
  const instance = {
    ...base,
    action: { id: actionDefinitionId, name: "Подписать договор" },
  };

  return {
    id,
    reason,
    created_at: "2026-09-21T12:00:00+03:00",
    created_by: { id: 12, full_name: "Кам Камов" },
    workflow_instance: "wf-1",
    stage_instance: "st-1",
    from_action_instance: instance,
    to_action_instance: instance,
  };
}

function renderHistory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ActionRollbackHistory
          actionDefinitionId="def-1"
          workflowInstanceId="wf-1"
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("ActionRollbackHistory", () => {
  it("shows only the rollbacks of the picked action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              count: 2,
              next: null,
              previous: null,
              results: [
                record("rb-1", "def-1", "Ошиблись исходом"),
                record("rb-2", "def-2", "Чужое действие"),
              ],
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          ),
      ),
    );

    renderHistory();

    expect(await screen.findByText("Ошиблись исходом")).toBeInTheDocument();
    expect(screen.queryByText("Чужое действие")).toBeNull();
  });

  it("renders nothing when the action was never rolled back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              count: 1,
              next: null,
              previous: null,
              results: [record("rb-2", "def-2", "Чужое действие")],
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          ),
      ),
    );

    renderHistory();

    // Ждём, пока запрос отработает, и убеждаемся, что заголовка блока нет.
    expect(await screen.findByTestId("rollback-history")).toBeEmptyDOMElement();
  });
});
