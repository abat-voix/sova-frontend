import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCompleteAction } from "@/hooks/use-complete-action";
import { LocaleProvider } from "@/providers/locale-provider";
import type { ActionInstance } from "@/types/action-instance";
import type { BoardOutcome } from "@/types/workflow-board";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const outcome: BoardOutcome = {
  id: "out-1",
  code: "done",
  name: "Выполнено",
  is_comment_required: false,
  is_attachment_required: false,
};

const action = {
  id: "act-1",
  attachments_count: 0,
  workflow_instance: "wf-1",
} as ActionInstance;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{children}</LocaleProvider>
    </QueryClientProvider>
  );
}

describe("useCompleteAction", () => {
  it("posts the outcome without uploading anything", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ workflow_completed: false }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCompleteAction("csrf"), { wrapper });

    act(() => result.current.mutate({ action, outcome }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/processes/action-instances/act-1/complete/",
    );
  });

  it("uploads the attachment before completing when the outcome demands it", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ workflow_completed: false }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCompleteAction("csrf"), { wrapper });

    act(() =>
      result.current.mutate({
        action,
        file: new File(["x"], "scan.pdf"),
        outcome: { ...outcome, is_attachment_required: true },
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/processes/action-attachments/",
    );
    expect(String(fetchMock.mock.calls[1][0])).toContain("/complete/");
  });
});
