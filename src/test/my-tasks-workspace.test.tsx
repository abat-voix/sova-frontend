import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MyTasksWorkspace } from "@/components/tasks/my-tasks-workspace";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function stubApi(role: "kam" | "head") {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const body = url.startsWith("/api/auth/me/")
      ? {
          authenticated: true,
          csrfToken: "csrf",
          user: {
            id: 1,
            email: "u@example.com",
            firstName: "Иван",
            lastName: "Иванов",
            displayName: "Иван Иванов",
            isStaff: false,
            role,
            roleDisplay: "",
            roles: [],
          },
        }
      : url.startsWith("/api/interactions/interactions/")
        ? {
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: "in-1",
                university: { id: "u-1", name: "МГУ" },
                b2c_client: null,
                created_at: "2026-09-01T09:00:00+03:00",
                updated_at: "2026-09-01T09:00:00+03:00",
                current_responsible: null,
                directions_count: 0,
                programs_count: 0,
                products_count: 0,
              },
            ],
          }
        : { count: 0, next: null, previous: null, results: [] };

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <MyTasksWorkspace />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function taskUrls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.startsWith("/api/processes/action-instances/"));
}

describe("MyTasksWorkspace", () => {
  it("opens three columns scoped to the current user", async () => {
    const fetchMock = stubApi("head");
    renderWorkspace();

    await waitFor(() => expect(taskUrls(fetchMock).length).toBe(3));
    const urls = taskUrls(fetchMock);
    expect(urls.some((url) => url.includes("status=pending"))).toBe(true);
    expect(urls.some((url) => url.includes("status=in_progress"))).toBe(true);
    expect(urls.some((url) => url.includes("status=completed"))).toBe(true);
    expect(urls.every((url) => url.includes("scope=mine"))).toBe(true);
    expect(urls.filter((url) => url.includes("actual_end__gte=")).length).toBe(
      1,
    );
  });

  it("switches the scope for a head", async () => {
    const fetchMock = stubApi("head");
    renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "Все" }));

    await waitFor(() =>
      expect(taskUrls(fetchMock).some((url) => url.includes("scope=all"))).toBe(
        true,
      ),
    );
  });

  it("hides the scope switch from a KAM", async () => {
    stubApi("kam");
    renderWorkspace();

    expect(await screen.findByText("МГУ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Все" })).toBeNull();
  });

  it("filters the columns by the picked interaction and back", async () => {
    const fetchMock = stubApi("head");
    renderWorkspace();

    fireEvent.click(await screen.findByText("МГУ"));

    await waitFor(() =>
      expect(
        taskUrls(fetchMock).some((url) =>
          url.includes("interaction__ids=in-1"),
        ),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: "Все взаимодействия" }));

    await waitFor(() =>
      expect(
        taskUrls(fetchMock).filter((url) => !url.includes("interaction__ids"))
          .length,
      ).toBeGreaterThan(3),
    );
  });
});
