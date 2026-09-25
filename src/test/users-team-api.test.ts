import { afterEach, describe, expect, it, vi } from "vitest";

import {
  claimKam,
  listUsers,
  releaseKam,
  setKamHead,
} from "@/lib/api/users/team";

type Call = { body: unknown; method: string; url: string };

function stubFetch(
  response: unknown = { count: 0, next: null, previous: null, results: [] },
) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? "GET",
        url: String(input),
      });
      return new Response(JSON.stringify(response), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("users team api", () => {
  it("sends every role as a separate query parameter", async () => {
    const calls = stubFetch();

    await listUsers({ role: ["kam", "head"], search: " Ив " });

    const url = new URL(calls[0].url, "http://localhost");
    expect(url.pathname).toBe("/api/users/");
    expect(url.searchParams.getAll("role")).toEqual(["kam", "head"]);
    expect(url.searchParams.get("search")).toBe("Ив");
  });

  it("passes team and head filters", async () => {
    const calls = stubFetch();

    await listUsers({ team: "free" });
    await listUsers({ head: 12 });

    expect(
      new URL(calls[0].url, "http://localhost").searchParams.get("team"),
    ).toBe("free");
    expect(
      new URL(calls[1].url, "http://localhost").searchParams.get("head"),
    ).toBe("12");
  });

  it("claims and releases a kam with POST", async () => {
    const calls = stubFetch({ id: 5 });

    await claimKam(5, "csrf");
    await releaseKam(5, "csrf");

    expect(calls.map(({ method, url }) => [method, url])).toEqual([
      ["POST", "/api/users/5/claim/"],
      ["POST", "/api/users/5/release/"],
    ]);
  });

  it("sets or clears the head with PUT", async () => {
    const calls = stubFetch({ orphaned_kams: [], user: { id: 5 } });

    await setKamHead(5, 12, "csrf");
    await setKamHead(5, null, "csrf");

    expect(calls.map(({ body, method, url }) => [method, url, body])).toEqual([
      ["PUT", "/api/users/5/head/", { head: 12 }],
      ["PUT", "/api/users/5/head/", { head: null }],
    ]);
  });
});
