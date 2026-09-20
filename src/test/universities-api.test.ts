import { afterEach, describe, expect, it, vi } from "vitest";

import { getUniversityMapPoints } from "@/lib/api/catalog/universities";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("universities API", () => {
  it("passes the normalized search value to the map endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("[]", {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getUniversityMapPoints("  Московский  ");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/universities/map/?search=%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});
