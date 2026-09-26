import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/lib/format-date";

describe("formatDateTime", () => {
  it("formats report moments with date, year, and time", () => {
    expect(formatDateTime("2026-09-01T15:04:00+03:00", "ru")).toBe(
      "01.09.2026, 15:04",
    );
    expect(formatDateTime("2026-09-01T15:04:00+03:00", "en")).toBe(
      "01/09/2026, 15:04",
    );
  });

  it("returns null for an absent value", () => {
    expect(formatDateTime(null, "ru")).toBeNull();
  });
});
