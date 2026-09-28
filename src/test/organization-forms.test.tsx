import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { B2CClientForm } from "@/components/b2c-clients/b2c-client-form";
import { UniversityForm } from "@/components/organizations/university-form";
import { LocaleProvider } from "@/providers/locale-provider";
import type { B2CClient } from "@/types/catalog";

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ csrfToken: "csrf", user: null }),
}));

const client: B2CClient = {
  id: "b1",
  full_name: "ООО «Ромашка»",
  inn: "7700000000",
  email: "info@romashka.ru",
  phone: "+7 900 000-00-02",
  kind: "legal_entity",
  is_active: true,
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-02T10:00:00+03:00",
  rank: 2,
};

type Request = { body: unknown; method: string; url: string };

function stubWrite(response: unknown) {
  const requests: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      requests.push({
        body: JSON.parse(String(init?.body ?? "null")),
        method: init?.method ?? "GET",
        url: String(input),
      });

      return new Response(JSON.stringify(response), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }),
  );

  return requests;
}

function renderForm(form: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{form}</LocaleProvider>
    </QueryClientProvider>,
  );
}

const saveButton = () => screen.getByRole("button", { name: "Сохранить" });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("UniversityForm", () => {
  it("marks the name as required and saves only with it filled", async () => {
    const requests = stubWrite({ id: "u1", name: "МГУ" });
    const onSaved = vi.fn();
    renderForm(
      <UniversityForm onClose={vi.fn()} onSaved={onSaved} university={null} />,
    );

    expect(screen.getByLabelText("Название *")).toBeRequired();
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Название *"), {
      target: { value: "   " },
    });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Название *"), {
      target: { value: " МГУ " },
    });
    expect(saveButton()).toBeEnabled();

    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(requests[0]).toMatchObject({
      body: {
        email: "",
        external_code: null,
        inn: null,
        is_active: true,
        name: "МГУ",
        phone: "",
      },
      method: "POST",
      url: "/api/catalog/universities/",
    });
  });
});

describe("B2CClientForm", () => {
  it("requires the name and the client type for a new client", () => {
    stubWrite(client);
    renderForm(
      <B2CClientForm client={null} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ФИО / наименование *"), {
      target: { value: "Иванов Иван" },
    });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Тип клиента *"), {
      target: { value: "individual" },
    });
    expect(saveButton()).toBeEnabled();
  });

  it("edits an existing client and blocks saving without the name", async () => {
    const requests = stubWrite(client);
    const onSaved = vi.fn();
    renderForm(
      <B2CClientForm client={client} onClose={vi.fn()} onSaved={onSaved} />,
    );

    expect(screen.getByLabelText("ФИО / наименование *")).toHaveValue(
      "ООО «Ромашка»",
    );
    expect(saveButton()).toBeEnabled();

    fireEvent.change(screen.getByLabelText("ФИО / наименование *"), {
      target: { value: "" },
    });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ФИО / наименование *"), {
      target: { value: "ООО «Лютик»" },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(requests[0]).toMatchObject({
      body: { full_name: "ООО «Лютик»", kind: "legal_entity" },
      method: "PATCH",
      url: "/api/catalog/b2c-clients/b1/",
    });
  });
});
