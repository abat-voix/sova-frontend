import { describe, expect, it } from "vitest";

import { flattenJsonPaths } from "@/lib/integrations/json-paths";

describe("flattenJsonPaths", () => {
  it("flattens nested objects and the first array item", () => {
    expect(
      flattenJsonPaths({
        student: { id: "123", email: "student@example.test" },
        students: [{ id: 7 }],
      }),
    ).toEqual([
      { path: "$.student.id", valueType: "string" },
      { path: "$.student.email", valueType: "string" },
      { path: "$.students[]", valueType: "array" },
      { path: "$.students[].id", valueType: "number" },
    ]);
  });
});
