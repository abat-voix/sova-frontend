import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminTeamsWorkspace } from "@/components/team/admin-teams-workspace";
import { LocaleProvider } from "@/providers/locale-provider";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const user = (id: number, name: string, role: string, head: number | null) => ({
  email: `${id}@example.com`,
  first_name: name,
  full_name: name,
  head:
    head === null
      ? null
      : { email: "h@example.com", full_name: "Руководитель", id: head },
  id,
  is_active: true,
  last_name: "",
  role,
  role_display: null,
});

function stubFetch() {
  const puts: { body: unknown; url: string }[] = [];
  const gets: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PUT") {
        puts.push({ body: JSON.parse(String(init.body)), url });
        return new Response(
          JSON.stringify({ orphaned_kams: [], user: user(0, "", "kam", null) }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      gets.push(url);
      const params = new URL(url, "http://localhost").searchParams;
      if (params.get("head") === "3" && !params.get("search")) {
        // Большая команда: 45 КАМов, три страницы
        return new Response(
          JSON.stringify({
            count: 45,
            next: null,
            previous: null,
            results: [user(1, "Ольга Филинова", "kam", 3)],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      const results = params.get("head")
        ? [user(1, "Ольга Филинова", "kam", 3)]
        : params.get("team") === "free"
          ? [user(2, "Иван Петров", "kam", null)]
          : [
              user(3, "Анна Смирнова", "head", null),
              user(4, "Пётр Совин", "head", null),
            ];
      return new Response(
        JSON.stringify({
          count: results.length,
          next: null,
          previous: null,
          results,
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    }),
  );
  return { gets, puts };
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AdminTeamsWorkspace csrfToken="csrf" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

/** Открывает выпадушку по её подписи и выбирает вариант по названию. */
async function pick(label: string, optionName: string) {
  const comboboxes = screen.getAllByRole("combobox", { name: label });
  fireEvent.click(comboboxes[comboboxes.length - 1]);
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminTeamsWorkspace", () => {
  it("shows the chosen head's team and free kams", async () => {
    stubFetch();
    renderWorkspace();

    await pick("Руководитель", "Анна Смирнова");

    expect(await screen.findByText("Ольга Филинова")).toBeInTheDocument();
    expect(await screen.findByText("Иван Петров")).toBeInTheDocument();
  });

  it("assigns a free kam to the chosen head", async () => {
    const { puts } = stubFetch();
    renderWorkspace();

    await pick("Руководитель", "Анна Смирнова");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Назначить в команду: Иван Петров",
      }),
    );

    await waitFor(() =>
      expect(puts).toEqual([{ body: { head: 3 }, url: "/api/users/2/head/" }]),
    );
  });

  it("removes the head after confirmation", async () => {
    const { puts } = stubFetch();
    renderWorkspace();

    await pick("Руководитель", "Анна Смирнова");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Снять руководителя: Ольга Филинова",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Снять руководителя" }));

    await waitFor(() =>
      expect(puts).toEqual([
        { body: { head: null }, url: "/api/users/1/head/" },
      ]),
    );
  });

  it("starts the next head's team from the first page", async () => {
    const { gets } = stubFetch();
    renderWorkspace();

    await pick("Руководитель", "Анна Смирнова");
    fireEvent.click(
      await screen.findByRole("button", { name: "Следующая страница" }),
    );
    await waitFor(() =>
      expect(
        gets.some((url) => url.includes("head=3") && url.includes("page=2")),
      ).toBe(true),
    );
    await pick("Руководитель", "Пётр Совин");

    await waitFor(() =>
      expect(gets.some((url) => url.includes("head=4"))).toBe(true),
    );
    const firstRequest = gets.find((url) => url.includes("head=4"));
    expect(
      new URL(String(firstRequest), "http://localhost").searchParams.get(
        "page",
      ),
    ).toBe("1");
  });

  it("moves a kam to another head", async () => {
    const { puts } = stubFetch();
    renderWorkspace();

    await pick("Руководитель", "Анна Смирнова");
    fireEvent.click(
      await screen.findByRole("button", { name: "Перевести: Ольга Филинова" }),
    );
    await pick("Новый руководитель", "Пётр Совин");
    fireEvent.click(screen.getByRole("button", { name: "Перевести" }));

    await waitFor(() =>
      expect(puts).toEqual([{ body: { head: 4 }, url: "/api/users/1/head/" }]),
    );
  });
});
