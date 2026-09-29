import { describe, expect, it } from "vitest";

import { groupByDirection } from "@/components/catalog/direction-programs-field";

describe("groupByDirection", () => {
  it("groups programs under their directions and keeps same-named programs apart", () => {
    expect(
      groupByDirection(
        [
          { id: "d1", name: "DevOps" },
          { id: "d2", name: "Аналитика" },
        ],
        [
          { id: "p1", name: "Основы", direction: { id: "d1", name: "DevOps" } },
          {
            id: "p2",
            name: "Основы",
            direction: { id: "d2", name: "Аналитика" },
          },
        ],
      ),
    ).toEqual([
      {
        direction: { id: "d1", name: "DevOps" },
        programs: [{ id: "p1", name: "Основы" }],
      },
      {
        direction: { id: "d2", name: "Аналитика" },
        programs: [{ id: "p2", name: "Основы" }],
      },
    ]);
  });

  it("adds the missing direction of a saved program instead of dropping it", () => {
    expect(
      groupByDirection(
        [],
        [{ id: "p1", name: "Основы", direction: { id: "d1", name: "DevOps" } }],
      ),
    ).toEqual([
      {
        direction: { id: "d1", name: "DevOps" },
        programs: [{ id: "p1", name: "Основы" }],
      },
    ]);
  });
});
