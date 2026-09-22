import { describe, expect, it } from "vitest";

import { contactPersonOptions } from "@/components/action-features/contact-person-select-feature";
import type { ContactPerson } from "@/types/contact-person";

const contact: ContactPerson = {
  b2c_client: null,
  created_at: "2026-09-22T00:00:00Z",
  email: "2@1.ru",
  full_name: "Колоков",
  id: "contact-1",
  is_active: true,
  phone: "89999999912",
  position: "Директор",
  university: { id: "university-1", name: "Академия" },
  updated_at: "2026-09-22T00:00:00Z",
};

describe("contact person select options", () => {
  it("supports a bare array response from the catalog", () => {
    expect(contactPersonOptions([contact])).toEqual([
      { id: "contact-1", name: "Колоков · Директор" },
    ]);
  });

  it("supports a paginated catalog response", () => {
    expect(
      contactPersonOptions({
        count: 1,
        next: null,
        previous: null,
        results: [contact],
      }),
    ).toEqual([{ id: "contact-1", name: "Колоков · Директор" }]);
  });
});
