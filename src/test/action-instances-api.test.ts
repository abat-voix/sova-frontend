import { afterEach, describe, expect, it, vi } from "vitest";

import { getActionInstances } from "@/lib/api/processes/action-instances";

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("getActionInstances", () => {
  it("builds the column request from status, ordering and scope", async () => {
    const fetchMock = stubFetch();

    await getActionInstances({
      ordering: "planned_end",
      page: 1,
      scope: "mine",
      status: "in_progress",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/processes/action-instances/?ordering=planned_end&page=1&page_size=20&scope=mine&status=in_progress",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("adds the interaction and completion window filters only when set", async () => {
    const fetchMock = stubFetch();

    await getActionInstances({
      actualEndGte: "2026-08-22",
      interactionId: "44d0",
      ordering: "-actual_end",
      page: 2,
      scope: "all",
      status: "completed",
    });

    const url = String((fetchMock.mock.calls[0] as unknown[])?.[0]);
    expect(url).toContain("interaction__ids=44d0");
    expect(url).toContain("actual_end__gte=2026-08-22");
    expect(url).toContain("scope=all");
    expect(url).toContain("page=2");
  });
});
