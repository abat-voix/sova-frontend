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

import { ContactsWorkspace } from "@/components/contacts/contacts-workspace";
import { LocaleProvider } from "@/providers/locale-provider";
import type { ContactPerson } from "@/types/contact-person";

const universityContact: ContactPerson = {
  id: "c1",
  full_name: "Анна Иванова",
  position: "Проректор",
  email: "anna@example.com",
  phone: "+7 900 000-00-01",
  is_active: true,
  university: { id: "u1", name: "Тюменский университет" },
  b2c_client: null,
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-02T10:00:00+03:00",
};

const b2cContact: ContactPerson = {
  id: "c2",
  full_name: "Борис Петров",
  position: "",
  email: "",
  phone: "",
  is_active: false,
  university: null,
  b2c_client: { id: "b1", full_name: "ООО «Ромашка»", kind: "legal_entity" },
  created_at: "2026-09-03T10:00:00+03:00",
  updated_at: "2026-09-03T10:00:00+03:00",
};

/** Запоминает адреса запросов, чтобы проверять параметры отбора и сортировки. */
function stubCatalog() {
  const urls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);

    const body = url.includes("/contact-persons/c1/")
      ? universityContact
      : {
          count: 2,
          next: null,
          previous: null,
          results: [universityContact, b2cContact],
        };

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  return urls;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ContactsWorkspace />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

/** Последний запрос списка: запросы карточки сюда попадать не должны. */
function lastListUrl(urls: string[]) {
  const listUrls = urls.filter((url) => url.includes("contact-persons/?"));

  return new URL(listUrls[listUrls.length - 1], "http://localhost");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ContactsWorkspace", () => {
  it("shows contacts of both counterparty kinds with the page summary", async () => {
    stubCatalog();
    renderWorkspace();

    expect(await screen.findByText("Анна Иванова")).toBeInTheDocument();
    expect(screen.getByText("Тюменский университет")).toBeInTheDocument();
    expect(screen.getByText("ООО «Ромашка»")).toBeInTheDocument();
    expect(screen.getByText("Строки 1–2 из 2")).toBeInTheDocument();
  });

  it("opens the contact card in a drawer when a row is picked", async () => {
    const urls = stubCatalog();
    renderWorkspace();

    fireEvent.click(await screen.findByText("Анна Иванова"));

    const drawer = await screen.findByRole("dialog");
    expect(
      within(drawer).getByRole("heading", { name: "Анна Иванова" }),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("anna@example.com")).toBeInTheDocument();
    await waitFor(() =>
      expect(urls).toContain("/api/catalog/contact-persons/c1/"),
    );

    fireEvent.click(within(drawer).getByRole("button", { name: "Закрыть" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("asks the catalog for the reversed order after a second click on a header", async () => {
    const urls = stubCatalog();
    renderWorkspace();

    await screen.findByText("Анна Иванова");
    expect(lastListUrl(urls).searchParams.get("ordering")).toBe("full_name");

    fireEvent.click(screen.getByRole("button", { name: /ФИО/ }));

    await waitFor(() =>
      expect(lastListUrl(urls).searchParams.get("ordering")).toBe("-full_name"),
    );
  });

  it("filters the catalog by activity", async () => {
    const urls = stubCatalog();
    renderWorkspace();

    await screen.findByText("Анна Иванова");
    expect(lastListUrl(urls).searchParams.has("is_active")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Активные" }));

    await waitFor(() =>
      expect(lastListUrl(urls).searchParams.get("is_active")).toBe("true"),
    );
  });
});
