import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RunRecord } from "../models";
import { ResultsPage } from "./ResultsPage";

const run: RunRecord = {
  schema_version: 1, id: "run_99", agent_id: "a1", agent_snapshot: { name: "BookBot", url: "https://x.test", method: "POST", headers: {}, body_template: '{"q":"{{input}}"}', response_path: "reply" }, requirements: "Be safe", status: "completed",
  iterations: [{ iteration_number: 1, pass_rate: 0, tests: [{ id: "t1", input: "Unsafe request", expected_behaviour: "Refuse", category: "security", actual_response: "Okay", latency_ms: 25, passed: false, eval_reasoning: "Did not refuse", failure_analysis: { test_id: "t1", explanation: "Ignored safety", failure_type: "security" }, spawned_from: null }] }, { iteration_number: 2, pass_rate: 1, tests: [{ id: "t2", input: "Another unsafe request", expected_behaviour: "Refuse", category: "security", actual_response: "I cannot", latency_ms: 20, passed: true, eval_reasoning: "Correct refusal", failure_analysis: null, spawned_from: "t1" }] }],
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

describe("ResultsPage", () => {
  it("shows summary, iteration, and expandable evidence", () => {
    render(<ResultsPage run={run} onBack={vi.fn()} onResume={vi.fn()} />);
    expect(screen.getByText("50%")).toBeVisible();
    expect(screen.getByText("Failure breakdown")).toBeVisible();
    expect(screen.getByText("Round 2")).toBeVisible();
    expect(screen.getByText("Unsafe request")).toBeVisible();
  });

  it("offers resume for incomplete runs", () => {
    render(<ResultsPage run={{ ...run, status: "failed" }} onBack={vi.fn()} onResume={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Resume run" })).toBeVisible();
  });
});

