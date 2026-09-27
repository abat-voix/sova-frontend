import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResponsibleFeature } from "@/components/action-features/responsible-feature";
import { LocaleProvider } from "@/providers/locale-provider";

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function renderFeature(
  featureCode: "responsible.assign" | "responsible.unassign",
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ResponsibleFeature
          actionInstanceId="action-1"
          csrfToken="csrf-token"
          featureCode={featureCode}
          workflowInstanceId="workflow-1"
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("responsible feature", () => {
  it("loads candidates and assigns the selected manager", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/responsible.assign/initial/")) {
        return json({
          managers: [
            {
              id: 7,
              full_name: "Анна Смирнова",
              email: "anna@example.test",
              from_registry: true,
            },
          ],
        });
      }
      if (url.includes("/features/responsible.assign/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "responsible",
            id: "responsible-1",
            data: { full_name: "Анна Смирнова" },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("responsible.assign");

    fireEvent.click(
      await screen.findByRole("combobox", {
        name: "Ответственный менеджер",
      }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: /Анна Смирнова/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Назначить" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/responsible.assign/execute/"),
      );
      expect(call?.[1]?.body).toBe(JSON.stringify({ manager: 7 }));
      expect(call?.[1]?.headers).toMatchObject({
        "x-csrftoken": "csrf-token",
      });
    });
    expect(
      await screen.findByText(/Назначен ответственный: Анна Смирнова/),
    ).toBeTruthy();
  });

  it("requires confirmation before removing a manager", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/responsible.unassign/initial/")) {
        return json({
          managers: [
            {
              id: 7,
              full_name: "Анна Смирнова",
              email: "anna@example.test",
            },
          ],
        });
      }
      if (url.includes("/features/responsible.unassign/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "responsible",
            id: "responsible-1",
            data: { full_name: "Анна Смирнова" },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("responsible.unassign");

    fireEvent.click(
      await screen.findByRole("combobox", {
        name: "Ответственный менеджер",
      }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: /Анна Смирнова/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Снять ответственного" }),
    );
    expect(
      screen.getByText("Открытые задачи этого менеджера вернутся в общий пул."),
    ).toBeTruthy();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/features/responsible.unassign/execute/"),
      ),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Подтвердить снятие" }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/responsible.unassign/execute/"),
      );
      expect(call?.[1]?.body).toBe(JSON.stringify({ manager: 7 }));
    });
    expect(
      await screen.findByText(/Снят ответственный: Анна Смирнова/),
    ).toBeTruthy();
  });
});
