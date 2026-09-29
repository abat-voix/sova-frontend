import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactPersonCreateFeature } from "@/components/action-features/contact-person-create-feature";
import { LocaleProvider } from "@/providers/locale-provider";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ContactPersonCreateFeature", () => {
  it("sends the Telegram handle together with the other fields", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            execution: {},
            target: {
              data: { full_name: "Анна" },
              id: "c1",
              type: "contact_person",
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <ContactPersonCreateFeature
            actionInstanceId="action-1"
            csrfToken="csrf"
            executionNo={1}
            workflowInstanceId="workflow-1"
          />
        </LocaleProvider>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/ФИО/), {
      target: { value: "Анна" },
    });
    fireEvent.change(screen.getByLabelText("Telegram"), {
      target: { value: "@anna_a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить контакт" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      email: "",
      full_name: "Анна",
      phone: "",
      position: "",
      telegram: "@anna_a",
    });
  });
});
