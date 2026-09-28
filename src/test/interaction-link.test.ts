import { describe, expect, it } from "vitest";

import { parseInteractionLink } from "@/lib/workflow/interaction-link";

describe("parseInteractionLink", () => {
  it("reads the interaction, process and action", () => {
    expect(
      parseInteractionLink(
        new URLSearchParams("interaction=i-1&process=p-1&action=a-1"),
      ),
    ).toEqual({
      counterpartyFilter: null,
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
    ).toEqual({
      counterpartyFilter: null,
      interactionId: null,
      processId: null,
      row: null,
    });
  });

  it("reads a university filter from a catalog link", () => {
    expect(
      parseInteractionLink(new URLSearchParams("university__ids=u-1")),
    ).toEqual({
      counterpartyFilter: { id: "u-1", kind: "university" },
      interactionId: null,
      processId: null,
      row: null,
    });
  });

  it("reads a B2C client filter from a catalog link", () => {
    expect(
      parseInteractionLink(new URLSearchParams("b2c_client__ids=b-1")),
    ).toEqual({
      counterpartyFilter: { id: "b-1", kind: "b2c_client" },
      interactionId: null,
      processId: null,
      row: null,
    });
  });

  it("returns an empty target for a plain address", () => {
    expect(parseInteractionLink(null)).toEqual({
      counterpartyFilter: null,
      interactionId: null,
      processId: null,
      row: null,
    });
  });
});
