import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getActionRollbacks,
  getStageRollbacks,
} from "@/lib/api/processes/rollbacks";

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("rollback journals", () => {
  it("asks for the action rollbacks of one process, newest first", async () => {
    const fetchMock = stubFetch();

    await getActionRollbacks("wf-1");

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/processes/action-rollbacks/?ordering=-created_at&page_size=100&workflow_instance__ids=wf-1",
    );
  });

  it("asks for the stage rollbacks of one process", async () => {
    const fetchMock = stubFetch();

    await getStageRollbacks("wf-1");

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/processes/stage-rollbacks/?",
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "workflow_instance__ids=wf-1",
    );
  });
});
