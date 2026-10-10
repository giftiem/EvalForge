import { describe, expect, it } from "vitest";
import { parseTestSuite, serializeTestSuite } from "./testSuite";

describe("test suite interchange", () => {
  it("round-trips custom categories while discarding old execution evidence", () => {
    const tests = [{ input: "Hello", expected_behaviour: "Greet", category: "custom", passed: true, actual_response: "Old answer", id: "t99" }];
    const imported = parseTestSuite(serializeTestSuite(tests));
    expect(imported).toEqual([{ input: "Hello", expected_behaviour: "Greet", category: "custom" }]);
    expect(parseTestSuite(JSON.stringify(tests))).toEqual(imported);
  });
  
  it("rejects malformed, empty, and incomplete suites", () => {
    for (const text of ["broken", "[]", '{"tests":[]}', '{"tests":[{"input":"Hello","expected_behaviour":" ","category":"custom"}]}']) {
      expect(() => parseTestSuite(text)).toThrow();
    }
  });
});
