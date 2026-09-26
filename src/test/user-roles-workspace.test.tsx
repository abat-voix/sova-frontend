import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UserRolesWorkspace } from "@/components/users/user-roles-workspace";
import { LocaleProvider } from "@/providers/locale-provider";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ csrfToken: "csrf", user: { id: 1 } }),
}));

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

const user = (id: number, name: string, role: string) => ({
  email: `${id}@example.com`,
  first_name: name,
  full_name: name,
  head: null,
  id,
  is_active: true,
  last_name: "",
  role,
  role_display: role,
});

function stubFetch() {
  const puts: { body: unknown; url: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PUT") {
        puts.push({ body: JSON.parse(String(init.body)), url });
        return json({
          orphaned_kams: [
            { email: "kam@example.com", full_name: "Иван Петров", id: 5 },
          ],
          user: user(3, "Анна Смирнова", "kam"),
        });
      }
      if (url.startsWith("/api/users/roles/")) {
        return json([
          { label: "КАМ", value: "kam" },
          { label: "Руководитель", value: "head" },
          { label: "Администратор платформы", value: "platform_admin" },
        ]);
      }
      const results = [
        user(1, "Олег Админов", "platform_admin"),
        user(3, "Анна Смирнова", "head"),
      ];
      return json({
        count: results.length,
        next: null,
        previous: null,
        results,
      });
    }),
  );
  return puts;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <UserRolesWorkspace />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("UserRolesWorkspace", () => {
  it("does not let the admin change their own role", async () => {
    stubFetch();
    renderWorkspace();

    const own = await screen.findByRole("combobox", {
      name: "Новая роль: Олег Админов",
    });

    // Проверяем, что своя строка заблокирована, а чужая — нет
    expect(own).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Новая роль: Анна Смирнова" }),
    ).toBeEnabled();
  });

  it("warns about the head's team and shows kams left without a head", async () => {
    const puts = stubFetch();
    renderWorkspace();

    const select = await screen.findByRole("combobox", {
      name: "Новая роль: Анна Смирнова",
    });
    await waitFor(() =>
      expect(
        screen.getAllByRole("option", { name: "КАМ" }).length,
      ).toBeGreaterThan(0),
    );
    fireEvent.change(select, { target: { value: "kam" } });
    const saveButtons = screen.getAllByRole("button", { name: "Сохранить" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    // Смена роли руководителя требует подтверждения с предупреждением о команде
    expect(
      await screen.findByText(/Руководитель потеряет команду/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Назначить роль" }));

    // Проверяем запрос и плашку с осиротевшими КАМами
    expect(await screen.findByText("Иван Петров")).toBeInTheDocument();
    expect(
      screen.getByText("Команда осталась без руководителя"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Перейти в «Команду»" }),
    ).toHaveAttribute("href", "/team");
    expect(puts).toEqual([
      { body: { role: "kam" }, url: "/api/users/3/role/" },
    ]);
  });
});
