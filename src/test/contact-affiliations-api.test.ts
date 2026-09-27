import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAffiliation,
  deleteAffiliation,
  getOrganizationAffiliations,
  updateAffiliation,
} from "@/lib/api/catalog/contact-affiliations";

function stubResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), {
          headers: { "content-type": "application/json" },
          status,
        }),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function call(fetchMock: ReturnType<typeof vi.fn>) {
  const [input, init] = fetchMock.mock.calls[0] as [string, RequestInit?];

  return {
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    method: init?.method ?? "GET",
    url: new URL(input, "http://localhost"),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("contact affiliations API", () => {
  it("lists affiliations of one organization by its own endpoint and filter", async () => {
    const fetchMock = stubResponse({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "a1",
          contact: {
            id: "c1",
            full_name: "Анна",
            email: "",
            phone: "",
            telegram: "",
            is_active: true,
          },
          university: { id: "u1", name: "МГУ" },
          position: "Проректор",
          preferred_channels: ["email"],
          created_at: "2026-09-01T10:00:00+03:00",
          updated_at: "2026-09-01T10:00:00+03:00",
        },
      ],
    });

    const page = await getOrganizationAffiliations({
      activeContactsOnly: true,
      organization: { id: "u1", type: "university" },
      page: 2,
      search: "  Анна ",
    });

    const { url } = call(fetchMock);
    expect(url.pathname).toBe("/api/catalog/university-contacts/");
    expect(url.searchParams.get("university__ids")).toBe("u1");
    expect(url.searchParams.get("contact__is_active")).toBe("true");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("search")).toBe("Анна");
    // У вуза продуктов нет — модуль отдаёт пустой список, а не undefined
    expect(page.results[0].products).toEqual([]);
  });

  it("uses the vendor endpoint and keeps inactive contacts when asked", async () => {
    const fetchMock = stubResponse({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    await getOrganizationAffiliations({
      organization: { id: "v1", type: "vendor" },
      page: 1,
    });

    const { url } = call(fetchMock);
    expect(url.pathname).toBe("/api/catalog/vendor-contacts/");
    expect(url.searchParams.get("vendor__ids")).toBe("v1");
    expect(url.searchParams.has("contact__is_active")).toBe(false);
  });

  it("creates an affiliation with the organization field of its type", async () => {
    const fetchMock = stubResponse({ id: "a1" }, 201);

    await createAffiliation(
      {
        contactId: "c1",
        organization: { id: "b1", type: "b2c_client" },
        position: "Директор",
        preferredChannels: ["phone"],
      },
      "csrf",
    );

    const { body, method, url } = call(fetchMock);
    expect(method).toBe("POST");
    expect(url.pathname).toBe("/api/catalog/b2c-client-contacts/");
    expect(body).toEqual({
      b2c_client: "b1",
      contact: "c1",
      position: "Директор",
      preferred_channels: ["phone"],
    });
  });

  it("sends products only for a vendor affiliation", async () => {
    const fetchMock = stubResponse({ id: "a1" }, 201);

    await createAffiliation(
      {
        contactId: "c1",
        organization: { id: "v1", type: "vendor" },
        position: "",
        preferredChannels: [],
        productIds: ["p1", "p2"],
      },
      "csrf",
    );

    expect(call(fetchMock).body).toMatchObject({
      vendor: "v1",
      products: ["p1", "p2"],
    });
  });

  it("updates and deletes an affiliation by its type", async () => {
    const patchMock = stubResponse({ id: "a1" });
    await updateAffiliation(
      "vendor",
      "a1",
      {
        position: "Архитектор",
        preferredChannels: ["telegram"],
        productIds: ["p1"],
      },
      "csrf",
    );
    expect(call(patchMock)).toMatchObject({
      body: {
        position: "Архитектор",
        preferred_channels: ["telegram"],
        products: ["p1"],
      },
      method: "PATCH",
    });
    expect(call(patchMock).url.pathname).toBe(
      "/api/catalog/vendor-contacts/a1/",
    );

    vi.unstubAllGlobals();
    const deleteMock = stubResponse(null, 204);
    await deleteAffiliation("university", "a2", "csrf");
    expect(call(deleteMock).method).toBe("DELETE");
    expect(call(deleteMock).url.pathname).toBe(
      "/api/catalog/university-contacts/a2/",
    );
  });
});
