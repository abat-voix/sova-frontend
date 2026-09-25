import { afterEach, describe, expect, it, vi } from "vitest";

import { getIntegrationEntities } from "@/lib/api/integrations/integrations";

afterEach(() => vi.unstubAllGlobals());

describe("integrations api", () => {
  it("loads serializer metadata", async () => {
    const response = [
      {
        code: "student",
        label: "Студент",
        serializer: "StudentSerializer",
        fields: [],
      },
    ];
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify(response), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getIntegrationEntities()).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/integrations/v1/metadata/entities/",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
