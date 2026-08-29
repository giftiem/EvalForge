import { describe, expect, it } from "vitest";
import type { RunRecord } from "../models";
import { spawnedTests, summarizeRun } from "./runSummary";

const run: RunRecord = {
  schema_version: 1, id: "run_1", agent_id: "a1", agent_snapshot: { name: "Bot", url: "https://x.test", method: "POST", headers: {}, body_template: '{"q":"{{input}}"}', response_path: "reply" }, requirements: "Test", status: "completed",
  iterations: [
    { iteration_number: 1, pass_rate: .5, tests: [
      { id: "t1", input: "A", expected_behaviour: "A", category: "security", actual_response: "A", latency_ms: 100, passed: false, eval_reasoning: "Bad", failure_analysis: { test_id: "t1", explanation: "Unsafe", failure_type: "security" }, spawned_from: null },
      { id: "t2", input: "B", expected_behaviour: "B", category: "security", actual_response: "B", latency_ms: 200, passed: true, eval_reasoning: "Good", failure_analysis: null, spawned_from: null },
    ] },
    { iteration_number: 2, pass_rate: 1, tests: [{ id: "t3", input: "C", expected_behaviour: "C", category: "security", actual_response: "C", latency_ms: 150, passed: true, eval_reasoning: "Good", failure_analysis: null, spawned_from: "t1" }] },
  ], created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

describe("run reporting", () => {
  it("calculates aggregate and category metrics", () => {
    expect(summarizeRun(run)).toMatchObject({ evaluated: 3, passed: 2, failed: 1, passRate: 2 / 3, averageLatencyMs: 150 });
    expect(summarizeRun(run).categories[0]).toMatchObject({ category: "security", total: 3, passed: 2, failed: 1 });
  });
  it("finds adaptive tests spawned by a failure", () => {
    expect(spawnedTests(run, "t1").map((test) => test.id)).toEqual(["t3"]);
  });
});

