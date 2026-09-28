import { afterEach, describe, expect, it, vi } from "vitest";

import { runCreationPlan } from "@/components/interactions/new-interaction-submit";
import type { CreationPlan } from "@/components/interactions/new-interaction-plan";

type Call = { body: unknown; url: string };

function stubFetch(fail: (url: string, body: never) => boolean = () => false) {
  const calls: Call[] = [];
  let nextId = 0;

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "null"));
      calls.push({ body, url });

      if (fail(url, body as never)) {
        return new Response(
          JSON.stringify({ code: "invalid", detail: "Нельзя." }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      nextId += 1;

      return new Response(JSON.stringify({ id: `new-${nextId}` }), {
        headers: { "content-type": "application/json" },
        status: 201,
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);

  return calls;
}

const plan = (overrides: Partial<CreationPlan> = {}): CreationPlan => ({
  directions: [{ directionId: "dir-1", key: "d1" }],
  interaction: { comment: "", is_active: true, organization: "u-1" },
  interactionId: null,
  responsibleIds: [],
  programs: [
    {
      createdId: null,
      key: "p1",
      products: [{ key: "t1", productId: "prod-1" }],
      programId: "prog-1",
    },
  ],
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runCreationPlan", () => {
  it("creates the interaction, then its directions and programs, then products", async () => {
    const calls = stubFetch();

    const outcome = await runCreationPlan(plan(), "csrf");

    expect(outcome.error).toBeNull();
    expect(outcome.interactionId).toBe("new-1");
    expect(calls.map((call) => call.url)).toEqual([
      "/api/interactions/interactions/",
      "/api/interactions/interaction-directions/",
      "/api/interactions/interaction-programs/",
      "/api/interactions/interaction-products/",
    ]);
    expect(calls[1].body).toEqual({
      direction: "dir-1",
      interaction: "new-1",
    });
    expect(calls[2].body).toEqual({ interaction: "new-1", program: "prog-1" });
    // Продукт получает id программы ВЗАИМОДЕЙСТВИЯ, а не каталога.
    expect(calls[3].body).toEqual({
      interaction: "new-1",
      interaction_program: "new-3",
      product: "prod-1",
    });
    expect(outcome.createdIds).toEqual({
      d1: "new-2",
      p1: "new-3",
      t1: "new-4",
    });
  });

  it("assigns every responsible right after the interaction is created", async () => {
    const calls = stubFetch();

    const outcome = await runCreationPlan(
      plan({ directions: [], programs: [], responsibleIds: [7, 9] }),
      "csrf",
    );

    expect(outcome.assignedResponsibleIds).toEqual(["7", "9"]);
    expect(calls.map((call) => call.url)).toEqual([
      "/api/interactions/interactions/",
      "/api/interactions/interactions/new-1/assign-responsible/",
      "/api/interactions/interactions/new-1/assign-responsible/",
    ]);
    expect(calls[1].body).toEqual({ manager: 7 });
    expect(calls[2].body).toEqual({ manager: 9 });
  });

  it("keeps creating the tree when the assignment fails", async () => {
    const calls = stubFetch((url) => url.includes("assign-responsible"));

    const outcome = await runCreationPlan(
      plan({ responsibleIds: [7] }),
      "csrf",
    );

    expect(outcome.assignedResponsibleIds).toEqual([]);
    expect(outcome.error).not.toBeNull();
    // Направление и программа всё равно созданы — повтор дошлёт назначение.
    expect(outcome.createdIds).toHaveProperty("d1");
    expect(calls).toHaveLength(5);
  });

  it("reuses an already created interaction instead of creating a second one", async () => {
    const calls = stubFetch();

    const outcome = await runCreationPlan(
      plan({ interaction: null, interactionId: "existing" }),
      "csrf",
    );

    expect(calls[0].url).toBe("/api/interactions/interaction-directions/");
    expect(calls[0].body).toEqual({
      direction: "dir-1",
      interaction: "existing",
    });
    expect(outcome.interactionId).toBe("existing");
  });

  it("attaches products to a program that was created earlier", async () => {
    const calls = stubFetch();

    await runCreationPlan(
      plan({
        directions: [],
        interaction: null,
        interactionId: "existing",
        programs: [
          {
            createdId: "existing-program",
            key: "p1",
            products: [{ key: "t2", productId: "prod-2" }],
            programId: null,
          },
        ],
      }),
      "csrf",
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/interactions/interaction-products/");
    expect(calls[0].body).toEqual({
      interaction: "existing",
      interaction_program: "existing-program",
      product: "prod-2",
    });
  });

  it("keeps what succeeded when one product fails", async () => {
    stubFetch((url) => url.includes("interaction-products"));

    const outcome = await runCreationPlan(plan(), "csrf");

    expect(outcome.error).not.toBeNull();
    expect(outcome.interactionId).toBe("new-1");
    // Продукт не создан — повтор отправит только его.
    expect(outcome.createdIds).toEqual({ d1: "new-2", p1: "new-3" });
  });

  it("skips the products of a program that failed but keeps going", async () => {
    const calls = stubFetch(
      (url, body: { program?: string }) => body?.program === "prog-1",
    );

    const outcome = await runCreationPlan(
      plan({
        programs: [
          {
            createdId: null,
            key: "p1",
            products: [{ key: "t1", productId: "prod-1" }],
            programId: "prog-1",
          },
          {
            createdId: null,
            key: "p2",
            products: [],
            programId: "prog-2",
          },
        ],
      }),
      "csrf",
    );

    const productCalls = calls.filter((call) =>
      call.url.includes("interaction-products"),
    );

    expect(productCalls).toHaveLength(0);
    expect(outcome.error).not.toBeNull();
    expect(outcome.createdIds).toHaveProperty("p2");
    expect(outcome.createdIds).not.toHaveProperty("p1");
  });

  it("stops when the interaction itself cannot be created", async () => {
    const calls = stubFetch((url) => url.endsWith("/interactions/"));

    const outcome = await runCreationPlan(plan(), "csrf");

    expect(calls).toHaveLength(1);
    expect(outcome.interactionId).toBeNull();
    expect(outcome.error).not.toBeNull();
  });
});
