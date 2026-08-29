import { beforeEach, describe, expect, it } from "vitest";
import { AGENTS_STORAGE_KEY } from "../constants/storage";

describe("browser storage test environment", () => {
  beforeEach(() => localStorage.clear());
  it("provides isolated localStorage", () => {
    localStorage.setItem(AGENTS_STORAGE_KEY, "[]");
    expect(localStorage.getItem(AGENTS_STORAGE_KEY)).toBe("[]");
  });
});
