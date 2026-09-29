import { describe, expect, it } from "vitest";

import { normalizeWorkflowTemplateList } from "@/lib/workflow/workflow-template-list";

const workflow = {
  id: "workflow-1",
  name: "Первый workflow",
} as never;

describe("normalizeWorkflowTemplateList", () => {
  it("supports a paginated response", () => {
    expect(normalizeWorkflowTemplateList({ results: [workflow] })).toEqual([
      workflow,
    ]);
  });

  it("supports a plain array response after a refetch", () => {
    expect(normalizeWorkflowTemplateList([workflow])).toEqual([workflow]);
  });

  it("falls back to an empty list for an empty response object", () => {
    expect(normalizeWorkflowTemplateList({})).toEqual([]);
  });
});
