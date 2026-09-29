import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createContactPerson,
  deleteContactPerson,
  getContactPersons,
  getPossibleDuplicates,
  updateContactPerson,
} from "@/lib/api/catalog/contact-persons";

function stubEmptyPage() {
  // Новый ответ на каждый вызов: тело Response читается только один раз.
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>) {
  return new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("contact persons API", () => {
  it("omits filters left at their neutral value", async () => {
    const fetchMock = stubEmptyPage();

    await getContactPersons({ page: 1 });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/api/catalog/contact-persons/");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("page_size")).toBe("20");
    expect(url.searchParams.has("is_active")).toBe(false);
    expect(url.searchParams.has("ordering")).toBe(false);
    expect(url.searchParams.has("search")).toBe(false);
    expect(url.searchParams.has("organization__ids")).toBe(false);
    expect(url.searchParams.has("b2c_client__ids")).toBe(false);
  });

  it("sends activity, counterparty, ordering, and the trimmed search term", async () => {
    const fetchMock = stubEmptyPage();

    await getContactPersons({
      activity: "inactive",
      b2cClientId: "b2c-1",
      ordering: "-created_at",
      page: 3,
      search: "  Иванов  ",
      organizationId: "uni-1",
    });

    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get("is_active")).toBe("false");
    expect(url.searchParams.get("b2c_client__ids")).toBe("b2c-1");
    expect(url.searchParams.get("organization__ids")).toBe("uni-1");
    expect(url.searchParams.get("ordering")).toBe("-created_at");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("search")).toBe("Иванов");
  });

  it("filters by vendor", async () => {
    const fetchMock = stubEmptyPage();

    await getContactPersons({ page: 1, vendorId: "v1" });

    expect(requestedUrl(fetchMock).searchParams.get("vendor__ids")).toBe("v1");
  });

  it("creates, updates, and deletes a person", async () => {
    const fetchMock = stubEmptyPage();

    await createContactPerson(
      {
        email: "a@example.com",
        full_name: "Анна",
        phone: "",
        telegram: "@anna_a",
      },
      "csrf",
    );
    await updateContactPerson("c1", { is_active: false }, "csrf");
    await deleteContactPerson("c1", "csrf");

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][0]).toBe("/api/catalog/contact-persons/");
    expect(calls[0][1].method).toBe("POST");
    expect(JSON.parse(String(calls[0][1].body))).toEqual({
      email: "a@example.com",
      full_name: "Анна",
      phone: "",
      telegram: "@anna_a",
    });
    expect(calls[1][0]).toBe("/api/catalog/contact-persons/c1/");
    expect(calls[1][1].method).toBe("PATCH");
    expect(JSON.parse(String(calls[1][1].body))).toEqual({ is_active: false });
    expect(calls[2][1].method).toBe("DELETE");
  });

  it("asks for possible duplicates only with filled signs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getPossibleDuplicates({
      email: "",
      exclude: "c1",
      fullName: " Анна ",
      phone: "",
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe(
      "/api/catalog/contact-persons/possible-duplicates/",
    );
    expect(url.searchParams.get("full_name")).toBe("Анна");
    expect(url.searchParams.get("exclude")).toBe("c1");
    expect(url.searchParams.has("email")).toBe(false);
  });
});
