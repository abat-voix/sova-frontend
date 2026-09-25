import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HeadTeamWorkspace } from "@/components/team/head-team-workspace";
import { LocaleProvider } from "@/providers/locale-provider";

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (message: string) => toastError(message), success: vi.fn() },
}));

const kam = (id: number, name: string, head: number | null = null) => ({
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
  role: "kam",
  role_display: "КАМ",
});

function stubFetch(postStatus = 200, postBody: unknown = {}) {
  const posts: string[] = [];
  const gets: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        posts.push(url);
        return new Response(JSON.stringify(postBody), {
          headers: { "content-type": "application/json" },
          status: postStatus,
        });
      }
      gets.push(url);
      const team = new URL(url, "http://localhost").searchParams.get("team");
      const results =
        team === "mine"
          ? [kam(1, "Ольга Филинова", 3)]
          : [kam(2, "Иван Петров")];
      return new Response(
        JSON.stringify({ count: 1, next: null, previous: null, results }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    }),
  );
  return { gets, posts };
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <HeadTeamWorkspace csrfToken="csrf" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  toastError.mockReset();
});

describe("HeadTeamWorkspace", () => {
  it("lists my team and free kams separately", async () => {
    stubFetch();
    renderWorkspace();

    const mine = await screen.findByRole("table", { name: "Моя команда" });
    const free = await screen.findByRole("table", { name: "Свободные КАМы" });
    expect(await within(mine).findByText("Ольга Филинова")).toBeInTheDocument();
    expect(await within(free).findByText("Иван Петров")).toBeInTheDocument();
  });

  it("claims a free kam and refetches the lists", async () => {
    const { gets, posts } = stubFetch();
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Добавить в команду: Иван Петров",
      }),
    );

    await waitFor(() => expect(posts).toEqual(["/api/users/2/claim/"]));
    await waitFor(() => expect(gets.length).toBeGreaterThan(2));
  });

  it("asks for confirmation before releasing a kam", async () => {
    const { posts } = stubFetch();
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Отпустить: Ольга Филинова" }),
    );
    expect(posts).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Отпустить" }));

    await waitFor(() => expect(posts).toEqual(["/api/users/1/release/"]));
  });

  it("explains a kam already taken by another head", async () => {
    stubFetch(409, {
      code: "kam_has_head",
      detail: "У КАМа уже есть руководитель.",
    });
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Добавить в команду: Иван Петров",
      }),
    );

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Этого КАМа уже забрал другой руководитель. Список обновлён.",
      ),
    );
  });
});
