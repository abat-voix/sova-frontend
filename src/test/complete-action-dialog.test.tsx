import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompleteActionDialog } from "@/components/tasks/complete-action-dialog";
import { LocaleProvider } from "@/providers/locale-provider";
import { actionInstanceFixture as base } from "@/test/fixtures/action-instance";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const outcome = {
  id: "out-2",
  code: "rejected",
  name: "Отказ",
  is_comment_required: true,
  is_attachment_required: false,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <CompleteActionDialog
          action={base}
          csrfToken="csrf"
          onClose={onClose}
          outcome={outcome}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  return onClose;
}

describe("CompleteActionDialog", () => {
  it("keeps the submit button disabled until the required comment is typed", () => {
    renderDialog();

    const submit = screen.getByRole("button", { name: "Завершить действие" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Комментарий/), {
      target: { value: "Клиент отказался" },
    });

    expect(submit).toBeEnabled();
  });

  it("sends the comment with the outcome and closes", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ workflow_completed: false }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onClose = renderDialog();

    fireEvent.change(screen.getByLabelText(/Комментарий/), {
      target: { value: "Клиент отказался" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Завершить действие" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      comment: "Клиент отказался",
      outcome: "out-2",
    });
  });
});
