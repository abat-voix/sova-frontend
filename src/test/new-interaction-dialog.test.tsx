import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NewInteractionDialog } from "@/components/interactions/new-interaction-dialog";
import { LocaleProvider } from "@/providers/locale-provider";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import type { Interaction } from "@/types/workflow-board";

type Call = { body: unknown; url: string };

const page = (results: { id: string; name: string }[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

/** Каталог: вуз, одно направление, одна программа, два продукта. */
const catalog: Record<string, unknown> = {
  "/api/catalog/universities/": page([{ id: "u-1", name: "Демо-университет" }]),
  "/api/catalog/b2c-clients/": {
    count: 1,
    next: null,
    previous: null,
    results: [{ full_name: "Иванов И. И.", id: "c-1" }],
  },
  "/api/catalog/directions/": page([{ id: "dir-1", name: "Инфраструктура" }]),
  "/api/catalog/programs/": page([{ id: "prog-1", name: "Основы DevOps" }]),
  "/api/catalog/products/": page([
    { id: "prod-1", name: "Демо-ПО 1" },
    { id: "prod-2", name: "Демо-ПО 2" },
  ]),
  "/api/users/": {
    count: 2,
    next: null,
    previous: null,
    results: [
      { full_name: "Ольга Филинова", id: 7, role: "kam" },
      { full_name: "Иван Петров", id: 9, role: "kam" },
    ],
  },
};

const user = (role: AuthenticatedUser["role"]): AuthenticatedUser => ({
  displayName: "Пётр Совин",
  email: "sovin@example.com",
  firstName: "Пётр",
  id: 3,
  isStaff: false,
  lastName: "Совин",
  role,
  roleDisplay: null,
  roles: role ? [role] : [],
});

function stubFetch(failUrl?: string) {
  const calls: Call[] = [];
  let nextId = 0;

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const path = url.split("?")[0];

      if (init?.method === "POST") {
        calls.push({ body: JSON.parse(String(init.body)), url: path });

        if (failUrl && path === failUrl) {
          return new Response(
            JSON.stringify({ code: "invalid", detail: "Так нельзя." }),
            {
              headers: { "content-type": "application/json" },
              status: 400,
            },
          );
        }

        nextId += 1;

        return new Response(JSON.stringify({ id: `new-${nextId}` }), {
          headers: { "content-type": "application/json" },
          status: 201,
        });
      }

      return new Response(JSON.stringify(catalog[path] ?? page([])), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);

  return calls;
}

function renderDialog(
  role: AuthenticatedUser["role"] = "head",
  editInteraction?: Interaction,
) {
  const onCreated = vi.fn();
  const onUpdated = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <NewInteractionDialog
          csrfToken="csrf"
          currentUser={user(role)}
          editInteraction={editInteraction}
          onClose={() => undefined}
          onCreated={onCreated}
          onUpdated={onUpdated}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  return { onCreated, onUpdated };
}

/** Открывает выпадушку по её подписи и выбирает вариант по названию. */
async function pick(label: string, optionName: string) {
  const comboboxes = screen.getAllByRole("combobox", { name: label });
  fireEvent.click(comboboxes[comboboxes.length - 1]);
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.click(option);
}

function submitButton() {
  return screen.getByRole("button", { name: "Создать" });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NewInteractionDialog", () => {
  it("creates an interaction with only a counterparty", async () => {
    const calls = stubFetch();
    const { onCreated } = renderDialog();

    expect(submitButton()).toBeDisabled();

    await pick("Контрагент", "Демо-университет");
    fireEvent.change(screen.getByLabelText("Комментарий"), {
      target: { value: "  Пилот  " },
    });

    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("new-1"));
    expect(calls).toEqual([
      {
        body: { comment: "Пилот", is_active: true, university: "u-1" },
        url: "/api/interactions/interactions/",
      },
    ]);
  });

  it("lets a head pick a manager and assigns them after creation", async () => {
    const calls = stubFetch();
    renderDialog("head");

    await pick("Контрагент", "Демо-университет");
    await pick("Ответственные", "Ольга Филинова");

    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toEqual({
      // manager — число, хотя выпадушка работает со строковым id.
      body: { manager: 7 },
      url: "/api/interactions/interactions/new-1/assign-responsible/",
    });
  });

  it("assigns every picked manager after creation", async () => {
    const calls = stubFetch();
    renderDialog("head");

    await pick("Контрагент", "Демо-университет");
    await pick("Ответственные", "Ольга Филинова");
    fireEvent.click(await screen.findByRole("option", { name: "Иван Петров" }));

    expect(screen.getByText("Ольга Филинова, Иван Петров")).toBeInTheDocument();
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls.slice(1)).toEqual([
      {
        body: { manager: 7 },
        url: "/api/interactions/interactions/new-1/assign-responsible/",
      },
      {
        body: { manager: 9 },
        url: "/api/interactions/interactions/new-1/assign-responsible/",
      },
    ]);
  });

  it("adds new managers and unassigns removed ones when editing", async () => {
    const calls = stubFetch();
    const { onUpdated } = renderDialog("head", {
      b2c_client: null,
      comment: "",
      created_at: "2026-01-10T10:00:00Z",
      current_responsibles: [
        {
          assigned_at: "2026-01-10T10:00:00Z",
          id: "resp-1",
          manager: { full_name: "Ольга Филинова", id: 7 },
        },
      ],
      directions_count: 0,
      id: "int-1",
      is_active: true,
      products_count: 0,
      programs_count: 0,
      university: { id: "u-1", name: "Демо-университет" },
      updated_at: "2026-01-10T10:00:00Z",
    });

    // Снимаем Ольгу и добавляем Ивана в одном мультиселекте.
    await pick("Ответственные", "Ольга Филинова");
    fireEvent.click(await screen.findByRole("option", { name: "Иван Петров" }));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    // Сначала назначение, потом снятие — взаимодействие не остаётся ничьим.
    expect(calls).toEqual([
      {
        body: { manager: 9 },
        url: "/api/interactions/interactions/int-1/assign-responsible/",
      },
      {
        body: { manager: 7 },
        url: "/api/interactions/interactions/int-1/unassign-responsible/",
      },
    ]);
  });

  it("gives a platform admin the same manager picker", async () => {
    stubFetch();
    renderDialog("platform_admin");

    expect(
      screen.getByRole("combobox", { name: "Ответственные" }),
    ).toBeInTheDocument();
  });

  it("locks a kam to themselves with no picker at all", async () => {
    const calls = stubFetch();
    renderDialog("kam");

    expect(
      screen.queryByRole("combobox", { name: "Ответственные" }),
    ).toBeNull();
    expect(screen.getByText("Пётр Совин")).toBeInTheDocument();

    await pick("Контрагент", "Демо-университет");
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(calls).toHaveLength(2));
    // КАМ назначается сам — id берётся из сессии, /api/users/ не запрашивается.
    expect(calls[1]).toEqual({
      body: { manager: 3 },
      url: "/api/interactions/interactions/new-1/assign-responsible/",
    });
  });

  it("sends b2c_client when the counterparty kind is switched", async () => {
    const calls = stubFetch();
    renderDialog();

    fireEvent.click(screen.getByLabelText("B2C-клиент"));
    await pick("Контрагент", "Иванов И. И.");

    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({
      b2c_client: "c-1",
      comment: "",
      is_active: true,
    });
  });

  it("keeps a program locked until its direction is chosen", async () => {
    stubFetch();
    renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: "Добавить направление" }),
    );

    expect(
      screen.getByRole("button", { name: "Сначала выберите направление" }),
    ).toBeDisabled();

    await pick("Направление", "Инфраструктура");

    expect(
      screen.getByRole("button", { name: "Добавить программу" }),
    ).toBeEnabled();
  });

  it("creates the whole direction → program → product chain in order", async () => {
    const calls = stubFetch();
    renderDialog();

    await pick("Контрагент", "Демо-университет");
    fireEvent.click(
      screen.getByRole("button", { name: "Добавить направление" }),
    );
    await pick("Направление", "Инфраструктура");
    fireEvent.click(screen.getByRole("button", { name: "Добавить программу" }));
    await pick("Программа", "Основы DevOps");
    fireEvent.click(screen.getByRole("button", { name: "Добавить продукт" }));
    await pick("Продукт", "Демо-ПО 1");

    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(calls).toHaveLength(4));
    expect(calls.map((call) => call.url)).toEqual([
      "/api/interactions/interactions/",
      "/api/interactions/interaction-directions/",
      "/api/interactions/interaction-programs/",
      "/api/interactions/interaction-products/",
    ]);
    expect(calls[3].body).toEqual({
      interaction: "new-1",
      interaction_program: "new-3",
      product: "prod-1",
    });
  });

  it("hides a product that is already picked elsewhere in the tree", async () => {
    stubFetch();
    renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: "Добавить направление" }),
    );
    await pick("Направление", "Инфраструктура");
    fireEvent.click(screen.getByRole("button", { name: "Добавить программу" }));
    await pick("Программа", "Основы DevOps");
    fireEvent.click(screen.getByRole("button", { name: "Добавить продукт" }));
    await pick("Продукт", "Демо-ПО 1");

    fireEvent.click(screen.getByRole("button", { name: "Добавить продукт" }));
    const combos = screen.getAllByRole("combobox", { name: "Продукт" });
    fireEvent.click(combos[combos.length - 1]);

    // Пара (взаимодействие, продукт) уникальна — «Демо-ПО 1» больше не предлагаем.
    const list = await screen.findByRole("listbox", { name: "Продукт" });
    expect(
      await within(list).findByRole("option", { name: "Демо-ПО 2" }),
    ).toBeInTheDocument();
    expect(
      within(list).queryByRole("option", { name: "Демо-ПО 1" }),
    ).toBeNull();
  });

  it("offers a retry that only sends what is missing after a partial failure", async () => {
    const calls = stubFetch("/api/interactions/interaction-directions/");
    const { onCreated } = renderDialog();

    await pick("Контрагент", "Демо-университет");
    fireEvent.click(
      screen.getByRole("button", { name: "Добавить направление" }),
    );
    await pick("Направление", "Инфраструктура");

    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    expect(
      await screen.findByText(/часть позиций не добавлена/),
    ).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(calls).toHaveLength(2);

    // Повтор не создаёт второе взаимодействие — шлёт только направление.
    vi.unstubAllGlobals();
    const retryCalls = stubFetch();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

    await waitFor(() => expect(retryCalls).toHaveLength(1));
    expect(retryCalls[0]).toEqual({
      body: { direction: "dir-1", interaction: "new-1" },
      url: "/api/interactions/interaction-directions/",
    });
  });
});
