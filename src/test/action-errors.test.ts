import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/http";
import {
  resolveActionErrorMessage,
  resolveRollbackErrorMessage,
} from "@/lib/workflow/action-errors";

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

describe("resolveRollbackErrorMessage", () => {
  it("explains why a rollback is impossible, not why a completion is", () => {
    const error = new ApiError(409, "invalid_state", null, "conflict");

    expect(resolveRollbackErrorMessage(error, "ru")).toBe(
      "Откатить можно только последнее выполненное исполнение, пока его этап в работе.",
    );
  });

  it("translates a completed dependent", () => {
    const error = new ApiError(400, "has_completed_dependent", null, "bad");

    expect(resolveRollbackErrorMessage(error, "ru")).toBe(
      "От этого действия зависит уже выполненное действие — сначала откатите его.",
    );
  });

  it("falls back to the backend detail for an unknown code", () => {
    const error = new ApiError(400, "teapot", "Чайник занят.", "bad request");

    expect(resolveRollbackErrorMessage(error, "ru")).toBe("Чайник занят.");
  });
});
