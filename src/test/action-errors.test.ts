import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/http";
import { resolveActionErrorMessage } from "@/lib/workflow/action-errors";

describe("resolveActionErrorMessage", () => {
  it("translates a known backend code", () => {
    const error = new ApiError(400, "comment_required", null, "bad request");

    expect(resolveActionErrorMessage(error, "ru")).toBe(
      "Нужен комментарий к выбранному исходу.",
    );
  });

  it("falls back to the backend detail for an unknown code", () => {
    const error = new ApiError(400, "teapot", "Чайник занят.", "bad request");

    expect(resolveActionErrorMessage(error, "ru")).toBe("Чайник занят.");
  });

  it("uses a generic message when the failure is not an ApiError", () => {
    expect(resolveActionErrorMessage(new Error("network"), "en")).toBe(
      "The operation failed.",
    );
  });
});
