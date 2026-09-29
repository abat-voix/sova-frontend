import { describe, expect, it } from "vitest";

import {
  isValidInn,
  isValidPhone,
  sanitizeInn,
  sanitizePhone,
} from "@/lib/inn-phone";

describe("sanitizeInn", () => {
  it("keeps only digits, at most 12", () => {
    expect(sanitizeInn("77a07 083-893")).toBe("7707083893");
    expect(sanitizeInn("5001007322591234")).toBe("500100732259");
  });
});

describe("isValidInn", () => {
  it("accepts empty, 10 and 12 digits", () => {
    expect(isValidInn("")).toBe(true);
    expect(isValidInn(null)).toBe(true);
    expect(isValidInn("7707083893")).toBe(true);
    expect(isValidInn("500100732259")).toBe(true);
  });

  it("rejects other lengths and letters", () => {
    expect(isValidInn("12345678901")).toBe(false);
    expect(isValidInn("77070838ab")).toBe(false);
  });
});

describe("sanitizePhone", () => {
  it("drops letters and keeps formatting characters", () => {
    expect(sanitizePhone("+7 (999) abc 123-45-67")).toBe("+7 (999)  123-45-67");
  });

  it("keeps plus only at the start", () => {
    expect(sanitizePhone("7+999+1234567")).toBe("79991234567");
    expect(sanitizePhone("+7+999")).toBe("+7999");
  });
});

describe("isValidPhone", () => {
  it("accepts empty and 10 to 15 digits", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone("+7 (999) 123-45-67")).toBe(true);
    expect(isValidPhone("9991234567")).toBe(true);
  });

  it("rejects letters and wrong digit count", () => {
    expect(isValidPhone("+7 999 abc-45-67")).toBe(false);
    expect(isValidPhone("123-45-67")).toBe(false);
    expect(isValidPhone("+1234567890123456")).toBe(false);
  });
});
