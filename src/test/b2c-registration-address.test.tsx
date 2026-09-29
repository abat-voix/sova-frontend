import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { B2CRegistrationAddress } from "@/components/b2c-clients/b2c-registration-address";
import type { PolicyAction } from "@/lib/permissions";
import { LocaleProvider } from "@/providers/locale-provider";
import { kamPermissions } from "@/test/fixtures/permissions";

const auth = vi.hoisted(() => ({ permissions: [] as PolicyAction[] }));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: auth.permissions,
      role: "platform_admin",
    },
  }),
}));

const address = {
  country_code: "",
  region: "Тюменская область",
  city: "Тюмень",
  street: "ул. Мира",
  house: "5",
  apartment: "12",
  postal_code: "625000",
};

function stubAddress() {
  const requests: { method: string; url: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      requests.push({
        body,
        method: init?.method ?? "GET",
        url: String(input),
      });
      return new Response(JSON.stringify({ ...address, ...(body ?? {}) }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }),
  );
  return requests;
}

function renderAddress() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LocaleProvider>
        <B2CRegistrationAddress clientId="b1" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("B2CRegistrationAddress", () => {
  it("is hidden without the personal data permission", () => {
    auth.permissions = kamPermissions;
    const requests = stubAddress();
    renderAddress();

    expect(screen.queryByText("Адрес регистрации")).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it("loads the address only on explicit request and saves changes", async () => {
    auth.permissions = [
      "catalog.personal_data.read",
      "catalog.personal_data.update",
    ];
    const requests = stubAddress();
    renderAddress();

    expect(requests).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Показать" }));
    expect(
      await screen.findByText(
        "625000, Тюменская область, Тюмень, ул. Мира, 5, 12",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Изменить" }));
    fireEvent.change(screen.getByLabelText("Квартира"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(requests.at(-1)).toMatchObject({
        body: { apartment: "14", street: "ул. Мира" },
        method: "PUT",
        url: "/api/catalog/b2c-clients/b1/registration-address/",
      }),
    );
    expect(
      await screen.findByText(
        "625000, Тюменская область, Тюмень, ул. Мира, 5, 14",
      ),
    ).toBeInTheDocument();
  });
});
