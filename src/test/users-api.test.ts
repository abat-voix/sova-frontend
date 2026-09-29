import { afterEach, describe, expect, it, vi } from "vitest";

import { getSystemRoles, setUserRole } from "@/lib/api/users/users";

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
  it("loads the role dictionary", async () => {
    const roles = [{ value: "kam", label: "КАМ" }];
    const fetchMock = stubFetch(roles);

    await expect(getSystemRoles()).resolves.toEqual(roles);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/roles/",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("puts only the role with csrf protection and returns orphaned kams", async () => {
    const result = {
      user: { id: 7, role: "kam" },
      orphaned_kams: [
        { id: 9, email: "kam@example.com", full_name: "Иван Иванов" },
      ],
    };
    const fetchMock = stubFetch(result);

    await expect(setUserRole(7, "kam", "csrf-token")).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/7/role/",
      expect.objectContaining({
        body: JSON.stringify({ role: "kam" }),
        headers: expect.objectContaining({ "x-csrftoken": "csrf-token" }),
        method: "PUT",
      }),
    );
  });
});
