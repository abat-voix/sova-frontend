import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, postFormData } from "@/lib/api/http";

afterEach(() => vi.unstubAllGlobals());

describe("ApiError body", () => {
  it("keeps the parsed error body for callers with custom error shapes", async () => {
    const body = {
      code: "import_failed",
      detail: "Импорт отменён, ошибок: 1",
      errors: [{ row: 3, message: "вендор не найден: X" }],
      errors_total: 1,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status: 400 })),
    );

    const error = await postFormData("/api/x/", new FormData(), "t").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).body).toEqual(body);
  });
});
