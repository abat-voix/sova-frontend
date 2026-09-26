import { afterEach, describe, expect, it, vi } from "vitest";

import { getUsers, setUserRole } from "@/lib/api/users/users";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(body: unknown) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("users api", () => {
  it("loads a paginated user list with server query parameters", async () => {
    const fetchMock = stubFetch({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    await getUsers({
      search: "Филин",
      page: 2,
      page_size: 20,
      ordering: "last_name",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/?search=%D0%A4%D0%B8%D0%BB%D0%B8%D0%BD&page=2&page_size=20&ordering=last_name",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("patches only the role and sends csrf protection", async () => {
    const fetchMock = stubFetch({
      id: 7,
      email: "owl@example.com",
      full_name: "Ольга Филинова",
      first_name: "Ольга",
      last_name: "Филинова",
      role: "head",
      role_display: "Руководитель",
    });

    await setUserRole(7, "head", "csrf-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/7/role/",
      expect.objectContaining({
        body: JSON.stringify({ role: "head" }),
        headers: expect.objectContaining({ "x-csrftoken": "csrf-token" }),
        method: "PATCH",
      }),
    );
  });
});
