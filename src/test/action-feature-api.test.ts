import { afterEach, describe, expect, it, vi } from "vitest";

import { executeActionFeature } from "@/lib/api/processes/board";

afterEach(() => vi.unstubAllGlobals());

describe("executeActionFeature", () => {
  it("posts only user-entered contact fields to the feature route with CSRF", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ execution: {}, target: {} }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await executeActionFeature(
      "action-id",
      "contact_person.create",
      {
        full_name: "Анна Иванова",
        position: "Декан",
        email: "a@example.org",
        phone: "+7 900",
        telegram: "",
      },
      "csrf-token",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/processes/action-instances/action-id/features/contact_person.create/execute/",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          full_name: "Анна Иванова",
          position: "Декан",
          email: "a@example.org",
          phone: "+7 900",
          telegram: "",
        }),
        headers: expect.objectContaining({ "x-csrftoken": "csrf-token" }),
      }),
    );
  });
});
