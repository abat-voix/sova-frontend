import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/http";
import { can, isAccessDenied } from "@/lib/permissions";
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";

const observer = {
  isSuperuser: false,
  permissions: observerPermissions,
  role: "observer" as const,
};

describe("permissions", () => {
  it("allows only the operations the backend listed", () => {
    expect(can(observer, "interactions.read")).toBe(true);
    expect(can(observer, "interactions.update")).toBe(false);
    expect(
      can(
        { ...observer, permissions: kamPermissions, role: "kam" },
        "interactions.update",
      ),
    ).toBe(true);
  });

  it("recognises a 403 from the backend", () => {
    expect(
      isAccessDenied(new ApiError(403, "permission_denied", null, "denied")),
    ).toBe(true);
    expect(isAccessDenied(new ApiError(404, "not_found", null, "gone"))).toBe(
      false,
    );
    expect(isAccessDenied(new Error("network"))).toBe(false);
  });
});
