import { describe, expect, it } from "vitest";

import { parseInteractionLink } from "@/lib/workflow/interaction-link";

describe("parseInteractionLink", () => {
  it("reads the interaction, process and action", () => {
    expect(
      parseInteractionLink(
        new URLSearchParams("interaction=i-1&process=p-1&action=a-1"),
      ),
    ).toEqual({
      interactionId: "i-1",
      processId: "p-1",
      row: { id: "a-1", kind: "action" },
    });
  });

  it("opens a stage when no action is given", () => {
    expect(
      parseInteractionLink(
        new URLSearchParams("interaction=i-1&process=p-1&stage=s-1"),
      ).row,
    ).toEqual({ id: "s-1", kind: "stage" });
  });

  it("ignores the process and row without an interaction", () => {
    expect(
      parseInteractionLink(new URLSearchParams("process=p-1&action=a-1")),
    ).toEqual({ interactionId: null, processId: null, row: null });
  });

  it("returns an empty target for a plain address", () => {
    expect(parseInteractionLink(null)).toEqual({
      interactionId: null,
      processId: null,
      row: null,
    });
  });
});
