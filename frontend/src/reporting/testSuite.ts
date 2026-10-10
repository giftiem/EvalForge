import type { RunTest } from "../models";
import { isRecord } from "../validation/guards";

export type TestDefinition = Pick<RunTest, "input" | "expected_behaviour" | "category">;

export function parseTestSuite(text: string): TestDefinition[] {
  let payload: unknown;
  try { payload = JSON.parse(text); } catch { throw new Error("Choose a valid JSON test file."); }
  const tests = isRecord(payload) ? payload.tests : payload;
  if (!Array.isArray(tests) || tests.length === 0) throw new Error("The file must contain a non-empty tests array.");
  return tests.map((test, index) => {
    if (!isRecord(test) || typeof test.input !== "string" || !test.input.trim() ||
      typeof test.expected_behaviour !== "string" || !test.expected_behaviour.trim() ||
      typeof test.category !== "string" || !test.category.trim()) {
      throw new Error(`Test ${index + 1} needs non-empty input, expected_behaviour, and category fields.`);
    }
    return { input: test.input, expected_behaviour: test.expected_behaviour, category: test.category };
  });
}

export function serializeTestSuite(tests: TestDefinition[]): string {
  return JSON.stringify({ schema_version: 1, tests: tests.map(({ input, expected_behaviour, category }) => ({ input, expected_behaviour, category })) }, null, 2);
}

export function exportTestSuite(tests: TestDefinition[]): void {
  const url = URL.createObjectURL(new Blob([serializeTestSuite(tests)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "evalforge-tests.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
