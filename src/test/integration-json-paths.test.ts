import { describe, expect, it } from "vitest";

import {
  flattenJsonPaths,
  sampleFromPaths,
  samplePayloadItem,
} from "@/lib/integrations/json-paths";

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

  it("uses the first non-empty item of a root array", () => {
    expect(
      flattenJsonPaths([null, { "Номер потока": 1, Курс: "Python" }]),
    ).toEqual([
      { path: "$.Номер потока", valueType: "number" },
      { path: "$.Курс", valueType: "string" },
    ]);
  });
});

describe("samplePayloadItem", () => {
  it("returns objects as is and the first object of an array", () => {
    expect(samplePayloadItem({ a: 1 })).toEqual({ a: 1 });
    expect(samplePayloadItem([null, 1, { a: 2 }])).toEqual({ a: 2 });
    expect(samplePayloadItem([null])).toBeNull();
    expect(samplePayloadItem("text")).toBeNull();
  });
});

describe("sampleFromPaths", () => {
  it("builds nested objects and arrays from rule paths", () => {
    const paths = ["$.Фамилия", "$.student.email", "$.items[].id", "$.tags[]"];
    expect(sampleFromPaths([...paths, "", "broken"])).toEqual({
      Фамилия: "Фамилия",
      student: { email: "email" },
      items: [{ id: "id" }],
      tags: [],
    });
    expect(
      flattenJsonPaths(sampleFromPaths(paths)).map((item) => item.path),
    ).toEqual(expect.arrayContaining(paths));
  });
});
