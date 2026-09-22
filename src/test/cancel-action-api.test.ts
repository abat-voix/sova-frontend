import { afterEach, describe, expect, it, vi } from "vitest";

import { cancelAction } from "@/lib/api/processes/board";

afterEach(() => vi.unstubAllGlobals());

describe("cancelAction", () => {
  it("posts the reason to the cancel endpoint of the given execution", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await cancelAction("act-1", { reason: "Ошиблись исходом" }, "csrf");

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/processes/action-instances/act-1/cancel/",
    );
    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      reason: "Ошиблись исходом",
    });
  });
});
