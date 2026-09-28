import { describe, expect, it } from "vitest";

import { formatAddress, parseCoordinates } from "@/lib/address";

describe("parseCoordinates", () => {
  it("reads the string copied from Yandex Maps and Google Maps", () => {
    expect(parseCoordinates("55.752040, 37.617810")).toEqual({
      lat: "55.752040",
      lon: "37.617810",
    });
    expect(parseCoordinates(" 55,75 37,61 ")).toEqual({
      lat: "55.750000",
      lon: "37.610000",
    });
  });

  it("treats an empty value as no coordinates", () => {
    expect(parseCoordinates("  ")).toBeNull();
  });

  it("rejects garbage and out-of-range values", () => {
    expect(parseCoordinates("север")).toBeUndefined();
    expect(parseCoordinates("95, 37")).toBeUndefined();
    expect(parseCoordinates("55, 190")).toBeUndefined();
  });
});

describe("formatAddress", () => {
  it("joins filled parts in postal order", () => {
    expect(
      formatAddress({
        postal_code: "119991",
        city: "Москва",
        street: "Ленинские горы",
        house: "1",
      }),
    ).toBe("119991, Москва, Ленинские горы, 1");
  });
});
