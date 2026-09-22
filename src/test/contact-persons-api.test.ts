import { afterEach, describe, expect, it, vi } from "vitest";

import { getContactPersons } from "@/lib/api/catalog/contact-persons";

function stubEmptyPage() {
  const fetchMock = vi.fn().mockResolvedValue(
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
    expect(url.searchParams.has("university__ids")).toBe(false);
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
      universityId: "uni-1",
    });

    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get("is_active")).toBe("false");
    expect(url.searchParams.get("b2c_client__ids")).toBe("b2c-1");
    expect(url.searchParams.get("university__ids")).toBe("uni-1");
    expect(url.searchParams.get("ordering")).toBe("-created_at");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("search")).toBe("Иванов");
  });
});
