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
import { OrganizationForm } from "@/components/organizations/organization-form";
import { LocaleProvider } from "@/providers/locale-provider";
import type { B2CClient } from "@/types/catalog";

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ csrfToken: "csrf", user: null }),
}));

const client: B2CClient = {
  id: "b1",
  full_name: "Иванов Иван Иванович",
  inn: "770000000000",
  email: "ivanov@example.ru",
  phone: "+7 900 000-00-02",
  is_active: true,
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-02T10:00:00+03:00",
  rank: 2,
  address: { country_code: "", region: "Тюменская область", city: "Тюмень" },
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

describe("OrganizationForm", () => {
  it("marks the name as required and saves only with it filled", async () => {
    const requests = stubWrite({ id: "u1", name: "МГУ" });
    const onSaved = vi.fn();
    renderForm(
      <OrganizationForm
        onClose={vi.fn()}
        onSaved={onSaved}
        organization={null}
      />,
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
        organization_type: "education",
        phone: "",
        legal_address: null,
        actual_address: null,
        actual_same_as_legal: false,
      },
      method: "POST",
      url: "/api/catalog/organizations/",
    });
  });

  it("sends the legal address with coordinates and skips the actual one when it is the same", async () => {
    const requests = stubWrite({ id: "u1", name: "МГУ" });
    const onSaved = vi.fn();
    renderForm(
      <OrganizationForm
        onClose={vi.fn()}
        onSaved={onSaved}
        organization={null}
      />,
    );

    fireEvent.change(screen.getByLabelText("Название *"), {
      target: { value: "МГУ" },
    });
    fireEvent.change(document.getElementById("organization-legal-city")!, {
      target: { value: "Москва" },
    });
    fireEvent.change(
      document.getElementById("organization-legal-coordinates")!,
      { target: { value: "55,703934, 37,528669" } },
    );
    fireEvent.click(
      screen.getByLabelText("Фактический адрес совпадает с юридическим"),
    );
    expect(document.getElementById("organization-actual-city")).toBeNull();
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const body = requests[0].body as Record<string, unknown>;
    expect(body.legal_address).toMatchObject({
      city: "Москва",
      lat: "55.703934",
      lon: "37.528669",
    });
    expect(body.actual_same_as_legal).toBe(true);
    expect(body).not.toHaveProperty("actual_address");
  });

  it("blocks saving while the coordinates cannot be parsed", () => {
    stubWrite({ id: "u1", name: "МГУ" });
    renderForm(
      <OrganizationForm
        onClose={vi.fn()}
        onSaved={vi.fn()}
        organization={null}
      />,
    );

    fireEvent.change(screen.getByLabelText("Название *"), {
      target: { value: "МГУ" },
    });
    fireEvent.change(
      document.getElementById("organization-legal-coordinates")!,
      { target: { value: "север" } },
    );

    expect(saveButton()).toBeDisabled();
  });
});

describe("B2CClientForm", () => {
  it("requires the full name for a new client", () => {
    stubWrite(client);
    renderForm(
      <B2CClientForm client={null} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ФИО *"), {
      target: { value: "Иванов Иван" },
    });
    expect(saveButton()).toBeEnabled();
  });

  it("edits an existing client and blocks saving without the name", async () => {
    const requests = stubWrite(client);
    const onSaved = vi.fn();
    renderForm(
      <B2CClientForm client={client} onClose={vi.fn()} onSaved={onSaved} />,
    );

    expect(screen.getByLabelText("ФИО *")).toHaveValue("Иванов Иван Иванович");
    expect(saveButton()).toBeEnabled();

    fireEvent.change(screen.getByLabelText("ФИО *"), {
      target: { value: "" },
    });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ФИО *"), {
      target: { value: "Петров Пётр Петрович" },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(requests[0]).toMatchObject({
      body: { full_name: "Петров Пётр Петрович" },
      method: "PATCH",
      url: "/api/catalog/b2c-clients/b1/",
    });
  });
});
